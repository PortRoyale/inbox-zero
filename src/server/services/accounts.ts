import { config } from "@/server/config";
import { open, seal } from "@/server/crypto/envelope";
import { burnPasswordCheck, emailHash, hashPassword, passwordProblem, randomToken, tokenHash, verifyPassword } from "@/server/crypto/secrets";
import { all, get, newId, now, run, tx } from "@/server/db";
import { badRequest, HttpError, tooMany } from "@/server/errors";
import { audit, rateLimit, sendMail } from "@/server/platform";

const HOUR = 3_600_000;
const LOCK_AFTER = 10;
const LOCK_MS = 15 * 60_000;

type UserRow = {
  id: string;
  email_sealed: string;
  name_sealed: string;
  password_hash: string;
  email_verified_at: number | null;
  failed_logins: number;
  locked_until: number | null;
};

export type Profile = { id: string; email: string; name: string; emailVerified: boolean };

export function profileFromRow(r: Pick<UserRow, "id" | "email_sealed" | "name_sealed" | "email_verified_at">): Profile {
  return {
    id: r.id,
    email: open<string>(r.email_sealed, `user:${r.id}:email`),
    name: open<string>(r.name_sealed, `user:${r.id}:name`),
    emailVerified: r.email_verified_at !== null,
  };
}

// ---------- Sign-up and email verification ----------

export async function signup(input: { name: string; email: string; password: string; company: string }, ip: string | null) {
  if (!rateLimit(`signup:ip:${ip ?? "none"}`, 10, 3600).allowed) throw tooMany(3600);
  const problem = passwordProblem(input.password, input.email);
  if (problem) throw badRequest(problem);
  const hash = emailHash(input.email);
  const existing = get<{ id: string }>("SELECT id FROM users WHERE email_hash = $h", { h: hash });
  if (existing) {
    // Same response either way, so sign-up cannot be used to discover registered emails.
    await sendMail({
      to: input.email,
      subject: "Someone tried to create a Readyline account with your email",
      text: `An account with this email already exists. If this was you, sign in at ${config().appUrl}/login/ or reset your password at ${config().appUrl}/reset/.`,
    });
    audit({ userId: existing.id, action: "signup.duplicate", ip });
    return;
  }
  const passwordHash = await hashPassword(input.password);
  const userId = newId();
  const orgId = newId();
  const t = now();
  tx(() => {
    run(
      `INSERT INTO users (id, email_hash, email_sealed, name_sealed, password_hash, created_at)
       VALUES ($id, $h, $e, $n, $p, $t)`,
      { id: userId, h: hash, e: seal(input.email, `user:${userId}:email`), n: seal(input.name, `user:${userId}:name`), p: passwordHash, t },
    );
    run("INSERT INTO orgs (id, name_sealed, tier, created_at) VALUES ($id, $n, 'starter', $t)", {
      id: orgId,
      n: seal(input.company, `org:${orgId}:name`),
      t,
    });
    run("INSERT INTO memberships (org_id, user_id, role, created_at) VALUES ($o, $u, 'owner', $t)", { o: orgId, u: userId, t });
  });
  audit({ orgId, userId, action: "account.created", ip });
  await sendVerification(userId, input.email);
}

async function sendVerification(userId: string, email: string) {
  const token = issueToken(userId, "verify", 24 * HOUR);
  await sendMail({
    to: email,
    subject: "Confirm your Readyline account",
    text: `Confirm your email to start using Readyline:\n\n${config().appUrl}/verify/?token=${token}\n\nThe link expires in 24 hours. If you didn't sign up, ignore this email.`,
  });
}

export function verifyEmail(token: string, ip: string | null) {
  const userId = consumeToken(token, "verify");
  if (!userId) throw badRequest("This link is invalid or has expired. Sign in to get a new one.");
  run("UPDATE users SET email_verified_at = COALESCE(email_verified_at, $t) WHERE id = $id", { id: userId, t: now() });
  audit({ userId, action: "account.verified", ip });
  return userId;
}

export async function resendVerification(email: string, ip: string | null) {
  if (!rateLimit(`verify:ip:${ip ?? "none"}`, 5, 3600).allowed) throw tooMany(3600);
  const row = get<UserRow>("SELECT * FROM users WHERE email_hash = $h", { h: emailHash(email) });
  if (row && row.email_verified_at === null) await sendVerification(row.id, email);
}

// ---------- Login ----------

export async function login(email: string, password: string, ip: string | null) {
  const h = emailHash(email);
  if (!rateLimit(`login:ip:${ip ?? "none"}`, 30, 900).allowed || !rateLimit(`login:email:${h}`, 10, 900).allowed) throw tooMany(900);
  const row = get<UserRow>("SELECT * FROM users WHERE email_hash = $h", { h });
  if (!row) {
    await burnPasswordCheck(password);
    throw new HttpError(401, "Email or password is incorrect.");
  }
  if (row.locked_until && row.locked_until > now()) {
    await burnPasswordCheck(password);
    throw new HttpError(423, "This account is temporarily locked after too many attempts. Try again in 15 minutes or reset your password.");
  }
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    const failed = row.failed_logins + 1;
    run("UPDATE users SET failed_logins = $f, locked_until = $l WHERE id = $id", {
      id: row.id,
      f: failed >= LOCK_AFTER ? 0 : failed,
      l: failed >= LOCK_AFTER ? now() + LOCK_MS : null,
    });
    audit({ userId: row.id, action: failed >= LOCK_AFTER ? "login.locked" : "login.failed", ip });
    throw new HttpError(401, "Email or password is incorrect.");
  }
  if (row.email_verified_at === null) throw new HttpError(403, "Confirm your email first. We've sent you a new link.");
  run("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $id", { id: row.id });
  audit({ userId: row.id, action: "login.succeeded", ip });
  return row.id;
}

// ---------- Sessions ----------

export function createSession(userId: string, userAgent: string | null) {
  const token = randomToken(32);
  const t = now();
  run(
    `INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at, user_agent)
     VALUES ($id, $u, $t, $exp, $t, $ua)`,
    { id: tokenHash(token), u: userId, t, exp: t + config().sessionDays * 24 * HOUR, ua: userAgent?.slice(0, 300) ?? null },
  );
  return { token, expiresAt: t + config().sessionDays * 24 * HOUR };
}

export function sessionUser(token: string | undefined): Profile | null {
  if (!token || token.length > 64) return null;
  const id = tokenHash(token);
  const row = get<UserRow & { last_seen_at: number }>(
    `SELECT u.*, s.last_seen_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = $id AND s.expires_at > $t`,
    { id, t: now() },
  );
  if (!row) return null;
  if (now() - row.last_seen_at > HOUR) {
    run("UPDATE sessions SET last_seen_at = $t, expires_at = $exp WHERE id = $id", { id, t: now(), exp: now() + config().sessionDays * 24 * HOUR });
  }
  return profileFromRow(row);
}

export function sessionId(token: string) {
  return tokenHash(token);
}

export function revokeSession(token: string | undefined) {
  if (token) run("DELETE FROM sessions WHERE id = $id", { id: tokenHash(token) });
}

export function revokeAllSessions(userId: string, exceptToken?: string) {
  run("DELETE FROM sessions WHERE user_id = $u AND id != $keep", { u: userId, keep: exceptToken ? tokenHash(exceptToken) : "" });
}

export function listSessions(userId: string) {
  return all<{ id: string; created_at: number; last_seen_at: number; user_agent: string | null }>(
    "SELECT id, created_at, last_seen_at, user_agent FROM sessions WHERE user_id = $u AND expires_at > $t ORDER BY last_seen_at DESC",
    { u: userId, t: now() },
  );
}

// ---------- Password reset and change ----------

export async function requestReset(email: string, ip: string | null) {
  if (!rateLimit(`reset:ip:${ip ?? "none"}`, 5, 3600).allowed) throw tooMany(3600);
  const row = get<UserRow>("SELECT * FROM users WHERE email_hash = $h", { h: emailHash(email) });
  if (!row) return;
  const token = issueToken(row.id, "reset", HOUR);
  await sendMail({
    to: email,
    subject: "Reset your Readyline password",
    text: `Reset your password here:\n\n${config().appUrl}/reset/?token=${token}\n\nThe link expires in 1 hour. If you didn't ask for this, ignore this email; your password stays the same.`,
  });
  audit({ userId: row.id, action: "password.reset_requested", ip });
}

export async function resetPassword(token: string, password: string, ip: string | null) {
  const userId = peekToken(token, "reset");
  if (!userId) throw badRequest("This link is invalid or has expired. Ask for a new one.");
  const user = get<UserRow>("SELECT * FROM users WHERE id = $id", { id: userId })!;
  const problem = passwordProblem(password, profileFromRow(user).email);
  if (problem) throw badRequest(problem);
  const hash = await hashPassword(password);
  if (!consumeToken(token, "reset")) throw badRequest("This link is invalid or has expired. Ask for a new one.");
  tx(() => {
    run("UPDATE users SET password_hash = $p, failed_logins = 0, locked_until = NULL, email_verified_at = COALESCE(email_verified_at, $t) WHERE id = $id", {
      id: userId,
      p: hash,
      t: now(),
    });
    run("DELETE FROM sessions WHERE user_id = $id", { id: userId });
  });
  audit({ userId, action: "password.reset", ip });
}

export async function changePassword(userId: string, current: string, next: string, keepToken: string | undefined, ip: string | null) {
  const row = get<UserRow>("SELECT * FROM users WHERE id = $id", { id: userId });
  if (!row || !(await verifyPassword(current, row.password_hash))) throw new HttpError(401, "Your current password is incorrect.");
  const problem = passwordProblem(next, profileFromRow(row).email);
  if (problem) throw badRequest(problem);
  run("UPDATE users SET password_hash = $p WHERE id = $id", { id: userId, p: await hashPassword(next) });
  revokeAllSessions(userId, keepToken);
  audit({ userId, action: "password.changed", ip });
}

export function updateName(userId: string, name: string) {
  run("UPDATE users SET name_sealed = $n WHERE id = $id", { id: userId, n: seal(name, `user:${userId}:name`) });
  audit({ userId, action: "account.renamed" });
}

export async function deleteAccount(userId: string, password: string, ip: string | null) {
  const row = get<UserRow>("SELECT * FROM users WHERE id = $id", { id: userId });
  if (!row || !(await verifyPassword(password, row.password_hash))) throw new HttpError(401, "Your password is incorrect.");
  const owned = all<{ org_id: string; others: number; owners: number }>(
    `SELECT m.org_id,
       (SELECT COUNT(*) FROM memberships x WHERE x.org_id = m.org_id AND x.user_id != $u) AS others,
       (SELECT COUNT(*) FROM memberships x WHERE x.org_id = m.org_id AND x.role = 'owner' AND x.user_id != $u) AS owners
     FROM memberships m WHERE m.user_id = $u AND m.role = 'owner'`,
    { u: userId },
  );
  const blocked = owned.filter((o) => o.others > 0 && o.owners === 0);
  if (blocked.length) throw badRequest("You are the only owner of a team with other members. Make someone else an owner first.");
  tx(() => {
    for (const o of owned) if (o.others === 0) run("DELETE FROM orgs WHERE id = $id", { id: o.org_id });
    run("DELETE FROM users WHERE id = $id", { id: userId });
  });
  audit({ action: "account.deleted", targetType: "user", targetId: userId, ip });
}

// ---------- Single-use tokens ----------

function issueToken(userId: string, kind: "verify" | "reset", ttl: number) {
  const token = randomToken(32);
  run("DELETE FROM tokens WHERE user_id = $u AND kind = $k AND used_at IS NULL", { u: userId, k: kind });
  run("INSERT INTO tokens (id, user_id, kind, expires_at, created_at) VALUES ($id, $u, $k, $exp, $t)", {
    id: tokenHash(token),
    u: userId,
    k: kind,
    exp: now() + ttl,
    t: now(),
  });
  return token;
}

function peekToken(token: string, kind: "verify" | "reset") {
  if (!token || token.length > 64) return null;
  const row = get<{ user_id: string }>("SELECT user_id FROM tokens WHERE id = $id AND kind = $k AND used_at IS NULL AND expires_at > $t", {
    id: tokenHash(token),
    k: kind,
    t: now(),
  });
  return row?.user_id ?? null;
}

function consumeToken(token: string, kind: "verify" | "reset") {
  const userId = peekToken(token, kind);
  if (!userId) return null;
  const res = run("UPDATE tokens SET used_at = $t WHERE id = $id AND used_at IS NULL", { id: tokenHash(token), t: now() });
  return Number(res.changes) === 1 ? userId : null;
}
