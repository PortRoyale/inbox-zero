import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetConfigForTests } from "@/server/config";
import { signedInUser, TestClient } from "@/server/test/client";

const SECRET = "whsec_test_secret";
let server: ReturnType<typeof createServer>;
const requests: { path: string; auth: string; form: URLSearchParams }[] = [];

beforeAll(async () => {
  server = createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    requests.push({ path: String(req.url), auth: String(req.headers.authorization), form: new URLSearchParams(raw) });
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(req.url === "/v1/billing_portal/sessions" ? { url: "https://billing.stripe.example/p/session" } : { id: "cs_test_1", url: "https://checkout.stripe.example/c/pay/cs_test_1" }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  Object.assign(process.env, {
    BILLING_PROVIDER: "stripe",
    STRIPE_API_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: SECRET,
    STRIPE_PRICE_STARTER: "price_starter",
    STRIPE_PRICE_TEAM: "price_team",
  });
  resetConfigForTests();
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

function stripeEvent(id: string, type: string, object: Record<string, unknown>, secret = SECRET) {
  const raw = JSON.stringify({ id, type, data: { object } });
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return new TestClient(undefined, "192.0.2.190").call("POST", "/billing/webhook/stripe", raw, { origin: "", "stripe-signature": `t=${t},v1=${sig}`, "content-type": "application/json" });
}

describe("Stripe billing", () => {
  it("starts a subscription checkout carrying the team id", async () => {
    const owner = await signedInUser("Stripe Owner", "Stripe Co");
    const res = await owner.c.post<{ url: string }>(`/orgs/${owner.orgId}/billing/checkout`, { tier: "team" });
    expect(res.data.url).toMatch(/^https:\/\/checkout\.stripe\.example/);
    const sent = requests[requests.length - 1];
    expect(sent.auth).toBe("Bearer sk_test_123");
    expect(Object.fromEntries(sent.form)).toMatchObject({ mode: "subscription", "line_items[0][price]": "price_team", client_reference_id: owner.orgId, "subscription_data[metadata][org_id]": owner.orgId });
  });

  it("applies verified subscription events once and tracks status changes", async () => {
    const owner = await signedInUser("Stripe Two", "Stripe Two Co");
    expect((await stripeEvent("evt_bad", "checkout.session.completed", { client_reference_id: owner.orgId, metadata: { org_id: owner.orgId, tier: "team" } }, "whsec_wrong")).status).toBe(401);

    const done = await stripeEvent("evt_1", "checkout.session.completed", { client_reference_id: owner.orgId, customer: "cus_1", subscription: "sub_1", metadata: { org_id: owner.orgId, tier: "team" } });
    expect(done.data).toMatchObject({ handled: 1 });
    expect((await stripeEvent("evt_1", "checkout.session.completed", { client_reference_id: owner.orgId, metadata: { org_id: owner.orgId, tier: "team" } })).data).toMatchObject({ handled: 0 });

    let status = await owner.c.get<{ state: string; tier: string; portalAvailable: boolean }>(`/orgs/${owner.orgId}/billing`);
    expect(status.data).toMatchObject({ state: "active", tier: "team", portalAvailable: true });

    await stripeEvent("evt_2", "invoice.payment_failed", { customer: "cus_1", metadata: { org_id: owner.orgId, tier: "team" } });
    status = await owner.c.get(`/orgs/${owner.orgId}/billing`);
    expect(status.data.state).toBe("past_due");

    await stripeEvent("evt_3", "customer.subscription.deleted", { id: "sub_1", customer: "cus_1", metadata: { org_id: owner.orgId, tier: "team" } });
    status = await owner.c.get(`/orgs/${owner.orgId}/billing`);
    expect(status.data.state).toBe("trial");

    const portal = await owner.c.post<{ url: string }>(`/orgs/${owner.orgId}/billing/portal`);
    expect(portal.data.url).toBe("https://billing.stripe.example/p/session");
  });

  it("ignores events for unknown teams", async () => {
    const res = await stripeEvent("evt_x", "checkout.session.completed", { client_reference_id: "00000000-0000-0000-0000-000000000000", metadata: {} });
    expect(res.data).toMatchObject({ handled: 0 });
  });
});
