import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { examplePlan } from "@/lib/plan/model";
import { resetConfigForTests } from "@/server/config";
import { run } from "@/server/db";
import { signedInUser, TestClient } from "@/server/test/client";

const KEY = "finix-signing-key-for-tests";
let server: ReturnType<typeof createServer>;
const requests: { auth: string; version: string; body: Record<string, unknown> }[] = [];

beforeAll(async () => {
  server = createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    requests.push({ auth: String(req.headers.authorization), version: String(req.headers["finix-version"]), body: JSON.parse(raw || "{}") });
    res.setHeader("Content-Type", "application/hal+json");
    res.end(JSON.stringify({ id: `checkout_form_${requests.length}`, state: "ACTIVE", link_url: "https://checkout.example.test/form", link_expires_at: "2026-12-01T00:00:00Z" }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  Object.assign(process.env, {
    BILLING_PROVIDER: "finix",
    FINIX_API_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    FINIX_USERNAME: "USexample",
    FINIX_PASSWORD: "secret-password",
    FINIX_MERCHANT_ID: "MUexample",
    FINIX_WEBHOOK_SIGNING_KEY: KEY,
  });
  resetConfigForTests();
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

function signed(body: unknown, key = KEY, ts = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(body);
  const sig = createHmac("sha256", key).update(`${ts}:${raw}`).digest("hex");
  return { raw, header: `timestamp=${ts}, sig=${sig}` };
}

const completed = (formId: string, orgId: string, tier = "starter") => ({
  id: `event_${formId}`,
  type: "updated",
  entity: "checkout_form",
  _embedded: { checkout_forms: [{ id: formId, state: "COMPLETED", tags: { org_id: orgId, tier } }] },
});

async function postWebhook(raw: string, header: string) {
  return new TestClient(undefined, "192.0.2.180").call("POST", "/billing/webhook/finix", raw, { origin: "", "finix-signature": header, "content-type": "application/json" });
}

describe("Finix billing", () => {
  it("creates a hosted checkout for owners only, with the team tagged", async () => {
    const owner = await signedInUser("Payer", "Pay Co");
    const res = await owner.c.post<{ url: string }>(`/orgs/${owner.orgId}/billing/checkout`, { tier: "starter" });
    expect(res.status).toBe(200);
    expect(res.data.url).toBe("https://checkout.example.test/form");
    const sent = requests[requests.length - 1];
    expect(sent.auth).toBe(`Basic ${Buffer.from("USexample:secret-password").toString("base64")}`);
    expect(sent.version).toBe("2022-02-01");
    expect(sent.body).toMatchObject({ merchant_id: "MUexample", amount_details: { total_amount: 178800 }, tags: { org_id: owner.orgId, tier: "starter" } });
  });

  it("activates a year only for a correctly signed, completed checkout, exactly once", async () => {
    const owner = await signedInUser("Payer Two", "Pay Two");
    await owner.c.post(`/orgs/${owner.orgId}/billing/checkout`, { tier: "team" });
    const formId = `checkout_form_${requests.length}`;

    const forged = signed(completed(formId, owner.orgId, "team"), "wrong-key");
    expect((await postWebhook(forged.raw, forged.header)).status).toBe(401);
    const stale = signed(completed(formId, owner.orgId, "team"), KEY, Math.floor(Date.now() / 1000) - 3600);
    expect((await postWebhook(stale.raw, stale.header)).status).toBe(401);
    const otherForm = signed(completed("checkout_form_not_ours", owner.orgId, "team"));
    expect((await postWebhook(otherForm.raw, otherForm.header)).data).toMatchObject({ handled: 0 });

    const good = signed(completed(formId, owner.orgId, "team"));
    expect((await postWebhook(good.raw, good.header)).data).toMatchObject({ handled: 1 });
    expect((await postWebhook(good.raw, good.header)).data).toMatchObject({ handled: 0 });

    const status = await owner.c.get<{ state: string; tier: string; paidUntil: number }>(`/orgs/${owner.orgId}/billing`);
    expect(status.data).toMatchObject({ state: "active", tier: "team" });
    expect(status.data.paidUntil - Date.now()).toBeGreaterThan(364 * 86_400_000);
  });

  it("refuses checkout to non-owners", async () => {
    const owner = await signedInUser("Owner Three", "Three Co");
    const outsider = await signedInUser("Not Owner", "Else");
    expect((await outsider.c.post(`/orgs/${owner.orgId}/billing/checkout`, { tier: "starter" })).status).toBe(404);
  });

  it("makes a lapsed team read-only but keeps incidents and exports working", async () => {
    const owner = await signedInUser("Lapsed", "Lapsed Co");
    const p = await owner.c.post<{ id: string }>(`/orgs/${owner.orgId}/products`, { name: "Old" });
    run("UPDATE orgs SET created_at = $t WHERE id = $id", { id: owner.orgId, t: Date.now() - 20 * 86_400_000 });
    const save = await owner.c.call("PUT", `/products/${p.data.id}/plan`, { plan: examplePlan(), version: 1 });
    expect(save.status).toBe(402);
    expect(save.data.error).toMatch(/read-only/);
    expect((await owner.c.get(`/products/${p.data.id}/plan`)).status).toBe(200);
    const inc = await owner.c.post(`/products/${p.data.id}/incidents`, { kind: "incident", awareAt: Date.now() - 60_000, data: { title: "Outage" } });
    expect(inc.status).toBe(201);
    expect((await owner.c.post(`/products/${p.data.id}/export`)).status).toBe(200);
  });
});
