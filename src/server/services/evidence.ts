import { open, seal } from "@/server/crypto/envelope";
import { canonicalJson, sha512Hex, signPayload } from "@/server/crypto/sign";
import { all, get, newId, now, run } from "@/server/db";
import { badRequest, notFound } from "@/server/errors";
import { audit } from "@/server/platform";
import { getPlan, listReleases, listRevisions, requireProduct } from "@/server/services/products";

// ---------- Incidents (CRA Art. 14 reporting clock) ----------

export type IncidentKind = "vulnerability" | "incident";
export type IncidentData = {
  title: string;
  summary?: string;
  productVersion?: string;
  marketStates?: string[];
  exploitNature?: string;
  severity?: string;
  impact?: string;
  maliciousActor?: string;
  suspectedMalicious?: boolean;
  rootCause?: string;
  measuresTaken?: string;
  userMeasures?: string;
  correctiveMeasure?: string;
  sensitivity?: "low" | "medium" | "high";
  srpReference?: string;
};

export const TIME_FIELDS = ["earlyWarningAt", "notificationAt", "fixAvailableAt", "finalReportAt", "usersInformedAt", "closedAt"] as const;
type TimeField = (typeof TIME_FIELDS)[number];
const COLUMN: Record<TimeField, string> = {
  earlyWarningAt: "early_warning_at",
  notificationAt: "notification_at",
  fixAvailableAt: "fix_available_at",
  finalReportAt: "final_report_at",
  usersInformedAt: "users_informed_at",
  closedAt: "closed_at",
};

type IncidentRow = {
  id: string;
  product_id: string;
  kind: IncidentKind;
  aware_at: number;
  fix_available_at: number | null;
  early_warning_at: number | null;
  notification_at: number | null;
  final_report_at: number | null;
  users_informed_at: number | null;
  closed_at: number | null;
  data_sealed: string;
  created_at: number;
  updated_at: number;
};

function shapeIncident(r: IncidentRow) {
  return {
    id: r.id,
    kind: r.kind,
    times: {
      awareAt: r.aware_at,
      earlyWarningAt: r.early_warning_at,
      notificationAt: r.notification_at,
      fixAvailableAt: r.fix_available_at,
      finalReportAt: r.final_report_at,
      usersInformedAt: r.users_informed_at,
      closedAt: r.closed_at,
    },
    data: open<IncidentData>(r.data_sealed, `incident:${r.id}`),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export type IncidentView = ReturnType<typeof shapeIncident>;

export function createIncident(userId: string, productId: string, input: { kind: IncidentKind; awareAt: number; data: IncidentData }) {
  const { org } = requireProduct(userId, productId, "editor", { allowLapsed: true });
  if (input.awareAt > now() + 5 * 60_000) throw badRequest("The time you became aware cannot be in the future.");
  const id = newId();
  const t = now();
  run(
    `INSERT INTO incidents (id, product_id, kind, aware_at, data_sealed, created_by, created_at, updated_at)
     VALUES ($id, $p, $k, $a, $d, $u, $t, $t)`,
    { id, p: productId, k: input.kind, a: input.awareAt, d: seal(input.data, `incident:${id}`), u: userId, t },
  );
  audit({ orgId: org.orgId, userId, action: "incident.opened", targetType: "incident", targetId: id, meta: { kind: input.kind } });
  return id;
}

export function updateIncident(userId: string, productId: string, incidentId: string, patch: { times?: Partial<Record<TimeField, number | null>>; data?: Partial<IncidentData> }) {
  const { org } = requireProduct(userId, productId, "editor", { allowLapsed: true });
  const row = get<IncidentRow>("SELECT * FROM incidents WHERE id = $id AND product_id = $p", { id: incidentId, p: productId });
  if (!row) throw notFound();
  const sets: string[] = [];
  const params: Record<string, number | string | null> = { id: incidentId, t: now() };
  for (const f of TIME_FIELDS) {
    const v = patch.times?.[f];
    if (v === undefined) continue;
    if (v !== null && (v < row.aware_at - 60_000 || v > now() + 5 * 60_000)) throw badRequest("Milestone times must be after you became aware and not in the future.");
    sets.push(`${COLUMN[f]} = $${f}`);
    params[f] = v;
  }
  if (patch.data) {
    const merged = { ...open<IncidentData>(row.data_sealed, `incident:${incidentId}`), ...patch.data };
    sets.push("data_sealed = $d");
    params.d = seal(merged, `incident:${incidentId}`);
  }
  if (!sets.length) return shapeIncident(row);
  run(`UPDATE incidents SET ${sets.join(", ")}, updated_at = $t WHERE id = $id`, params);
  audit({ orgId: org.orgId, userId, action: "incident.updated", targetType: "incident", targetId: incidentId, meta: { fields: Object.keys(patch.times ?? {}).join(",") } });
  return shapeIncident(get<IncidentRow>("SELECT * FROM incidents WHERE id = $id", { id: incidentId })!);
}

export function listIncidents(userId: string, productId: string) {
  requireProduct(userId, productId, "viewer");
  return all<IncidentRow>("SELECT * FROM incidents WHERE product_id = $p ORDER BY closed_at IS NOT NULL, aware_at DESC LIMIT 200", { p: productId }).map(shapeIncident);
}

export function deleteIncident(userId: string, productId: string, incidentId: string) {
  const { org } = requireProduct(userId, productId, "admin", { allowLapsed: true });
  const res = run("DELETE FROM incidents WHERE id = $id AND product_id = $p", { id: incidentId, p: productId });
  if (Number(res.changes) === 0) throw notFound();
  audit({ orgId: org.orgId, userId, action: "incident.deleted", targetType: "incident", targetId: incidentId });
}

// ---------- Signed evidence export ----------

export type EvidenceManifest = {
  type: "readyline.evidence/v1";
  productId: string;
  product: string;
  createdAt: string;
  digest: string;
  algorithm: "SHA-512";
  contents: string[];
};

export function exportEvidence(userId: string, productId: string, extras: { sboms: unknown[] }) {
  const { org, name } = requireProduct(userId, productId, "editor", { allowLapsed: true });
  const plan = getPlan(userId, productId);
  const bundle = {
    product: { id: productId, name },
    plan: { version: plan.version, updatedAt: new Date(plan.updatedAt).toISOString(), content: plan.plan },
    revisions: listRevisions(userId, productId),
    releases: listReleases(userId, productId),
    sboms: extras.sboms,
    incidents: listIncidents(userId, productId),
  };
  const digest = sha512Hex(canonicalJson(bundle));
  const manifest: EvidenceManifest = {
    type: "readyline.evidence/v1",
    productId,
    product: name,
    createdAt: new Date(now()).toISOString(),
    digest,
    algorithm: "SHA-512",
    contents: Object.keys(bundle),
  };
  const signature = signPayload(manifest);
  run("INSERT INTO exports (id, product_id, digest, manifest_json, signature_json, created_by, created_at) VALUES ($id, $p, $d, $m, $s, $u, $t)", {
    id: newId(),
    p: productId,
    d: digest,
    m: JSON.stringify(manifest),
    s: JSON.stringify(signature),
    u: userId,
    t: now(),
  });
  audit({ orgId: org.orgId, userId, action: "evidence.exported", targetType: "product", targetId: productId });
  return { manifest, signature, bundle };
}

/** Recomputes a bundle's digest so a verifier can confirm the bundle matches its signed manifest. */
export function bundleDigest(bundle: unknown) {
  return sha512Hex(canonicalJson(bundle));
}
