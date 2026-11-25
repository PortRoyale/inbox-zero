import { checkWithOsv, parseSbom, SbomError, sbomQuality, type Finding, type SbomComponent } from "@/lib/sbom";
import { config } from "@/server/config";
import { open, seal } from "@/server/crypto/envelope";
import { all, get, newId, now, run, tx } from "@/server/db";
import { badRequest, notFound, tooMany } from "@/server/errors";
import { audit, rateLimit, sendMail } from "@/server/platform";
import { entitlement } from "@/server/services/billing";
import { requireProduct } from "@/server/services/products";

type SbomRow = {
  id: string;
  product_id: string;
  label: string;
  format: string;
  spec_version: string;
  component_count: number;
  quality_json: string;
  counts_json: string;
  data_sealed: string;
  checked_at: number | null;
  check_error: string | null;
  created_at: number;
};

type Stored = { subject?: string; tool?: string; created?: string; author?: string; components: SbomComponent[] };

export const FINDING_STATUSES = ["open", "investigating", "not-affected", "fixed", "accepted"] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

function parseOrThrow(text: string) {
  try {
    return parseSbom(text);
  } catch (e) {
    if (e instanceof SbomError) throw badRequest(e.message);
    throw e;
  }
}

/** Public tool: the browser parses and scores the SBOM; only package identifiers come here for the
 *  vulnerability lookup. Nothing is stored. */
export async function lookupOnce(components: SbomComponent[], ip: string | null) {
  if (!rateLimit(`sbom-tool:ip:${ip ?? "none"}`, 10, 3600).allowed) throw tooMany(3600);
  try {
    return { ...(await checkWithOsv(components, { baseUrl: config().osvUrl, maxDetails: 300 })), error: null as string | null };
  } catch (e) {
    return { findings: [], queried: 0, skipped: 0, error: (e as Error).message };
  }
}

export async function uploadSbom(userId: string, productId: string, label: string, text: string) {
  const { org } = requireProduct(userId, productId, "editor");
  const parsed = parseOrThrow(text);
  const quality = sbomQuality(parsed);
  const id = newId();
  const stored: Stored = { subject: parsed.subject, tool: parsed.tool, created: parsed.created, author: parsed.author, components: parsed.components };
  run(
    `INSERT INTO sboms (id, product_id, label, format, spec_version, component_count, quality_json, counts_json, data_sealed, uploaded_by, created_at)
     VALUES ($id, $p, $l, $f, $v, $n, $q, '{}', $d, $u, $t)`,
    { id, p: productId, l: label, f: parsed.format, v: parsed.specVersion, n: parsed.components.length, q: JSON.stringify(quality), d: seal(stored, `sbom:${id}`), u: userId, t: now() },
  );
  audit({ orgId: org.orgId, userId, action: "sbom.uploaded", targetType: "product", targetId: productId, meta: { components: parsed.components.length } });
  const check = await runCheck(id);
  return { id, quality, ...check };
}

/** Re-checks one SBOM against OSV, upserting findings. Returns how many are new. */
export async function runCheck(sbomId: string) {
  const row = get<SbomRow>("SELECT * FROM sboms WHERE id = $id", { id: sbomId });
  if (!row) throw notFound();
  const stored = open<Stored>(row.data_sealed, `sbom:${sbomId}`);
  let findings: Finding[];
  try {
    findings = (await checkWithOsv(stored.components, { baseUrl: config().osvUrl })).findings;
  } catch (e) {
    run("UPDATE sboms SET check_error = $e, checked_at = $t WHERE id = $id", { id: sbomId, e: (e as Error).message.slice(0, 300), t: now() });
    return { newFindings: [] as Finding[], error: (e as Error).message };
  }
  const fresh: Finding[] = [];
  tx(() => {
    for (const f of findings) {
      const existing = get<{ id: string }>("SELECT id FROM sbom_findings WHERE sbom_id = $s AND vuln_id = $v AND component_key = $c", { s: sbomId, v: f.vulnId, c: f.purl });
      if (existing) {
        run("UPDATE sbom_findings SET severity = $sev, score = $score, data_sealed = $d, updated_at = $t WHERE id = $id", {
          id: existing.id,
          sev: f.severity,
          score: f.score,
          d: seal(f, `finding:${existing.id}`),
          t: now(),
        });
      } else {
        const fid = newId();
        run(
          `INSERT INTO sbom_findings (id, product_id, sbom_id, vuln_id, component_key, severity, score, data_sealed, first_seen_at, updated_at)
           VALUES ($id, $p, $s, $v, $c, $sev, $score, $d, $t, $t)`,
          { id: fid, p: row.product_id, s: sbomId, v: f.vulnId, c: f.purl, sev: f.severity, score: f.score, d: seal(f, `finding:${fid}`), t: now() },
        );
        fresh.push(f);
      }
    }
    const counts = all<{ severity: string; n: number }>("SELECT severity, COUNT(*) AS n FROM sbom_findings WHERE sbom_id = $s GROUP BY severity", { s: sbomId });
    run("UPDATE sboms SET counts_json = $c, checked_at = $t, check_error = NULL WHERE id = $id", {
      id: sbomId,
      c: JSON.stringify(Object.fromEntries(counts.map((c) => [c.severity, c.n]))),
      t: now(),
    });
  });
  return { newFindings: fresh, error: null as string | null };
}

export function listSboms(userId: string, productId: string) {
  requireProduct(userId, productId, "viewer");
  return all<SbomRow>("SELECT * FROM sboms WHERE product_id = $p ORDER BY created_at DESC LIMIT 50", { p: productId }).map((r) => {
    const stored = open<Stored>(r.data_sealed, `sbom:${r.id}`);
    return {
      id: r.id,
      label: r.label,
      format: r.format,
      specVersion: r.spec_version,
      components: r.component_count,
      subject: stored.subject ?? "",
      tool: stored.tool ?? "",
      quality: JSON.parse(r.quality_json) as ReturnType<typeof sbomQuality>,
      counts: JSON.parse(r.counts_json) as Record<string, number>,
      checkedAt: r.checked_at,
      checkError: r.check_error,
      createdAt: r.created_at,
    };
  });
}

export function listFindings(userId: string, productId: string, sbomId: string) {
  requireProduct(userId, productId, "viewer");
  if (!get("SELECT 1 FROM sboms WHERE id = $s AND product_id = $p", { s: sbomId, p: productId })) throw notFound();
  return all<{ id: string; status: FindingStatus; note_sealed: string | null; data_sealed: string; first_seen_at: number; updated_at: number }>(
    "SELECT id, status, note_sealed, data_sealed, first_seen_at, updated_at FROM sbom_findings WHERE sbom_id = $s ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, score DESC",
    { s: sbomId },
  ).map((r) => ({
    id: r.id,
    status: r.status,
    note: r.note_sealed ? open<string>(r.note_sealed, `finding:${r.id}:note`) : "",
    firstSeenAt: r.first_seen_at,
    updatedAt: r.updated_at,
    ...open<Finding>(r.data_sealed, `finding:${r.id}`),
  }));
}

export function setFindingStatus(userId: string, productId: string, findingId: string, status: FindingStatus, note: string) {
  const { org } = requireProduct(userId, productId, "editor");
  const res = run("UPDATE sbom_findings SET status = $s, note_sealed = $n, updated_at = $t WHERE id = $id AND product_id = $p", {
    id: findingId,
    p: productId,
    s: status,
    n: note ? seal(note, `finding:${findingId}:note`) : null,
    t: now(),
  });
  if (Number(res.changes) === 0) throw notFound();
  audit({ orgId: org.orgId, userId, action: "finding.triaged", targetType: "finding", targetId: findingId, meta: { status } });
}

export function deleteSbom(userId: string, productId: string, sbomId: string) {
  const { org } = requireProduct(userId, productId, "admin", { allowLapsed: true });
  const res = run("DELETE FROM sboms WHERE id = $s AND product_id = $p", { s: sbomId, p: productId });
  if (Number(res.changes) === 0) throw notFound();
  audit({ orgId: org.orgId, userId, action: "sbom.deleted", targetType: "sbom", targetId: sbomId });
}

/** Cron: re-checks the latest SBOM of every active product and emails owners and admins about new critical or high findings. */
export async function watchAll() {
  const latestAll = all<{ id: string; product_id: string; org_id: string; name_sealed: string }>(
    `SELECT s.id, s.product_id, p.org_id, p.name_sealed FROM sboms s JOIN products p ON p.id = s.product_id
     WHERE p.archived_at IS NULL AND s.created_at = (SELECT MAX(created_at) FROM sboms x WHERE x.product_id = s.product_id)`,
  );
  // Monitoring is a paid feature: only teams with an active plan or trial are watched.
  const latest = latestAll.filter((s) => entitlement(s.org_id).canWrite);
  let checked = 0;
  let alerts = 0;
  let errors = 0;
  for (const s of latest) {
    const res = await runCheck(s.id);
    checked++;
    if (res.error) {
      errors++;
      continue;
    }
    const serious = res.newFindings.filter((f) => f.severity === "critical" || f.severity === "high");
    if (!serious.length) continue;
    const product = open<string>(s.name_sealed, `product:${s.product_id}:name`);
    const people = all<{ id: string; email_sealed: string }>(
      "SELECT u.id, u.email_sealed FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = $o AND m.role IN ('owner', 'admin') AND u.email_verified_at IS NOT NULL",
      { o: s.org_id },
    );
    const lines = serious.slice(0, 20).map((f) => `- ${f.vulnId} (${f.severity}${f.score ? ` ${f.score}` : ""}) in ${f.component} ${f.version}${f.fixedIn.length ? `, fixed in ${f.fixedIn.join(", ")}` : ""}`);
    for (const p of people) {
      await sendMail({
        to: open<string>(p.email_sealed, `user:${p.id}:email`),
        subject: `${serious.length} new ${serious.length === 1 ? "vulnerability" : "vulnerabilities"} in ${product}`,
        text: `SBOM watch found new critical or high vulnerabilities in ${product}:\n\n${lines.join("\n")}\n\nTriage them at ${config().appUrl}/app/product/?id=${s.product_id}&tab=sbom\n\nIf one is actively exploited, the CRA 24-hour early warning clock may apply.`,
      }).catch(() => {});
      alerts++;
    }
    audit({ orgId: s.org_id, action: "sbom.alerted", targetType: "product", targetId: s.product_id, meta: { findings: serious.length } });
  }
  return { checked, alerts, errors };
}
