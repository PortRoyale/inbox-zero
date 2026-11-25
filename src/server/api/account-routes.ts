import { config } from "@/server/config";
import { clearSessionCookie, json, route, sessionCookie } from "@/server/http";
import * as accounts from "@/server/services/accounts";
import * as orgs from "@/server/services/orgs";
import { v } from "@/server/validate";

const password = v.string({ min: 1, max: 256, trim: false });
const name = v.string({ min: 1, max: 80 });
const token = v.string({ min: 20, max: 64, pattern: /^[A-Za-z0-9_-]+$/ });

export function isSuperadmin(user: accounts.Profile | null) {
  return !!user && user.emailVerified && config().superadmins.includes(user.email.toLowerCase());
}

export const accountRoutes = [
  route({
    method: "POST",
    path: "/auth/signup",
    access: "public",
    body: v.object({ name, email: v.email(), password, company: v.string({ min: 1, max: 120 }) }),
  },
  async ({ body, ip }) => {
    await accounts.signup(body, ip);
    return json({ ok: true, next: "check-email" }, { status: 202 });
  }),
  route({
    method: "POST",
    path: "/auth/login",
    access: "public",
    body: v.object({ email: v.email(), password }),
  },
  async ({ body, ip, userAgent }) => {
    let userId: string;
    try {
      userId = await accounts.login(body.email, body.password, ip);
    } catch (err) {
      // Unverified accounts get a fresh confirmation link with the error.
      if (err instanceof Error && /Confirm your email/.test(err.message)) await accounts.resendVerification(body.email, ip);
      throw err;
    }
    const s = accounts.createSession(userId, userAgent);
    return json({ ok: true }, { cookies: [sessionCookie(s.token, s.expiresAt)] });
  }),
  route({
    method: "POST",
    path: "/auth/logout",
    access: "public",
  },
  ({ sessionToken }) => {
    accounts.revokeSession(sessionToken);
    return json({ ok: true }, { cookies: [clearSessionCookie()] });
  }),
  route({
    method: "POST",
    path: "/auth/verify",
    access: "public",
    body: v.object({ token }),
  },
  ({ body, ip, userAgent }) => {
    const userId = accounts.verifyEmail(body.token, ip);
    const s = accounts.createSession(userId, userAgent);
    return json({ ok: true }, { cookies: [sessionCookie(s.token, s.expiresAt)] });
  }),
  route({
    method: "POST",
    path: "/auth/resend",
    access: "public",
    body: v.object({ email: v.email() }),
  },
  async ({ body, ip }) => {
    await accounts.resendVerification(body.email, ip);
    return json({ ok: true }, { status: 202 });
  }),
  route({
    method: "POST",
    path: "/auth/reset-request",
    access: "public",
    body: v.object({ email: v.email() }),
  },
  async ({ body, ip }) => {
    await accounts.requestReset(body.email, ip);
    return json({ ok: true }, { status: 202 });
  }),
  route({
    method: "POST",
    path: "/auth/reset",
    access: "public",
    body: v.object({ token, password }),
  },
  async ({ body, ip }) => {
    await accounts.resetPassword(body.token, body.password, ip);
    return json({ ok: true }, { cookies: [clearSessionCookie()] });
  }),

  // ---------- The signed-in user ----------
  route({
    method: "GET",
    path: "/me",
    access: "user",
  },
  ({ user }) => ({ user, orgs: orgs.myOrgs(user.id), superadmin: isSuperadmin(user) })),
  route({
    method: "PATCH",
    path: "/me",
    access: "user",
    body: v.object({ name }),
  },
  ({ user, body }) => {
    accounts.updateName(user.id, body.name);
    return { ok: true };
  }),
  route({
    method: "POST",
    path: "/me/password",
    access: "user",
    body: v.object({ current: password, next: password }),
  },
  async ({ user, body, sessionToken, ip }) => {
    await accounts.changePassword(user.id, body.current, body.next, sessionToken, ip);
    return { ok: true };
  }),
  route({
    method: "GET",
    path: "/me/sessions",
    access: "user",
  },
  ({ user, sessionToken }) => {
    const current = sessionToken ? accounts.sessionId(sessionToken) : "";
    return {
      sessions: accounts.listSessions(user.id).map((s) => ({
        current: s.id === current,
        createdAt: s.created_at,
        lastSeenAt: s.last_seen_at,
        device: s.user_agent ?? "Unknown device",
      })),
    };
  }),
  route({
    method: "DELETE",
    path: "/me/sessions",
    access: "user",
  },
  ({ user, sessionToken }) => {
    accounts.revokeAllSessions(user.id, sessionToken);
    return { ok: true };
  }),
  route({
    method: "POST",
    path: "/me/delete",
    access: "user",
    body: v.object({ password }),
  },
  async ({ user, body, ip }) => {
    await accounts.deleteAccount(user.id, body.password, ip);
    return json({ ok: true }, { cookies: [clearSessionCookie()] });
  }),

  // ---------- Teams ----------
  route({
    method: "POST",
    path: "/orgs",
    access: "verified",
    body: v.object({ name: v.string({ min: 1, max: 120 }) }),
  },
  ({ user, body }) => ({ id: orgs.createOrg(user.id, body.name) })),
  route({
    method: "PATCH",
    path: "/orgs/:orgId",
    access: "verified",
    body: v.object({ name: v.string({ min: 1, max: 120 }) }),
  },
  ({ user, params, body }) => {
    orgs.renameOrg(user.id, params.orgId, body.name);
    return { ok: true };
  }),
  route({
    method: "GET",
    path: "/orgs/:orgId",
    access: "verified",
  },
  ({ user, params }) => {
    const org = orgs.requireOrg(user.id, params.orgId);
    return { id: org.orgId, name: org.name, tier: org.tier, trial: org.trial, role: org.role, limits: orgs.TIERS[org.tier] };
  }),
  route({
    method: "GET",
    path: "/orgs/:orgId/members",
    access: "verified",
  },
  ({ user, params }) => ({ members: orgs.listMembers(user.id, params.orgId) })),
  route({
    method: "PATCH",
    path: "/orgs/:orgId/members/:userId",
    access: "verified",
    body: v.object({ role: v.enum(orgs.ROLES) }),
  },
  ({ user, params, body }) => {
    orgs.changeRole(user.id, params.orgId, params.userId, body.role);
    return { ok: true };
  }),
  route({
    method: "DELETE",
    path: "/orgs/:orgId/members/:userId",
    access: "verified",
  },
  ({ user, params }) => {
    orgs.removeMember(user.id, params.orgId, params.userId);
    return { ok: true };
  }),
  route({
    method: "GET",
    path: "/orgs/:orgId/invites",
    access: "verified",
  },
  ({ user, params }) => ({ invites: orgs.listInvites(user.id, params.orgId) })),
  route({
    method: "POST",
    path: "/orgs/:orgId/invites",
    access: "verified",
    body: v.object({ email: v.email(), role: v.enum(orgs.INVITE_ROLES) }),
  },
  async ({ user, params, body }) => {
    await orgs.invite(user.id, user.name, params.orgId, body.email, body.role);
    return json({ ok: true }, { status: 201 });
  }),
  route({
    method: "DELETE",
    path: "/orgs/:orgId/invites/:inviteId",
    access: "verified",
  },
  ({ user, params }) => {
    orgs.revokeInvite(user.id, params.orgId, params.inviteId);
    return { ok: true };
  }),
  route({
    method: "GET",
    path: "/orgs/:orgId/audit",
    access: "verified",
  },
  ({ user, params }) => ({ entries: orgs.auditTrail(user.id, params.orgId) })),
  route({
    method: "POST",
    path: "/invites/preview",
    access: "public",
    body: v.object({ token }),
  },
  ({ body }) => ({ invite: orgs.previewInvite(body.token) })),
  route({
    method: "POST",
    path: "/invites/accept",
    access: "verified",
    body: v.object({ token }),
  },
  ({ user, body }) => ({ orgId: orgs.acceptInvite(user, body.token) })),
];
