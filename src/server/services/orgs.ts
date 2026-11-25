import { config } from "@/server/config";
import { open, seal } from "@/server/crypto/envelope";
import { emailHash, randomToken, tokenHash } from "@/server/crypto/secrets";
import { all, get, now, run, tx } from "@/server/db";
import { badRequest, forbidden, HttpError, notFound, tooMany } from "@/server/errors";
import { audit, rateLimit, sendMail } from "@/server/platform";
import type { Profile } from "@/server/services/accounts";

export const ROLES = ["owner", "admin", "approver", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];
export const INVITE_ROLES = ["admin", "approver", "editor", "viewer"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

const RANK: Record<Role, number> = { owner: 4, admin: 3, approver: 2, editor: 1, viewer: 0 };
export const atLeast = (role: Role, min: Role) => RANK[role] >= RANK[min];

export const TIERS = {
  starter: { products: 1, members: 3, roles: ["owner", "editor", "viewer"] as Role[] },
  team: { products: 5, members: 25, roles: [...ROLES] as Role[] },
} as const;
export type Tier = keyof typeof TIERS;

export type OrgSummary = { id: string; name: string; tier: Tier; role: Role };

const DAY = 86_400_000;

export function orgName(id: string, sealed: string) {
  return open<string>(sealed, `org:${id}:name`);
}

export function myOrgs(userId: string): OrgSummary[] {
  return all<{ id: string; name_sealed: string; tier: Tier; role: Role }>(
    `SELECT o.id, o.name_sealed, o.tier, m.role FROM memberships m JOIN orgs o ON o.id = m.org_id
     WHERE m.user_id = $u ORDER BY o.created_at`,
    { u: userId },
  ).map((r) => ({ id: r.id, name: orgName(r.id, r.name_sealed), tier: r.tier, role: r.role }));
}

// Returns 404 rather than 403 when the user is not a member, so ids of other teams cannot be probed.
export function requireOrg(userId: string, orgId: string, min: Role = "viewer") {
  const row = get<{ role: Role; tier: Tier; name_sealed: string }>(
    "SELECT m.role, o.tier, o.name_sealed FROM memberships m JOIN orgs o ON o.id = m.org_id WHERE m.org_id = $o AND m.user_id = $u",
    { o: orgId, u: userId },
  );
  if (!row) throw notFound();
  if (!atLeast(row.role, min)) throw forbidden();
  return { orgId, role: row.role, tier: row.tier, name: orgName(orgId, row.name_sealed) };
}

export function createOrg(userId: string, name: string) {
  const count = get<{ n: number }>("SELECT COUNT(*) AS n FROM memberships WHERE user_id = $u AND role = 'owner'", { u: userId })!.n;
  if (count >= 5) throw badRequest("You can own up to 5 teams. Contact us if you need more.");
  const id = crypto.randomUUID();
  const t = now();
  tx(() => {
    run("INSERT INTO orgs (id, name_sealed, tier, created_at) VALUES ($id, $n, 'starter', $t)", { id, n: seal(name, `org:${id}:name`), t });
    run("INSERT INTO memberships (org_id, user_id, role, created_at) VALUES ($o, $u, 'owner', $t)", { o: id, u: userId, t });
  });
  audit({ orgId: id, userId, action: "org.created" });
  return id;
}

export function renameOrg(userId: string, orgId: string, name: string) {
  requireOrg(userId, orgId, "admin");
  run("UPDATE orgs SET name_sealed = $n WHERE id = $id", { id: orgId, n: seal(name, `org:${orgId}:name`) });
  audit({ orgId, userId, action: "org.renamed" });
}

export function listMembers(userId: string, orgId: string) {
  requireOrg(userId, orgId, "viewer");
  return all<{ user_id: string; role: Role; created_at: number; name_sealed: string; email_sealed: string }>(
    `SELECT m.user_id, m.role, m.created_at, u.name_sealed, u.email_sealed FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.org_id = $o ORDER BY m.created_at`,
    { o: orgId },
  ).map((r) => ({
    userId: r.user_id,
    role: r.role,
    joinedAt: r.created_at,
    name: open<string>(r.name_sealed, `user:${r.user_id}:name`),
    email: open<string>(r.email_sealed, `user:${r.user_id}:email`),
  }));
}

function ownerCount(orgId: string) {
  return get<{ n: number }>("SELECT COUNT(*) AS n FROM memberships WHERE org_id = $o AND role = 'owner'", { o: orgId })!.n;
}

export function changeRole(userId: string, orgId: string, targetId: string, role: Role) {
  const me = requireOrg(userId, orgId, "admin");
  const target = get<{ role: Role }>("SELECT role FROM memberships WHERE org_id = $o AND user_id = $u", { o: orgId, u: targetId });
  if (!target) throw notFound();
  if (!TIERS[me.tier].roles.includes(role)) throw badRequest(`The ${role} role is part of the Team plan.`);
  if ((target.role === "owner" || role === "owner") && me.role !== "owner") throw forbidden("Only an owner can add or remove owners.");
  if (target.role === "owner" && role !== "owner" && ownerCount(orgId) <= 1) throw badRequest("A team needs at least one owner.");
  run("UPDATE memberships SET role = $r WHERE org_id = $o AND user_id = $u", { o: orgId, u: targetId, r: role });
  audit({ orgId, userId, action: "member.role_changed", targetType: "user", targetId, meta: { from: target.role, to: role } });
}

export function removeMember(userId: string, orgId: string, targetId: string) {
  const self = userId === targetId;
  const me = requireOrg(userId, orgId, self ? "viewer" : "admin");
  const target = get<{ role: Role }>("SELECT role FROM memberships WHERE org_id = $o AND user_id = $u", { o: orgId, u: targetId });
  if (!target) throw notFound();
  if (target.role === "owner" && !self && me.role !== "owner") throw forbidden("Only an owner can remove an owner.");
  if (target.role === "owner" && ownerCount(orgId) <= 1) throw badRequest("A team needs at least one owner. Make someone else an owner first.");
  run("DELETE FROM memberships WHERE org_id = $o AND user_id = $u", { o: orgId, u: targetId });
  audit({ orgId, userId, action: self ? "member.left" : "member.removed", targetType: "user", targetId });
}

// ---------- Invites ----------

export async function invite(userId: string, inviterName: string, orgId: string, email: string, role: InviteRole) {
  const me = requireOrg(userId, orgId, "admin");
  if (!TIERS[me.tier].roles.includes(role)) throw badRequest(`The ${role} role is part of the Team plan.`);
  if (role === "admin" && me.role !== "owner") throw forbidden("Only an owner can invite admins.");
  if (!rateLimit(`invite:org:${orgId}`, 30, 86_400).allowed) throw tooMany(86_400);
  const h = emailHash(email);
  const members = get<{ n: number }>("SELECT COUNT(*) AS n FROM memberships WHERE org_id = $o", { o: orgId })!.n;
  const pending = get<{ n: number }>("SELECT COUNT(*) AS n FROM invites WHERE org_id = $o AND accepted_at IS NULL AND expires_at > $t AND email_hash != $h", {
    o: orgId,
    t: now(),
    h,
  })!.n;
  if (members + pending >= TIERS[me.tier].members) throw badRequest(`Your plan includes up to ${TIERS[me.tier].members} people.`);
  const already = get("SELECT 1 FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = $o AND u.email_hash = $h", { o: orgId, h });
  if (already) throw badRequest("That person is already on the team.");
  const token = randomToken(32);
  const id = tokenHash(token);
  tx(() => {
    run("DELETE FROM invites WHERE org_id = $o AND email_hash = $h AND accepted_at IS NULL", { o: orgId, h });
    run(
      `INSERT INTO invites (id, org_id, email_hash, email_sealed, role, invited_by, expires_at, created_at)
       VALUES ($id, $o, $h, $e, $r, $by, $exp, $t)`,
      { id, o: orgId, h, e: seal(email, `invite:${id}:email`), r: role, by: userId, exp: now() + 7 * DAY, t: now() },
    );
  });
  await sendMail({
    to: email,
    subject: `${inviterName} invited you to ${me.name} on Readyline`,
    text: `${inviterName} invited you to join ${me.name} on Readyline as ${role}.\n\nAccept the invite:\n${config().appUrl}/invite/?token=${token}\n\nThe link expires in 7 days. Sign up or sign in with this email address (${email}) to accept.`,
  });
  audit({ orgId, userId, action: "invite.sent", meta: { role } });
}

export function listInvites(userId: string, orgId: string) {
  requireOrg(userId, orgId, "admin");
  return all<{ id: string; email_sealed: string; role: InviteRole; expires_at: number; created_at: number }>(
    "SELECT id, email_sealed, role, expires_at, created_at FROM invites WHERE org_id = $o AND accepted_at IS NULL AND expires_at > $t ORDER BY created_at DESC",
    { o: orgId, t: now() },
  ).map((r) => ({ id: r.id.slice(0, 24), email: open<string>(r.email_sealed, `invite:${r.id}:email`), role: r.role, expiresAt: r.expires_at, sentAt: r.created_at }));
}

export function revokeInvite(userId: string, orgId: string, shortId: string) {
  requireOrg(userId, orgId, "admin");
  if (!/^[0-9a-f]{24}$/.test(shortId)) throw notFound();
  const res = run("DELETE FROM invites WHERE org_id = $o AND substr(id, 1, 24) = $s AND accepted_at IS NULL", { o: orgId, s: shortId });
  if (Number(res.changes) === 0) throw notFound();
  audit({ orgId, userId, action: "invite.revoked" });
}

export function previewInvite(token: string) {
  if (!token || token.length > 64) return null;
  const row = get<{ org_id: string; role: InviteRole; name_sealed: string }>(
    "SELECT i.org_id, i.role, o.name_sealed FROM invites i JOIN orgs o ON o.id = i.org_id WHERE i.id = $id AND i.accepted_at IS NULL AND i.expires_at > $t",
    { id: tokenHash(token), t: now() },
  );
  return row ? { orgName: orgName(row.org_id, row.name_sealed), role: row.role } : null;
}

export function acceptInvite(user: Profile, token: string) {
  if (!user.emailVerified) throw forbidden("Confirm your email first.");
  const id = token && token.length <= 64 ? tokenHash(token) : "";
  const row = get<{ org_id: string; role: InviteRole; email_hash: string }>(
    "SELECT org_id, role, email_hash FROM invites WHERE id = $id AND accepted_at IS NULL AND expires_at > $t",
    { id, t: now() },
  );
  if (!row) throw badRequest("This invite is invalid, used or expired. Ask for a new one.");
  if (row.email_hash !== emailHash(user.email)) throw new HttpError(403, "This invite was sent to a different email address. Sign in with that address to accept it.");
  tx(() => {
    run("UPDATE invites SET accepted_at = $t WHERE id = $id", { id, t: now() });
    run("INSERT INTO memberships (org_id, user_id, role, created_at) VALUES ($o, $u, $r, $t) ON CONFLICT DO NOTHING", {
      o: row.org_id,
      u: user.id,
      r: row.role,
      t: now(),
    });
  });
  audit({ orgId: row.org_id, userId: user.id, action: "invite.accepted", meta: { role: row.role } });
  return row.org_id;
}

export function setTier(actorId: string, orgId: string, tier: Tier) {
  run("UPDATE orgs SET tier = $t WHERE id = $id", { id: orgId, t: tier });
  audit({ orgId, userId: actorId, action: "org.tier_changed", meta: { tier } });
}

export function auditTrail(userId: string, orgId: string, limit = 200) {
  requireOrg(userId, orgId, "admin");
  return all<{ id: number; user_id: string | null; action: string; target_type: string; target_id: string; meta_json: string; created_at: number }>(
    "SELECT id, user_id, action, target_type, target_id, meta_json, created_at FROM audit_log WHERE org_id = $o ORDER BY id DESC LIMIT $l",
    { o: orgId, l: Math.min(500, limit) },
  ).map((r) => ({ id: r.id, userId: r.user_id, action: r.action, target: r.target_type ? `${r.target_type}:${r.target_id}` : "", meta: JSON.parse(r.meta_json), at: r.created_at }));
}
