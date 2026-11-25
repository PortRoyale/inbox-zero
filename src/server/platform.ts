import { config } from "@/server/config";
import { ipHash } from "@/server/crypto/secrets";
import { get, now, run } from "@/server/db";

// Rate limiting, audit logging and outbound email. No external services required in development.

export function rateLimit(key: string, limit: number, windowSeconds: number) {
  const windowStart = Math.floor(now() / (windowSeconds * 1000)) * windowSeconds * 1000;
  run(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($key, $ws, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN window_start = $ws THEN count + 1 ELSE 1 END,
       window_start = $ws`,
    { key, ws: windowStart },
  );
  const row = get<{ count: number }>("SELECT count FROM rate_limits WHERE key = $key", { key });
  return { allowed: (row?.count ?? 1) <= limit, retryAfter: windowSeconds };
}

export function audit(entry: {
  orgId?: string | null;
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, string | number | boolean | null>;
  ip?: string | null;
}) {
  run(
    `INSERT INTO audit_log (org_id, user_id, action, target_type, target_id, meta_json, ip_hash, created_at)
     VALUES ($org, $user, $action, $tt, $tid, $meta, $ip, $at)`,
    {
      org: entry.orgId ?? null,
      user: entry.userId ?? null,
      action: entry.action,
      tt: entry.targetType ?? "",
      tid: entry.targetId ?? "",
      meta: JSON.stringify(entry.meta ?? {}),
      ip: ipHash(entry.ip),
      at: now(),
    },
  );
}

export type Mail = { to: string; subject: string; text: string };

const g = globalThis as unknown as { __rlOutbox?: Mail[] };

// Sends through Resend or Postmark over HTTPS when configured; otherwise logs (development) and
// keeps an in-memory outbox (tests). Never logs message bodies in production.
export async function sendMail(mail: Mail) {
  const c = config();
  if (c.resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${c.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: c.mailFrom, to: [mail.to], subject: mail.subject, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Email provider error ${res.status}`);
    return;
  }
  if (c.postmarkToken) {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: { "X-Postmark-Server-Token": c.postmarkToken, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ From: c.mailFrom, To: mail.to, Subject: mail.subject, TextBody: mail.text, MessageStream: "outbound" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Email provider error ${res.status}`);
    return;
  }
  if (c.isProd) throw new Error("No email provider configured (set RESEND_API_KEY or POSTMARK_SERVER_TOKEN)");
  g.__rlOutbox ??= [];
  g.__rlOutbox.push(mail);
  if (!c.isTest) console.info(`[mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
}

export function testOutbox() {
  return g.__rlOutbox ?? [];
}
