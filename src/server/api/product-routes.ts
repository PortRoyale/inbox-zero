import { isSuperadmin } from "@/server/api/account-routes";
import { download, json, route } from "@/server/http";
import { HttpError } from "@/server/errors";
import { all, get } from "@/server/db";
import { open } from "@/server/crypto/envelope";
import { publicKeyDocument } from "@/server/crypto/keys";
import * as billing from "@/server/services/billing";
import * as evidence from "@/server/services/evidence";
import * as leads from "@/server/services/leads";
import * as orgs from "@/server/services/orgs";
import * as products from "@/server/services/products";
import * as sbom from "@/server/services/sbom";
import { v } from "@/server/validate";

const name = v.string({ min: 1, max: 120 });
const time = v.optional(v.timestamp());
const nullableTime = (value: unknown, path: string) => (value === null ? null : value === undefined ? undefined : v.timestamp()(value, path));
const text = (max = 4000) => v.optional(v.string({ max }));

const incidentData = v.object({
  title: v.optional(v.string({ min: 1, max: 200 })),
  summary: text(),
  productVersion: text(80),
  marketStates: v.optional(v.array(v.string({ min: 1, max: 60 }), { max: 40 })),
  exploitNature: text(),
  severity: text(200),
  impact: text(),
  maliciousActor: text(),
  suspectedMalicious: v.optional(v.bool()),
  rootCause: text(),
  measuresTaken: text(),
  userMeasures: text(),
  correctiveMeasure: text(),
  sensitivity: v.optional(v.enum(["low", "medium", "high"] as const)),
  srpReference: text(120),
});

const stripUndefined = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined)) as Partial<T>;

export const productRoutes = [
  // ---------- Products ----------
  route({ method: "GET", path: "/orgs/:orgId/products", access: "verified" }, ({ user, params, url }) => ({
    products: products.listProducts(user.id, params.orgId, url.searchParams.get("archived") === "1"),
  })),
  route({ method: "POST", path: "/orgs/:orgId/products", access: "verified", body: v.object({ name, industry: v.optional(v.string({ max: 80 })) }) }, ({ user, params, body }) =>
    json({ id: products.createProduct(user.id, params.orgId, { name: body.name, industry: body.industry ?? "" }) }, { status: 201 }),
  ),
  route({ method: "PATCH", path: "/products/:productId", access: "verified", body: v.object({ name: v.optional(name), archived: v.optional(v.bool()) }) }, ({ user, params, body }) => {
    if (body.name) products.renameProduct(user.id, params.productId, body.name);
    if (body.archived !== undefined) products.setArchived(user.id, params.productId, body.archived);
    return { ok: true };
  }),
  route({ method: "POST", path: "/products/:productId/delete", access: "verified", body: v.object({ confirmName: v.string({ min: 1, max: 120 }) }) }, ({ user, params, body }) => {
    products.deleteProduct(user.id, params.productId, body.confirmName);
    return { ok: true };
  }),

  // ---------- Plan ----------
  route({ method: "GET", path: "/products/:productId/plan", access: "verified" }, ({ user, params }) => products.getPlan(user.id, params.productId)),
  route(
    { method: "PUT", path: "/products/:productId/plan", access: "verified", maxBytes: 600 * 1024, body: v.object({ plan: v.json({ maxBytes: 512 * 1024 }), version: v.int({ min: 1, max: 1e9 }) }) },
    ({ user, params, body }) => products.savePlan(user.id, params.productId, body.plan, body.version),
  ),
  route({ method: "GET", path: "/products/:productId/revisions", access: "verified" }, ({ user, params }) => ({ revisions: products.listRevisions(user.id, params.productId) })),
  route({ method: "POST", path: "/products/:productId/revisions", access: "verified", body: v.object({ summary: v.string({ min: 1, max: 1000 }) }) }, ({ user, params, body }) =>
    json(products.issueRevision(user, params.productId, body.summary), { status: 201 }),
  ),

  // ---------- Release records ----------
  route({ method: "GET", path: "/products/:productId/releases", access: "verified" }, ({ user, params }) => ({ releases: products.listReleases(user.id, params.productId) })),
  route(
    {
      method: "POST",
      path: "/products/:productId/releases",
      access: "verified",
      body: v.object({
        versionLabel: v.string({ min: 1, max: 80 }),
        ticket: v.string({ max: 120 }),
        answers: v.json({ maxBytes: 4000 }),
        notes: v.json({ maxBytes: 16000 }),
      }),
    },
    ({ user, params, body }) =>
      json(
        products.saveRelease(user.id, params.productId, {
          versionLabel: body.versionLabel,
          ticket: body.ticket,
          answers: (body.answers ?? {}) as Record<string, unknown>,
          notes: (body.notes ?? {}) as Record<string, unknown>,
        }),
        { status: 201 },
      ),
  ),

  // ---------- Incidents ----------
  route({ method: "GET", path: "/products/:productId/incidents", access: "verified" }, ({ user, params }) => ({ incidents: evidence.listIncidents(user.id, params.productId) })),
  route(
    {
      method: "POST",
      path: "/products/:productId/incidents",
      access: "verified",
      body: v.object({ kind: v.enum(["vulnerability", "incident"] as const), awareAt: v.timestamp(), data: incidentData }),
    },
    ({ user, params, body }) => {
      if (!body.data.title) throw new HttpError(400, "Give the incident a short title.");
      return json({ id: evidence.createIncident(user.id, params.productId, { kind: body.kind, awareAt: body.awareAt, data: { ...stripUndefined(body.data), title: body.data.title } }) }, { status: 201 });
    },
  ),
  route(
    {
      method: "PATCH",
      path: "/products/:productId/incidents/:id",
      access: "verified",
      body: v.object({
        times: v.optional(
          v.object({
            earlyWarningAt: nullableTime,
            notificationAt: nullableTime,
            fixAvailableAt: nullableTime,
            finalReportAt: nullableTime,
            usersInformedAt: nullableTime,
            closedAt: nullableTime,
          }),
        ),
        data: v.optional(incidentData),
      }),
    },
    ({ user, params, body }) =>
      evidence.updateIncident(user.id, params.productId, params.id, {
        times: body.times ? stripUndefined(body.times) : undefined,
        data: body.data ? stripUndefined(body.data) : undefined,
      }),
  ),
  route({ method: "DELETE", path: "/products/:productId/incidents/:id", access: "verified" }, ({ user, params }) => {
    evidence.deleteIncident(user.id, params.productId, params.id);
    return { ok: true };
  }),

  // ---------- Evidence export and public verification ----------
  route({ method: "POST", path: "/products/:productId/export", access: "verified" }, ({ user, params }) => {
    const sboms = sbomSummaries(params.productId);
    const out = evidence.exportEvidence(user.id, params.productId, { sboms });
    const stamp = out.manifest.createdAt.slice(0, 10);
    return download(`readyline-evidence-${stamp}.json`, "application/json; charset=utf-8", JSON.stringify(out, null, 2));
  }),
  route(
    { method: "POST", path: "/verify", access: "public", maxBytes: 4 * 1024 * 1024, body: v.object({ statement: v.json({ maxBytes: 64 * 1024 }), signature: v.json({ maxBytes: 16 * 1024 }), bundle: v.optional(v.json({ maxBytes: 4 * 1024 * 1024 })) }) },
    ({ body }) => {
      const result = products.verifyStatement(body.statement, body.signature);
      const st = body.statement as { digest?: string };
      const bundleMatches = body.bundle === undefined ? null : evidence.bundleDigest(body.bundle) === st?.digest;
      return { ...result, bundleMatches };
    },
  ),
  // Liveness and readiness for the container health check: the database answers and the keys load.
  route({ method: "GET", path: "/health", access: "public" }, () => {
    get("SELECT 1");
    publicKeyDocument();
    return json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }),
  route({ method: "GET", path: "/keys", access: "public" }, () => json(publicKeyDocument(), { headers: { "Cache-Control": "public, max-age=3600" } })),

  // ---------- SBOM watch ----------
  route({ method: "GET", path: "/products/:productId/sboms", access: "verified" }, ({ user, params }) => ({ sboms: sbom.listSboms(user.id, params.productId) })),
  route(
    { method: "POST", path: "/products/:productId/sboms", access: "verified", maxBytes: 6 * 1024 * 1024, body: v.object({ label: v.string({ min: 1, max: 120 }), text: v.string({ min: 2, max: 5 * 1024 * 1024, trim: false }) }) },
    async ({ user, params, body }) => json(await sbom.uploadSbom(user.id, params.productId, body.label, body.text), { status: 201 }),
  ),
  route({ method: "GET", path: "/products/:productId/sboms/:id/findings", access: "verified" }, ({ user, params }) => ({ findings: sbom.listFindings(user.id, params.productId, params.id) })),
  route({ method: "POST", path: "/products/:productId/sboms/:id/check", access: "verified" }, async ({ user, params }) => {
    products.requireProduct(user.id, params.productId, "editor");
    if (!sbom.listSboms(user.id, params.productId).some((s) => s.id === params.id)) throw new HttpError(404, "Not found.");
    const res = await sbom.runCheck(params.id);
    return { newFindings: res.newFindings.length, error: res.error };
  }),
  route({ method: "DELETE", path: "/products/:productId/sboms/:id", access: "verified" }, ({ user, params }) => {
    sbom.deleteSbom(user.id, params.productId, params.id);
    return { ok: true };
  }),
  route(
    { method: "PATCH", path: "/products/:productId/findings/:id", access: "verified", body: v.object({ status: v.enum(sbom.FINDING_STATUSES), note: v.optional(v.string({ max: 2000 })) }) },
    ({ user, params, body }) => {
      sbom.setFindingStatus(user.id, params.productId, params.id, body.status, body.note ?? "");
      return { ok: true };
    },
  ),
  route(
    {
      method: "POST",
      path: "/tools/osv-lookup",
      access: "public",
      maxBytes: 2 * 1024 * 1024,
      body: v.object({
        components: v.array(v.object({ name: v.string({ max: 300 }), version: v.string({ max: 120 }), purl: v.optional(v.string({ max: 600 })) }), { max: 5000 }),
      }),
    },
    ({ body, ip }) => sbom.lookupOnce(body.components.map((c) => ({ ...c, licenses: [], hashes: 0 })), ip),
  ),
  route({ method: "POST", path: "/cron/sbom-watch", access: "cron" }, () => sbom.watchAll()),

  // ---------- Billing ----------
  route({ method: "GET", path: "/orgs/:orgId/billing", access: "verified" }, ({ user, params }) => billing.billingStatus(user.id, params.orgId)),
  route({ method: "POST", path: "/orgs/:orgId/billing/checkout", access: "verified", body: v.object({ tier: v.enum(["starter", "team"] as const) }) }, ({ user, params, body }) =>
    billing.startCheckout(user, params.orgId, body.tier),
  ),
  route({ method: "POST", path: "/orgs/:orgId/billing/portal", access: "verified" }, ({ user, params }) => billing.portalUrl(user.id, params.orgId)),
  route({ method: "POST", path: "/billing/webhook/finix", access: "webhook" }, ({ rawBody, req }) => billing.handleFinixWebhook(rawBody, req.headers)),
  route({ method: "POST", path: "/billing/webhook/stripe", access: "webhook" }, ({ rawBody, req }) => billing.handleStripeWebhook(rawBody, req.headers)),
  route({ method: "POST", path: "/cron/billing", access: "cron" }, () => billing.billingSweep()),

  // ---------- Leads ----------
  route(
    {
      method: "POST",
      path: "/leads",
      access: "public",
      body: v.object({
        name: v.string({ min: 1, max: 120 }),
        email: v.email(),
        company: v.string({ min: 1, max: 160 }),
        makes: text(200),
        sellWhen: text(120),
        plan: text(60),
        notes: text(2000),
        source: text(80),
        website: v.optional(v.string({ max: 200 })),
      }),
    },
    async ({ body, ip }) => {
      // Honeypot: real people never fill the hidden "website" field.
      if (body.website) return json({ ok: true }, { status: 202 });
      const { source, website: _w, ...lead } = body;
      await leads.createLead(stripUndefined(lead) as leads.Lead, source ?? "site", ip);
      return json({ ok: true }, { status: 202 });
    },
  ),

  // ---------- Superadmin ----------
  route({ method: "GET", path: "/admin/leads", access: "superadmin" }, () => ({ leads: leads.listLeads() })),
  route({ method: "DELETE", path: "/admin/leads/:id", access: "superadmin" }, ({ user, params }) => {
    leads.deleteLead(user.id, params.id);
    return { ok: true };
  }),
  route({ method: "GET", path: "/admin/orgs", access: "superadmin" }, () => ({ orgs: leads.listAllOrgs() })),
  route(
    { method: "PATCH", path: "/admin/orgs/:orgId", access: "superadmin", body: v.object({ tier: v.enum(["starter", "team"] as const), until: v.optional(v.timestamp()) }) },
    ({ user, params, body }) => {
      leads.adminSetTier(user.id, params.orgId, body.tier, body.until ?? null);
      return { ok: true };
    },
  ),
  route({ method: "GET", path: "/admin/me", access: "user" }, ({ user }) => ({ superadmin: isSuperadmin(user) })),

  // ---------- Personal data export (GDPR Art. 15 and 20) ----------
  route({ method: "GET", path: "/me/export", access: "user" }, ({ user }) => {
    const memberships = orgs.myOrgs(user.id);
    const activity = all<{ action: string; target_type: string; target_id: string; created_at: number }>(
      "SELECT action, target_type, target_id, created_at FROM audit_log WHERE user_id = $u ORDER BY id DESC LIMIT 5000",
      { u: user.id },
    );
    const sessions = all<{ created_at: number; last_seen_at: number; user_agent: string | null }>("SELECT created_at, last_seen_at, user_agent FROM sessions WHERE user_id = $u", { u: user.id });
    const body = { exportedAt: new Date().toISOString(), profile: user, teams: memberships, sessions, activity };
    return download(`readyline-account-${new Date().toISOString().slice(0, 10)}.json`, "application/json; charset=utf-8", JSON.stringify(body, null, 2));
  }),
];

// SBOM summaries for the evidence bundle (no raw component lists, which can be large).
function sbomSummaries(productId: string) {
  return all<{ id: string; label: string; format: string; spec_version: string; component_count: number; quality_json: string; counts_json: string; checked_at: number | null; created_at: number }>(
    "SELECT id, label, format, spec_version, component_count, quality_json, counts_json, checked_at, created_at FROM sboms WHERE product_id = $p ORDER BY created_at DESC LIMIT 50",
    { p: productId },
  ).map((r) => ({
    id: r.id,
    label: r.label,
    format: `${r.format} ${r.spec_version}`,
    components: r.component_count,
    quality: JSON.parse(r.quality_json),
    vulnerabilities: JSON.parse(r.counts_json),
    checkedAt: r.checked_at ? new Date(r.checked_at).toISOString() : null,
    uploadedAt: new Date(r.created_at).toISOString(),
    findings: all<{ vuln_id: string; component_key: string; severity: string; status: string; note_sealed: string | null; id: string }>(
      "SELECT id, vuln_id, component_key, severity, status, note_sealed FROM sbom_findings WHERE sbom_id = $s ORDER BY score DESC",
      { s: r.id },
    ).map((f) => ({ vuln: f.vuln_id, component: f.component_key, severity: f.severity, status: f.status, note: f.note_sealed ? open<string>(f.note_sealed, `finding:${f.id}:note`) : "" })),
  }));
}
