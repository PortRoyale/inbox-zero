import { createHmac } from "node:crypto";
import { config, type BillingConfig } from "@/server/config";
import { open } from "@/server/crypto/envelope";
import { safeEqual } from "@/server/crypto/secrets";
import { all, get, now, run, tx } from "@/server/db";
import { HttpError, badRequest } from "@/server/errors";
import { audit, sendMail } from "@/server/platform";
import { requireOrg, TIERS, TRIAL_DAYS, type Tier } from "@/server/services/orgs";

// Billing with Finix (preferred) or Stripe, over plain HTTPS (no SDKs).
// Finix: an annual prepayment through a hosted Checkout Form; the team is paid up for one year.
// Stripe: a monthly subscription through Stripe Checkout, managed in the Stripe customer portal.
// Entitlement: an active paid period, or a 14-day trial from team creation. Lapsed teams are read-only.

const DAY = 86_400_000;
const YEAR_MS = 365 * DAY;
const SIGNATURE_TOLERANCE_S = 300;

type BillingRow = {
  org_id: string;
  provider: "finix" | "stripe" | "manual";
  tier: Tier;
  status: "pending" | "active" | "past_due" | "canceled" | "expired";
  customer_ref: string | null;
  subscription_ref: string | null;
  checkout_ref: string | null;
  paid_until: number | null;
  reminded_at: number | null;
  updated_at: number;
};

export type Entitlement = {
  state: "trial" | "active" | "past_due" | "lapsed";
  tier: Tier;
  trialEndsAt: number;
  paidUntil: number | null;
  provider: BillingRow["provider"] | null;
  canWrite: boolean;
};

export function entitlement(orgId: string): Entitlement {
  const org = get<{ created_at: number; tier: Tier }>("SELECT created_at, tier FROM orgs WHERE id = $id", { id: orgId });
  if (!org) throw new HttpError(404, "Not found.");
  const b = get<BillingRow>("SELECT * FROM billing WHERE org_id = $id", { id: orgId });
  const trialEndsAt = org.created_at + TRIAL_DAYS * DAY;
  const t = now();
  if (b && (b.status === "active" || b.status === "past_due") && (b.paid_until === null || b.paid_until > t)) {
    return { state: b.status === "past_due" ? "past_due" : "active", tier: b.tier, trialEndsAt, paidUntil: b.paid_until, provider: b.provider, canWrite: true };
  }
  // The trial includes every Team feature (see effectiveTier in orgs.ts).
  if (t < trialEndsAt) return { state: "trial", tier: "team", trialEndsAt, paidUntil: null, provider: b?.provider ?? null, canWrite: true };
  return { state: "lapsed", tier: org.tier, trialEndsAt, paidUntil: b?.paid_until ?? null, provider: b?.provider ?? null, canWrite: false };
}

/** Throws 402 when a lapsed team tries to change data. Reading and exporting stay available. */
export function requireWritable(orgId: string) {
  if (!entitlement(orgId).canWrite) throw new HttpError(402, "Your trial or plan has ended, so this workspace is read-only. Choose a plan to keep editing; you can still read and export everything.");
}

function setPaid(orgId: string, patch: Partial<Omit<BillingRow, "org_id">> & { provider: BillingRow["provider"]; tier: Tier; status: BillingRow["status"] }) {
  const existing = get<BillingRow>("SELECT * FROM billing WHERE org_id = $id", { id: orgId });
  const row: BillingRow = {
    org_id: orgId,
    customer_ref: null,
    subscription_ref: null,
    checkout_ref: null,
    paid_until: null,
    reminded_at: null,
    ...existing,
    ...patch,
    updated_at: now(),
  };
  run(
    `INSERT INTO billing (org_id, provider, tier, status, customer_ref, subscription_ref, checkout_ref, paid_until, reminded_at, updated_at)
     VALUES ($o, $p, $t, $s, $c, $sub, $co, $pu, $r, $u)
     ON CONFLICT(org_id) DO UPDATE SET provider = $p, tier = $t, status = $s, customer_ref = $c, subscription_ref = $sub, checkout_ref = $co, paid_until = $pu, reminded_at = $r, updated_at = $u`,
    { o: orgId, p: row.provider, t: row.tier, s: row.status, c: row.customer_ref, sub: row.subscription_ref, co: row.checkout_ref, pu: row.paid_until, r: row.reminded_at, u: row.updated_at },
  );
  if (row.status === "active" || row.status === "past_due") run("UPDATE orgs SET tier = $t WHERE id = $o", { o: orgId, t: row.tier });
}

/** Superadmin: an invoiced or complimentary plan, optionally until a date. */
export function grantManual(actorId: string, orgId: string, tier: Tier, until: number | null) {
  setPaid(orgId, { provider: "manual", tier, status: "active", paid_until: until });
  audit({ orgId, userId: actorId, action: "billing.manual_grant", meta: { tier, until: until ?? 0 } });
}

export function billingStatus(userId: string, orgId: string) {
  const org = requireOrg(userId, orgId, "viewer");
  const b = get<BillingRow>("SELECT * FROM billing WHERE org_id = $id", { id: orgId });
  const provider = config().billing.provider;
  const c = config().billing;
  const money = (amount: number, currency: string) => new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  const prices =
    c.provider === "finix"
      ? { starter: `${money(c.prices.starter / 100, c.currency)}/year`, team: `${money(c.prices.team / 100, c.currency)}/year` }
      : { starter: "€149/month", team: "€499/month" };
  return {
    ...entitlement(orgId),
    prices,
    status: b?.status ?? null,
    checkoutAvailable: provider !== "none",
    checkoutProvider: provider,
    period: provider === "finix" ? "year" : "month",
    canManage: org.role === "owner",
    portalAvailable: provider === "stripe" && !!b?.customer_ref,
  };
}

// ---------- Checkout ----------

async function finixRequest(c: Extract<BillingConfig, { provider: "finix" }>, method: string, path: string, body?: unknown) {
  const res = await fetch(`${c.apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${c.username}:${c.password}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/hal+json",
      "Finix-Version": "2022-02-01",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new HttpError(502, `The payment provider refused the request (${res.status}). Try again or email us.`);
  return data;
}

async function stripeRequest(c: Extract<BillingConfig, { provider: "stripe" }>, path: string, params: Record<string, string>) {
  const res = await fetch(`${c.apiUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new HttpError(502, `The payment provider refused the request (${res.status}). Try again or email us.`);
  return data;
}

const TIER_LABEL: Record<Tier, string> = { starter: "Readyline Starter", team: "Readyline Team" };

// The trial includes Team features, so a team can outgrow Starter before it pays. Say exactly what
// to change instead of charging for a plan that would leave part of the workspace over its limits.
function assertFitsStarter(orgId: string) {
  const limits = TIERS.starter;
  const products = get<{ n: number }>("SELECT count(*) AS n FROM products WHERE org_id = $o AND archived_at IS NULL", { o: orgId })!.n;
  const people = get<{ n: number }>("SELECT count(*) AS n FROM memberships WHERE org_id = $o", { o: orgId })!.n;
  const invites = get<{ n: number }>("SELECT count(*) AS n FROM invites WHERE org_id = $o AND accepted_at IS NULL AND expires_at > $t", { o: orgId, t: now() })!.n;
  const teamRoles = get<{ n: number }>("SELECT count(*) AS n FROM memberships WHERE org_id = $o AND role IN ('admin', 'approver')", { o: orgId })!.n;
  const fixes: string[] = [];
  if (products > limits.products) fixes.push(`archive ${products - limits.products} of your ${products} products`);
  if (people + invites > limits.members) fixes.push(`bring the team to ${limits.members} people including open invitations (now ${people + invites})`);
  if (teamRoles > 0) fixes.push(`change ${teamRoles} admin or approver role${teamRoles > 1 ? "s" : ""} to editor`);
  if (fixes.length) throw badRequest(`Starter covers ${limits.products} product and ${limits.members} people. To choose it, first ${fixes.join(", ")}. Or choose Team.`);
}

export async function startCheckout(user: { id: string; email: string; name: string }, orgId: string, tier: Tier) {
  const org = requireOrg(user.id, orgId, "owner");
  if (tier === "starter") assertFitsStarter(orgId);
  const c = config().billing;
  const app = config().appUrl;
  const success = `${app}/app/account/?billing=success&org=${orgId}`;
  const cancel = `${app}/app/account/?billing=cancelled&org=${orgId}`;
  if (c.provider === "none") throw new HttpError(503, "Online payment is not set up yet. Email us and we will invoice you.");

  if (c.provider === "finix") {
    const amount = c.prices[tier];
    const [first, ...rest] = user.name.trim().split(/\s+/);
    const form = await finixRequest(c, "POST", "/checkout_forms", {
      merchant_id: c.merchantId,
      payment_frequency: "ONE_TIME",
      is_multiple_use: false,
      allowed_payment_methods: ["PAYMENT_CARD"],
      nickname: `${TIER_LABEL[tier]}, 12 months`,
      items: [{ description: `${TIER_LABEL[tier]} for ${org.name}, 12 months prepaid`, price_details: { sale_amount: amount, currency: c.currency, price_type: "REGULAR", regular_amount: amount }, quantity: "1" }],
      buyer: { first_name: first || user.name, last_name: rest.join(" "), email: user.email },
      amount_details: { amount_type: "FIXED", total_amount: amount, currency: c.currency },
      additional_details: {
        collect_name: true,
        collect_email: true,
        collect_billing_address: true,
        success_return_url: success,
        cart_return_url: cancel,
        expired_session_url: cancel,
        terms_of_service_url: c.termsUrl,
        expiration_in_minutes: 60,
      },
      tags: { org_id: orgId, tier },
    });
    const id = String(form.id ?? "");
    const url = String(form.link_url ?? "");
    if (!id || !/^https:\/\//.test(url)) throw new HttpError(502, "The payment provider did not return a checkout link.");
    setPaid(orgId, { ...pendingFrom(orgId), provider: "finix", tier, checkout_ref: id });
    audit({ orgId, userId: user.id, action: "billing.checkout_started", meta: { provider: "finix", tier } });
    return { url };
  }

  const params: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": c.prices[tier],
    "line_items[0][quantity]": "1",
    success_url: success,
    cancel_url: cancel,
    client_reference_id: orgId,
    customer_email: user.email,
    "metadata[org_id]": orgId,
    "metadata[tier]": tier,
    "subscription_data[metadata][org_id]": orgId,
    "subscription_data[metadata][tier]": tier,
    allow_promotion_codes: "true",
    billing_address_collection: "required",
    "tax_id_collection[enabled]": "true",
  };
  if (c.automaticTax) params["automatic_tax[enabled]"] = "true";
  const existing = get<BillingRow>("SELECT * FROM billing WHERE org_id = $id", { id: orgId });
  if (existing?.customer_ref) {
    delete params.customer_email;
    params.customer = existing.customer_ref;
  }
  const session = await stripeRequest(c, "/v1/checkout/sessions", params);
  const url = String(session.url ?? "");
  if (!/^https:\/\//.test(url)) throw new HttpError(502, "The payment provider did not return a checkout link.");
  audit({ orgId, userId: user.id, action: "billing.checkout_started", meta: { provider: "stripe", tier } });
  return { url };
}

// Keeps an active plan active while a new checkout is pending (e.g. an upgrade).
function pendingFrom(orgId: string): { status: BillingRow["status"] } {
  const b = get<BillingRow>("SELECT status, paid_until FROM billing WHERE org_id = $id", { id: orgId });
  return { status: b && (b.status === "active" || b.status === "past_due") && (b.paid_until === null || b.paid_until > now()) ? b.status : "pending" };
}

export async function portalUrl(userId: string, orgId: string) {
  requireOrg(userId, orgId, "owner");
  const c = config().billing;
  const b = get<BillingRow>("SELECT * FROM billing WHERE org_id = $id", { id: orgId });
  if (c.provider !== "stripe" || !b?.customer_ref) throw badRequest("There is no subscription to manage yet.");
  const session = await stripeRequest(c, "/v1/billing_portal/sessions", { customer: b.customer_ref, return_url: `${config().appUrl}/app/account/` });
  return { url: String(session.url ?? "") };
}

// ---------- Webhooks ----------

function firstOnce(provider: string, eventId: string, type: string, orgId: string | null) {
  const res = run("INSERT INTO billing_events (provider, event_id, org_id, type, received_at) VALUES ($p, $e, $o, $t, $r) ON CONFLICT DO NOTHING", {
    p: provider,
    e: eventId,
    o: orgId,
    t: type,
    r: now(),
  });
  return Number(res.changes) === 1;
}

function parseSignatureHeader(header: string) {
  const out: Record<string, string[]> = {};
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim().toLowerCase();
    (out[k] ??= []).push(part.slice(i + 1).trim());
  }
  return out;
}

function freshTimestamp(ts: string | undefined) {
  const n = Number(ts);
  return Number.isFinite(n) && Math.abs(now() / 1000 - n) <= SIGNATURE_TOLERANCE_S;
}

/** Finix: Finix-Signature carries a timestamp and an HMAC-SHA256 (hex) of "<timestamp>:<raw body>". */
export function verifyFinixSignature(rawBody: string, header: string | null, key: string) {
  if (!header) return false;
  const parts = parseSignatureHeader(header);
  const ts = (parts.timestamp ?? parts.t)?.[0];
  const sigs = [...(parts.sig ?? []), ...(parts.signature ?? []), ...(parts.v1 ?? [])].map((s) => s.toLowerCase());
  if (!freshTimestamp(ts) || !sigs.length) return false;
  const expected = createHmac("sha256", key).update(`${ts}:${rawBody}`, "utf8").digest("hex");
  return sigs.some((s) => safeEqual(s, expected));
}

/** Stripe: Stripe-Signature "t=<ts>,v1=<hex>" over "<ts>.<raw body>" with the endpoint secret. */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = parseSignatureHeader(header);
  const ts = parts.t?.[0];
  if (!freshTimestamp(ts) || !parts.v1?.length) return false;
  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`, "utf8").digest("hex");
  return parts.v1.some((s) => safeEqual(s, expected));
}

type Obj = Record<string, unknown>;
const o = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
function parseEvent(rawBody: string) {
  try {
    return o(JSON.parse(rawBody));
  } catch {
    throw badRequest("Invalid JSON.");
  }
}

const tierOf = (v: unknown): Tier | null => (v === "starter" || v === "team" ? v : null);
const orgExists = (id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id) && !!get("SELECT 1 FROM orgs WHERE id = $id", { id });

export async function handleFinixWebhook(rawBody: string, headers: Headers) {
  const c = config().billing;
  if (c.provider !== "finix") throw new HttpError(404, "Not found.");
  if (c.webhookBearer && !safeEqual(headers.get("authorization") ?? "", `Bearer ${c.webhookBearer}`)) throw new HttpError(401, "Unauthorised.");
  if (!verifyFinixSignature(rawBody, headers.get("finix-signature"), c.webhookKey)) throw new HttpError(401, "Bad signature.");
  const event = parseEvent(rawBody);
  const eventId = String(event.id ?? "");
  const embedded = o(event._embedded);
  const forms = Array.isArray(embedded.checkout_forms) ? embedded.checkout_forms.map(o) : [];
  const handled: string[] = [];
  for (const form of forms) {
    const tags = o(form.tags);
    const orgId = tags.org_id;
    const tier = tierOf(tags.tier);
    if (!orgExists(orgId) || !tier) continue;
    const formId = String(form.id ?? "");
    const b = get<BillingRow>("SELECT * FROM billing WHERE org_id = $id", { id: orgId as string });
    // Only the checkout we created for this team counts, and only once it is completed.
    if (form.state !== "COMPLETED" || !b || b.checkout_ref !== formId) continue;
    if (!firstOnce("finix", `${eventId || "form"}:${formId}`, "checkout_form.completed", orgId as string)) continue;
    tx(() => {
      const base = b.paid_until && b.paid_until > now() && b.tier === tier ? b.paid_until : now();
      setPaid(orgId as string, { provider: "finix", tier, status: "active", paid_until: base + YEAR_MS, reminded_at: null, checkout_ref: formId });
    });
    audit({ orgId: orgId as string, action: "billing.paid", meta: { provider: "finix", tier } });
    handled.push(formId);
  }
  return { received: true, handled: handled.length };
}

export async function handleStripeWebhook(rawBody: string, headers: Headers) {
  const c = config().billing;
  if (c.provider !== "stripe") throw new HttpError(404, "Not found.");
  if (!verifyStripeSignature(rawBody, headers.get("stripe-signature"), c.webhookSecret)) throw new HttpError(401, "Bad signature.");
  const event = parseEvent(rawBody);
  const type = String(event.type ?? "");
  const obj = o(o(event.data).object);
  const meta = o(obj.metadata);
  const orgId = (meta.org_id ?? obj.client_reference_id) as string | undefined;
  if (!orgExists(orgId)) return { received: true, handled: 0 };
  if (!firstOnce("stripe", String(event.id ?? ""), type, orgId!)) return { received: true, handled: 0, duplicate: true };
  const tier = tierOf(meta.tier) ?? get<{ tier: Tier }>("SELECT tier FROM billing WHERE org_id = $id", { id: orgId! })?.tier ?? "starter";

  if (type === "checkout.session.completed") {
    setPaid(orgId!, { provider: "stripe", tier, status: "active", customer_ref: String(obj.customer ?? "") || null, subscription_ref: String(obj.subscription ?? "") || null, paid_until: null });
  } else if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
    const status = String(obj.status ?? "");
    const mapped: BillingRow["status"] = status === "active" || status === "trialing" ? "active" : status === "past_due" || status === "unpaid" ? "past_due" : status === "canceled" ? "canceled" : "pending";
    const items = o(obj.items).data;
    const periodEnd = Number(obj.current_period_end ?? (Array.isArray(items) ? o(items[0]).current_period_end : undefined));
    setPaid(orgId!, {
      provider: "stripe",
      tier,
      status: mapped,
      customer_ref: String(obj.customer ?? "") || null,
      subscription_ref: String(obj.id ?? "") || null,
      paid_until: Number.isFinite(periodEnd) && periodEnd > 0 ? periodEnd * 1000 + 3 * DAY : null,
    });
  } else if (type === "customer.subscription.deleted") {
    setPaid(orgId!, { provider: "stripe", tier, status: "canceled", paid_until: now() });
  } else if (type === "invoice.payment_failed") {
    setPaid(orgId!, { provider: "stripe", tier, status: "past_due" });
  } else {
    return { received: true, handled: 0 };
  }
  audit({ orgId: orgId!, action: "billing.updated", meta: { provider: "stripe", type } });
  return { received: true, handled: 1 };
}

// ---------- Daily job: renewal reminders and expiry for prepaid plans ----------

export async function billingSweep() {
  const t = now();
  let reminded = 0;
  let expired = 0;
  const due = all<BillingRow>("SELECT * FROM billing WHERE status = 'active' AND paid_until IS NOT NULL");
  for (const b of due) {
    if (b.paid_until! <= t) {
      run("UPDATE billing SET status = 'expired', updated_at = $t WHERE org_id = $o", { o: b.org_id, t });
      audit({ orgId: b.org_id, action: "billing.expired" });
      expired++;
      continue;
    }
    if (b.provider === "finix" && b.paid_until! - t <= 14 * DAY && !b.reminded_at) {
      const owners = all<{ id: string; email_sealed: string }>(
        "SELECT u.id, u.email_sealed FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = $o AND m.role = 'owner'",
        { o: b.org_id },
      );
      for (const u of owners) {
        await sendMail({
          to: open<string>(u.email_sealed, `user:${u.id}:email`),
          subject: "Your Readyline plan renews in 14 days",
          text: `Your prepaid plan runs until ${new Date(b.paid_until!).toISOString().slice(0, 10)}. Renew it from ${config().appUrl}/app/account/ to keep editing. Reading and exporting always stay available.`,
        }).catch(() => {});
      }
      run("UPDATE billing SET reminded_at = $t WHERE org_id = $o", { o: b.org_id, t });
      reminded++;
    }
  }
  return { reminded, expired };
}
