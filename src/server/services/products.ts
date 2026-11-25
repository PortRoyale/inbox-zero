import { industryBySlug } from "@/content/industries";
import { analyzePlan } from "@/lib/plan/analyze";
import { nextRevisionLetter, planContent } from "@/lib/plan/hash";
import { applyIndustry, emptyPlan, type Plan } from "@/lib/plan/model";
import { coercePlan } from "@/lib/plan/validate";
import { baselineQuestions, evaluateReleaseGate, pentestTriggers, surfaceTriggers, type GateAnswers } from "@/lib/release-gate";
import { open, seal } from "@/server/crypto/envelope";
import { canonicalJson, sha512Hex, signPayload, verifyPayload, type HybridSignature } from "@/server/crypto/sign";
import { keys } from "@/server/crypto/keys";
import { all, get, newId, now, run, tx } from "@/server/db";
import { badRequest, HttpError, notFound } from "@/server/errors";
import { audit } from "@/server/platform";
import type { Profile } from "@/server/services/accounts";
import { requireOrg, TIERS, type Role } from "@/server/services/orgs";

type ProductRow = { id: string; org_id: string; name_sealed: string; industry: string; created_at: number; updated_at: number; archived_at: number | null };

const productName = (r: Pick<ProductRow, "id" | "name_sealed">) => open<string>(r.name_sealed, `product:${r.id}:name`);
const today = () => new Date(now()).toISOString().slice(0, 10);

// Every product read or write goes through here: membership of the product's team is required, and
// non-members get 404 so product ids cannot be probed across teams.
export function requireProduct(userId: string, productId: string, min: Role = "viewer") {
  const row = get<ProductRow>("SELECT * FROM products WHERE id = $id", { id: productId });
  if (!row) throw notFound();
  const org = requireOrg(userId, row.org_id, min);
  return { row, org, name: productName(row) };
}

export function planSummary(plan: Plan) {
  const a = analyzePlan(plan, today());
  return { completeness: a.completeness, gaps: a.checks.filter((c) => !c.passed && c.severity !== "advice").length, blockers: a.blockers.length, actions: a.actions.length };
}

// ---------- Products ----------

export function listProducts(userId: string, orgId: string, includeArchived = false) {
  requireOrg(userId, orgId, "viewer");
  return all<ProductRow & { summary_json: string | null; version: number | null; plan_updated: number | null }>(
    `SELECT p.*, pl.summary_json, pl.version, pl.updated_at AS plan_updated FROM products p LEFT JOIN plans pl ON pl.product_id = p.id
     WHERE p.org_id = $o AND ($all = 1 OR p.archived_at IS NULL) ORDER BY p.created_at`,
    { o: orgId, all: includeArchived ? 1 : 0 },
  ).map((r) => ({
    id: r.id,
    name: productName(r),
    industry: r.industry,
    archived: r.archived_at !== null,
    createdAt: r.created_at,
    updatedAt: r.plan_updated ?? r.updated_at,
    planVersion: r.version ?? 0,
    summary: r.summary_json ? (JSON.parse(r.summary_json) as ReturnType<typeof planSummary>) : null,
    findings: openFindingCounts(r.id),
    openIncidents: get<{ n: number }>("SELECT COUNT(*) AS n FROM incidents WHERE product_id = $p AND closed_at IS NULL", { p: r.id })!.n,
  }));
}

function openFindingCounts(productId: string) {
  const latest = get<{ id: string }>("SELECT id FROM sboms WHERE product_id = $p ORDER BY created_at DESC LIMIT 1", { p: productId });
  if (!latest) return null;
  const rows = all<{ severity: string; n: number }>(
    "SELECT severity, COUNT(*) AS n FROM sbom_findings WHERE sbom_id = $s AND status IN ('open', 'investigating') GROUP BY severity",
    { s: latest.id },
  );
  return Object.fromEntries(rows.map((r) => [r.severity, r.n])) as Record<string, number>;
}

export function createProduct(userId: string, orgId: string, input: { name: string; industry: string }) {
  const org = requireOrg(userId, orgId, "editor");
  const active = get<{ n: number }>("SELECT COUNT(*) AS n FROM products WHERE org_id = $o AND archived_at IS NULL", { o: orgId })!.n;
  const limit = TIERS[org.tier].products;
  if (active >= limit) throw badRequest(`Your plan covers ${limit} product${limit > 1 ? "s" : ""}. Archive one or upgrade to add more.`);
  if (input.industry && !industryBySlug(input.industry)) throw badRequest("Unknown sector.");
  const id = newId();
  const t = now();
  const base = input.industry ? applyIndustry(emptyPlan(), input.industry) : emptyPlan();
  const plan: Plan = { ...base, product: { ...base.product, name: input.name } };
  tx(() => {
    run("INSERT INTO products (id, org_id, name_sealed, industry, created_at, updated_at) VALUES ($id, $o, $n, $i, $t, $t)", {
      id,
      o: orgId,
      n: seal(input.name, `product:${id}:name`),
      i: input.industry,
      t,
    });
    run("INSERT INTO plans (product_id, content_sealed, summary_json, version, updated_at, updated_by) VALUES ($p, $c, $s, 1, $t, $u)", {
      p: id,
      c: seal(plan, `plan:${id}`),
      s: JSON.stringify(planSummary(plan)),
      t,
      u: userId,
    });
  });
  audit({ orgId, userId, action: "product.created", targetType: "product", targetId: id });
  return id;
}

export function renameProduct(userId: string, productId: string, name: string) {
  const { org } = requireProduct(userId, productId, "editor");
  run("UPDATE products SET name_sealed = $n, updated_at = $t WHERE id = $id", { id: productId, n: seal(name, `product:${productId}:name`), t: now() });
  audit({ orgId: org.orgId, userId, action: "product.renamed", targetType: "product", targetId: productId });
}

export function setArchived(userId: string, productId: string, archived: boolean) {
  const { org } = requireProduct(userId, productId, "admin");
  if (!archived) {
    const active = get<{ n: number }>("SELECT COUNT(*) AS n FROM products WHERE org_id = $o AND archived_at IS NULL", { o: org.orgId })!.n;
    if (active >= TIERS[org.tier].products) throw badRequest("Your plan's product limit is reached. Archive another product first.");
  }
  run("UPDATE products SET archived_at = $a, updated_at = $t WHERE id = $id", { id: productId, a: archived ? now() : null, t: now() });
  audit({ orgId: org.orgId, userId, action: archived ? "product.archived" : "product.restored", targetType: "product", targetId: productId });
}

export function deleteProduct(userId: string, productId: string, confirmName: string) {
  const { org, name } = requireProduct(userId, productId, "admin");
  if (confirmName.trim() !== name.trim()) throw badRequest("Type the product name exactly to confirm.");
  run("DELETE FROM products WHERE id = $id", { id: productId });
  audit({ orgId: org.orgId, userId, action: "product.deleted", targetType: "product", targetId: productId });
}

// ---------- Plans (optimistic concurrency) ----------

export function getPlan(userId: string, productId: string) {
  const { org, name } = requireProduct(userId, productId, "viewer");
  const row = get<{ content_sealed: string; version: number; updated_at: number; updated_by: string | null }>("SELECT * FROM plans WHERE product_id = $p", { p: productId });
  if (!row) throw notFound();
  return { productName: name, role: org.role, tier: org.tier, orgId: org.orgId, plan: coercePlan(open(row.content_sealed, `plan:${productId}`)), version: row.version, updatedAt: row.updated_at };
}

export function savePlan(userId: string, productId: string, input: unknown, expectedVersion: number) {
  const { org } = requireProduct(userId, productId, "editor");
  const plan = coercePlan(input);
  // Revision history is server-owned: keep the stored list, never the client's copy.
  const stored = get<{ content_sealed: string }>("SELECT content_sealed FROM plans WHERE product_id = $p", { p: productId });
  if (!stored) throw notFound();
  plan.revisions = coercePlan(open(stored.content_sealed, `plan:${productId}`)).revisions;
  const res = run(
    "UPDATE plans SET content_sealed = $c, summary_json = $s, version = version + 1, updated_at = $t, updated_by = $u WHERE product_id = $p AND version = $v",
    { p: productId, c: seal(plan, `plan:${productId}`), s: JSON.stringify(planSummary(plan)), t: now(), u: userId, v: expectedVersion },
  );
  if (Number(res.changes) === 0) {
    const current = get<{ version: number }>("SELECT version FROM plans WHERE product_id = $p", { p: productId });
    throw new HttpError(409, `Someone else saved this plan (now version ${current?.version}). Reload to see their changes.`);
  }
  run("UPDATE products SET updated_at = $t WHERE id = $id", { id: productId, t: now() });
  audit({ orgId: org.orgId, userId, action: "plan.saved", targetType: "product", targetId: productId, meta: { version: expectedVersion + 1 } });
  return { version: expectedVersion + 1, summary: planSummary(plan) };
}

// ---------- Signed revisions ----------

export type RevisionStatement = {
  type: "readyline.plan-revision/v1";
  productId: string;
  product: string;
  rev: string;
  fingerprint: string;
  algorithm: "SHA-512";
  approver: string;
  approverId: string;
  summary: string;
  issuedAt: string;
};

export function issueRevision(user: Profile, productId: string, summary: string) {
  const { org, name } = requireProduct(user.id, productId, "approver");
  const row = get<{ content_sealed: string; version: number }>("SELECT content_sealed, version FROM plans WHERE product_id = $p", { p: productId });
  if (!row) throw notFound();
  const plan = coercePlan(open(row.content_sealed, `plan:${productId}`));
  const content = planContent(plan);
  const fingerprint = sha512Hex(canonicalJson(content));
  const existing = all<{ rev: string; fingerprint: string }>("SELECT rev, fingerprint FROM plan_revisions WHERE product_id = $p ORDER BY created_at", { p: productId });
  if (existing.length && existing[existing.length - 1].fingerprint === fingerprint) throw badRequest("Nothing has changed since the last revision.");
  const rev = nextRevisionLetter(existing);
  const issuedAt = new Date(now()).toISOString();
  const statement: RevisionStatement = {
    type: "readyline.plan-revision/v1",
    productId,
    product: name,
    rev,
    fingerprint,
    algorithm: "SHA-512",
    approver: user.name,
    approverId: user.id,
    summary,
    issuedAt,
  };
  const signature = signPayload(statement);
  const id = newId();
  const updated: Plan = { ...plan, revisions: [...plan.revisions, { rev, date: issuedAt.slice(0, 10), summary, hash: fingerprint, approver: user.name }] };
  tx(() => {
    run(
      `INSERT INTO plan_revisions (id, product_id, rev, summary_sealed, approver_id, approver_name_sealed, fingerprint, statement_json, signature_json, content_sealed, created_at)
       VALUES ($id, $p, $rev, $s, $a, $an, $f, $st, $sig, $c, $t)`,
      {
        id,
        p: productId,
        rev,
        s: seal(summary, `revision:${id}:summary`),
        a: user.id,
        an: seal(user.name, `revision:${id}:approver`),
        f: fingerprint,
        st: JSON.stringify(statement),
        sig: JSON.stringify(signature),
        c: seal(content, `revision:${id}:content`),
        t: now(),
      },
    );
    run("UPDATE plans SET content_sealed = $c, version = version + 1, updated_at = $t, updated_by = $u WHERE product_id = $p", {
      p: productId,
      c: seal(updated, `plan:${productId}`),
      t: now(),
      u: user.id,
    });
  });
  audit({ orgId: org.orgId, userId: user.id, action: "revision.issued", targetType: "product", targetId: productId, meta: { rev } });
  return { id, rev, fingerprint, statement, signature, version: row.version + 1 };
}

export function listRevisions(userId: string, productId: string) {
  requireProduct(userId, productId, "viewer");
  return all<{ id: string; rev: string; fingerprint: string; statement_json: string; signature_json: string; created_at: number }>(
    "SELECT id, rev, fingerprint, statement_json, signature_json, created_at FROM plan_revisions WHERE product_id = $p ORDER BY created_at DESC",
    { p: productId },
  ).map((r) => ({
    id: r.id,
    rev: r.rev,
    fingerprint: r.fingerprint,
    statement: JSON.parse(r.statement_json) as RevisionStatement,
    signature: JSON.parse(r.signature_json) as HybridSignature,
    createdAt: r.created_at,
  }));
}

/** Public: checks a signed statement (revision or export manifest) against this deployment's keys. */
export function verifyStatement(statement: unknown, signature: unknown) {
  const sig = signature as HybridSignature;
  const valid = verifyPayload(statement, sig);
  const st = statement as { type?: string; productId?: string; rev?: string; fingerprint?: string; digest?: string };
  let recorded = false;
  if (valid && st?.type === "readyline.plan-revision/v1") {
    recorded = !!get("SELECT 1 FROM plan_revisions WHERE product_id = $p AND rev = $r AND fingerprint = $f", { p: String(st.productId), r: String(st.rev), f: String(st.fingerprint) });
  }
  if (valid && st?.type === "readyline.evidence/v1") {
    recorded = !!get("SELECT 1 FROM exports WHERE product_id = $p AND digest = $d", { p: String(st.productId), d: String(st.digest) });
  }
  return { valid, recorded, kid: sig?.kid ?? null, currentKid: keys().kid, type: st?.type ?? null };
}

// ---------- Release records ----------

const GATE_IDS = [...baselineQuestions, ...surfaceTriggers, ...pentestTriggers].map((q) => q.id) as string[];

export function saveRelease(userId: string, productId: string, input: { versionLabel: string; ticket: string; answers: Record<string, unknown>; notes: Record<string, unknown> }) {
  const { org } = requireProduct(userId, productId, "editor");
  const answers: GateAnswers = {};
  const notes: Record<string, string> = {};
  for (const id of GATE_IDS) {
    const a = input.answers[id];
    if (a === "yes" || a === "no") (answers as Record<string, string>)[id] = a;
    const n = input.notes[id];
    if (typeof n === "string" && n.trim()) notes[id] = n.slice(0, 500);
  }
  const result = evaluateReleaseGate(answers);
  if (!result.complete) throw badRequest("Answer every gate question before saving the release record.");
  const id = newId();
  run(
    `INSERT INTO release_records (id, product_id, version_label, outcomes_json, data_sealed, created_by, created_at)
     VALUES ($id, $p, $v, $o, $d, $u, $t)`,
    {
      id,
      p: productId,
      v: input.versionLabel,
      o: JSON.stringify(result.results.map((r) => ({ id: r.id, title: r.title, outcome: r.outcome, reason: r.reason }))),
      d: seal({ ticket: input.ticket, answers, notes }, `release:${id}`),
      u: userId,
      t: now(),
    },
  );
  audit({ orgId: org.orgId, userId, action: "release.recorded", targetType: "product", targetId: productId, meta: { version: input.versionLabel } });
  return { id, results: result.results };
}

export function listReleases(userId: string, productId: string) {
  requireProduct(userId, productId, "viewer");
  return all<{ id: string; version_label: string; outcomes_json: string; data_sealed: string; created_at: number }>(
    "SELECT id, version_label, outcomes_json, data_sealed, created_at FROM release_records WHERE product_id = $p ORDER BY created_at DESC LIMIT 200",
    { p: productId },
  ).map((r) => {
    const data = open<{ ticket: string; answers: GateAnswers; notes: Record<string, string> }>(r.data_sealed, `release:${r.id}`);
    return {
      id: r.id,
      version: r.version_label,
      ticket: data.ticket,
      outcomes: JSON.parse(r.outcomes_json) as { id: string; title: string; outcome: string; reason: string }[],
      triggers: Object.entries(data.answers)
        .filter(([k, v]) => v === "yes" && !(baselineQuestions as readonly { id: string }[]).some((q) => q.id === k))
        .map(([k]) => ({ id: k, note: data.notes[k] ?? "" })),
      createdAt: r.created_at,
    };
  });
}
