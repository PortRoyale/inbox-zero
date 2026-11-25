import { describe, expect, it } from "vitest";
import { examplePlan } from "@/lib/plan/model";
import { get } from "@/server/db";
import { grantManual } from "@/server/services/billing";
import { lastLink, signedInUser, TestClient } from "@/server/test/client";

type Created = { id: string };

async function productFor(owner: Awaited<ReturnType<typeof signedInUser>>, name = "Thermostat") {
  const r = await owner.c.post<Created>(`/orgs/${owner.orgId}/products`, { name, industry: "smart-home" });
  expect(r.status).toBe(201);
  return r.data.id;
}

async function addMember(owner: Awaited<ReturnType<typeof signedInUser>>, role: string) {
  const m = await signedInUser(`Member ${role}`, "Elsewhere");
  await owner.c.post(`/orgs/${owner.orgId}/invites`, { email: m.email, role });
  const accepted = await m.c.post("/invites/accept", { token: lastLink(m.email, "invite") });
  expect(accepted.status).toBe(200);
  return m;
}

describe("products and plans", () => {
  it("creates a product with a preset plan and enforces the tier limit", async () => {
    const owner = await signedInUser("Prod Owner", "Prod Co");
    const id = await productFor(owner);
    const plan = await owner.c.get<{ plan: { product: { name: string; industry: string } }; version: number }>(`/products/${id}/plan`);
    expect(plan.data.plan.product).toMatchObject({ name: "Thermostat", industry: "smart-home" });
    expect(plan.data.version).toBe(1);
    // During the trial a team can try Team limits; on a paid Starter plan the limit is one product.
    const trialSecond = await owner.c.post<{ id: string }>(`/orgs/${owner.orgId}/products`, { name: "Trial second" });
    expect(trialSecond.status).toBe(201);
    await owner.c.post(`/products/${trialSecond.data.id}/delete`, { confirmName: "Trial second" });
    const me = await owner.c.get<{ user: { id: string } }>("/me");
    grantManual(me.data.user.id, owner.orgId, "starter", null);
    const second = await owner.c.post(`/orgs/${owner.orgId}/products`, { name: "Second" });
    expect(second.status).toBe(400);
    expect(second.data.error).toMatch(/covers 1 product/);
  });

  it("keeps products private to their team (404, not 403)", async () => {
    const owner = await signedInUser("Private Owner", "Private Co");
    const id = await productFor(owner);
    const outsider = await signedInUser("Outsider", "Other Co");
    for (const path of [`/products/${id}/plan`, `/products/${id}/revisions`, `/products/${id}/releases`, `/products/${id}/incidents`]) {
      expect((await outsider.c.get(path)).status).toBe(404);
    }
    expect((await outsider.c.call("PUT", `/products/${id}/plan`, { plan: {}, version: 1 })).status).toBe(404);
    expect((await outsider.c.post(`/products/${id}/export`)).status).toBe(404);
    expect((await outsider.c.get(`/orgs/${owner.orgId}/products`)).status).toBe(404);
  });

  it("saves with optimistic concurrency and coerces untrusted plan JSON", async () => {
    const owner = await signedInUser("Saver", "Save Co");
    const id = await productFor(owner);
    const plan = { ...examplePlan(), injected: "<script>", product: { ...examplePlan().product, name: "x".repeat(5000) } };
    const saved = await owner.c.call<{ version: number; summary: { completeness: number } }>("PUT", `/products/${id}/plan`, { plan, version: 1 });
    expect(saved.status).toBe(200);
    expect(saved.data.version).toBe(2);
    expect(saved.data.summary.completeness).toBeGreaterThan(50);
    const stale = await owner.c.call("PUT", `/products/${id}/plan`, { plan, version: 1 });
    expect(stale.status).toBe(409);
    const back = await owner.c.get<{ plan: Record<string, unknown> & { product: { name: string } } }>(`/products/${id}/plan`);
    expect(back.data.plan.injected).toBeUndefined();
    expect(back.data.plan.product.name.length).toBe(200);
    const row = JSON.stringify(get("SELECT * FROM plans WHERE product_id = $p", { p: id }));
    expect(row).not.toContain("Example thermostat");
  });

  it("lets viewers read but not write", async () => {
    const owner = await signedInUser("Role Owner", "Role Co");
    const id = await productFor(owner);
    const viewer = await addMember(owner, "viewer");
    expect((await viewer.c.get(`/products/${id}/plan`)).status).toBe(200);
    expect((await viewer.c.call("PUT", `/products/${id}/plan`, { plan: examplePlan(), version: 1 })).status).toBe(403);
    expect((await viewer.c.post(`/products/${id}/revisions`, { summary: "x" })).status).toBe(403);
  });
});

describe("signed revisions", () => {
  it("signs a revision that verifies publicly and fails when tampered", async () => {
    const owner = await signedInUser("Approver", "Sign Co");
    const id = await productFor(owner);
    await owner.c.call("PUT", `/products/${id}/plan`, { plan: examplePlan(), version: 1 });
    const issued = await owner.c.post<{ rev: string; fingerprint: string; statement: Record<string, unknown>; signature: Record<string, unknown> }>(`/products/${id}/revisions`, {
      summary: "First issue",
    });
    expect(issued.status).toBe(201);
    expect(issued.data.rev).toBe("A");
    expect(issued.data.fingerprint).toMatch(/^[0-9a-f]{128}$/);
    expect(issued.data.signature.alg).toBe("Ed25519+ML-DSA-65");

    const anyone = new TestClient(undefined, "192.0.2.150");
    const ok = await anyone.post<{ valid: boolean; recorded: boolean }>("/verify", { statement: issued.data.statement, signature: issued.data.signature });
    expect(ok.data).toMatchObject({ valid: true, recorded: true });
    const forged = await anyone.post<{ valid: boolean }>("/verify", { statement: { ...issued.data.statement, rev: "B" }, signature: issued.data.signature });
    expect(forged.data.valid).toBe(false);

    const again = await owner.c.post(`/products/${id}/revisions`, { summary: "No change" });
    expect(again.status).toBe(400);
    const list = await owner.c.get<{ revisions: { rev: string }[] }>(`/products/${id}/revisions`);
    expect(list.data.revisions.map((r) => r.rev)).toEqual(["A"]);
    const plan = await owner.c.get<{ plan: { revisions: { rev: string; hash: string }[] } }>(`/products/${id}/plan`);
    expect(plan.data.plan.revisions[0]).toMatchObject({ rev: "A", hash: issued.data.fingerprint });
  });

  it("keeps revision history server-owned", async () => {
    const owner = await signedInUser("History", "Hist Co");
    const id = await productFor(owner);
    const forged = { ...examplePlan(), revisions: [{ rev: "A", date: "2026-01-01", summary: "fake", hash: "a".repeat(128), approver: "Mallory" }] };
    await owner.c.call("PUT", `/products/${id}/plan`, { plan: forged, version: 1 });
    const back = await owner.c.get<{ plan: { revisions: unknown[] } }>(`/products/${id}/plan`);
    expect(back.data.plan.revisions).toEqual([]);
  });
});

describe("release records, incidents and evidence", () => {
  const allNo = () =>
    Object.fromEntries(
      ["scanningInPipeline", "noOpenCriticalHigh", "fixesReportedVuln", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "A1", "A2"].map((k) => [k, "no"]),
    );

  it("records a complete release gate result", async () => {
    const owner = await signedInUser("Releaser", "Rel Co");
    const id = await productFor(owner);
    const partial = await owner.c.post(`/products/${id}/releases`, { versionLabel: "1.0", ticket: "", answers: { T1: "yes" }, notes: {} });
    expect(partial.status).toBe(400);
    const answers = { ...allNo(), scanningInPipeline: "yes", noOpenCriticalHigh: "yes", T2: "yes" };
    const saved = await owner.c.post<{ results: { id: string; outcome: string }[] }>(`/products/${id}/releases`, { versionLabel: "1.0", ticket: "CHG-1", answers, notes: { T2: "New API" } });
    expect(saved.status).toBe(201);
    expect(saved.data.results.find((r) => r.id === "level2")?.outcome).toBe("required");
    const list = await owner.c.get<{ releases: { version: string; triggers: { id: string; note: string }[] }[] }>(`/products/${id}/releases`);
    expect(list.data.releases[0]).toMatchObject({ version: "1.0", triggers: [{ id: "T2", note: "New API" }] });
  });

  it("opens and updates an incident, refusing future times", async () => {
    const owner = await signedInUser("Responder", "Inc Co");
    const id = await productFor(owner);
    const aware = Date.now() - 2 * 3600_000;
    const created = await owner.c.post<Created>(`/products/${id}/incidents`, { kind: "vulnerability", awareAt: aware, data: { title: "Exploited auth bypass" } });
    expect(created.status).toBe(201);
    const future = await owner.c.patch(`/products/${id}/incidents/${created.data.id}`, { times: { earlyWarningAt: Date.now() + 3600_000 } });
    expect(future.status).toBe(400);
    const done = await owner.c.patch<{ times: { earlyWarningAt: number } }>(`/products/${id}/incidents/${created.data.id}`, { times: { earlyWarningAt: aware + 3600_000 } });
    expect(done.data.times.earlyWarningAt).toBe(aware + 3600_000);
  });

  it("stores case details, including overrides, and clears them with empty values", async () => {
    const owner = await signedInUser("Case Owner", "Case Co");
    const id = await productFor(owner);
    const created = await owner.c.post<Created>(`/products/${id}/incidents`, { kind: "incident", awareAt: Date.now() - 3600_000, data: { title: "Ransomware on build server" } });
    const url = `/products/${id}/incidents/${created.data.id}`;
    type Data = { data: Record<string, unknown> };
    const set = await owner.c.patch<Data>(url, { data: { manufacturer: "Acme GmbH", memberState: "Germany", contact: "sec@acme.example", suspectedMalicious: true, summary: "Encrypted build hosts" } });
    expect(set.status).toBe(200);
    expect(set.data.data).toMatchObject({ manufacturer: "Acme GmbH", memberState: "Germany", suspectedMalicious: true, title: "Ransomware on build server" });
    const cleared = await owner.c.patch<Data>(url, { data: { manufacturer: "", suspectedMalicious: null } });
    expect(cleared.data.data.manufacturer).toBeUndefined();
    expect(cleared.data.data.suspectedMalicious).toBeUndefined();
    expect(cleared.data.data).toMatchObject({ memberState: "Germany", summary: "Encrypted build hosts", title: "Ransomware on build server" });
    expect((await owner.c.patch(url, { data: { title: "" } })).status).toBe(400);
  });

  it("exports a signed evidence bundle that verifies and detects edits", async () => {
    const owner = await signedInUser("Exporter", "Exp Co");
    const id = await productFor(owner);
    const res = await owner.c.post<unknown>(`/products/${id}/export`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="readyline-evidence-/);
    const out = (typeof res.data === "string" ? JSON.parse(res.data) : res.data) as { manifest: Record<string, unknown>; signature: unknown; bundle: Record<string, unknown> };
    const anyone = new TestClient(undefined, "192.0.2.151");
    const ok = await anyone.post<{ valid: boolean; recorded: boolean; bundleMatches: boolean }>("/verify", { statement: out.manifest, signature: out.signature, bundle: out.bundle });
    expect(ok.data).toMatchObject({ valid: true, recorded: true, bundleMatches: true });
    const edited = await anyone.post<{ bundleMatches: boolean }>("/verify", { statement: out.manifest, signature: out.signature, bundle: { ...out.bundle, product: { id, name: "Edited" } } });
    expect(edited.data.bundleMatches).toBe(false);
  });
});

describe("leads and admin", () => {
  it("accepts leads, drops honeypot submissions and hides admin from non-admins", async () => {
    const anon = new TestClient(undefined, "192.0.2.160");
    const lead = await anon.post("/leads", { name: "Ana", email: "ana@example.com", company: "Acme", plan: "Starter" });
    expect(lead.status).toBe(202);
    const bot = await anon.post("/leads", { name: "Bot", email: "bot@example.com", company: "Spam", website: "http://spam.example" });
    expect(bot.status).toBe(202);
    const rows = get<{ n: number }>("SELECT COUNT(*) AS n FROM leads")!.n;
    expect(rows).toBeGreaterThanOrEqual(1);
    const stored = JSON.stringify(get("SELECT * FROM leads ORDER BY created_at DESC LIMIT 1"));
    expect(stored).not.toContain("ana@example.com");
    const user = await signedInUser("Not Admin", "Co");
    expect((await user.c.get("/admin/leads")).status).toBe(404);
    expect((await anon.get("/admin/leads")).status).toBe(401);
  });

  it("serves the public signing keys", async () => {
    const keys = await new TestClient().get<{ kid: string; mldsa65: string }>("/keys");
    expect(keys.data.kid).toBeTruthy();
    expect(keys.data.mldsa65).toContain("BEGIN PUBLIC KEY");
  });
});
