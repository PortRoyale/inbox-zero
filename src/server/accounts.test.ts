import { describe, expect, it } from "vitest";
import { get } from "@/server/db";
import { testOutbox } from "@/server/platform";
import { lastLink, PASSWORD, signedInUser, TestClient } from "@/server/test/client";

describe("sign-up, verification and login", () => {
  it("signs up, verifies by email link and signs in", async () => {
    const c = new TestClient();
    const email = "founder@example.com";
    expect((await c.post("/auth/signup", { name: "Founder", email, password: PASSWORD, company: "Acme" })).status).toBe(202);
    expect((await c.get("/me")).status).toBe(401);

    const blocked = await c.post("/auth/login", { email, password: PASSWORD });
    expect(blocked.status).toBe(403);

    const verified = await c.post("/auth/verify", { token: lastLink(email, "verify") });
    expect(verified.status).toBe(200);
    const me = await c.get<{ user: { email: string; name: string; emailVerified: boolean }; orgs: { role: string; name: string }[] }>("/me");
    expect(me.data.user).toMatchObject({ email, name: "Founder", emailVerified: true });
    expect(me.data.orgs).toEqual([expect.objectContaining({ role: "owner", name: "Acme", tier: "starter" })]);

    await c.post("/auth/logout");
    expect((await c.get("/me")).status).toBe(401);
    expect((await c.post("/auth/login", { email, password: "wrong-password-123" })).status).toBe(401);
    expect((await c.post("/auth/login", { email, password: PASSWORD })).status).toBe(200);
    expect((await c.get("/me")).status).toBe(200);
  });

  it("stores personal data encrypted, never in plain text", async () => {
    const { email } = await signedInUser("Plaintext Check", "Secret Company Ltd");
    const row = get<Record<string, string>>("SELECT * FROM users WHERE email_hash IS NOT NULL ORDER BY created_at DESC LIMIT 1")!;
    const dump = JSON.stringify(row);
    expect(dump).not.toContain(email);
    expect(dump).not.toContain("Plaintext Check");
    expect(row.email_sealed.startsWith("rl1.")).toBe(true);
    const org = JSON.stringify(get("SELECT * FROM orgs ORDER BY created_at DESC LIMIT 1"));
    expect(org).not.toContain("Secret Company");
  });

  it("does not reveal whether an email is registered", async () => {
    const { email } = await signedInUser();
    const c = new TestClient(undefined, "192.0.2.50");
    const dup = await c.post("/auth/signup", { name: "X", email, password: PASSWORD, company: "Y" });
    const fresh = await c.post("/auth/signup", { name: "X", email: "brand-new@example.com", password: PASSWORD, company: "Y" });
    expect(dup.status).toBe(fresh.status);
    expect(dup.data).toEqual(fresh.data);
    const unknown = await c.post("/auth/login", { email: "nobody@example.com", password: PASSWORD });
    const wrong = await c.post("/auth/login", { email, password: "Not-The-Password-1" });
    expect(unknown.status).toBe(401);
    expect(unknown.data).toEqual(wrong.data);
    const r1 = await c.post("/auth/reset-request", { email: "nobody@example.com" });
    const r2 = await c.post("/auth/reset-request", { email });
    expect(r1.status).toBe(r2.status);
  });

  it("rejects weak passwords", async () => {
    const r = await new TestClient().post("/auth/signup", { name: "A", email: "weak@example.com", password: "password", company: "B" });
    expect(r.status).toBe(400);
    expect(r.data.error).toMatch(/12 characters/);
  });

  it("locks an account after repeated failures", async () => {
    const { email } = await signedInUser();
    const c = new TestClient(undefined, "192.0.2.77");
    for (let i = 0; i < 10; i++) await c.post("/auth/login", { email, password: `Wrong-Password-${i}` });
    const locked = await c.post("/auth/login", { email, password: PASSWORD });
    expect([423, 429]).toContain(locked.status);
  }, 30_000);

  it("resets a password with a single-use link and signs out other sessions", async () => {
    const { c, email } = await signedInUser();
    const other = new TestClient(undefined, "192.0.2.9");
    await other.post("/auth/reset-request", { email });
    const token = lastLink(email, "reset");
    const next = "Quiet-Meadow-Copper-42";
    expect((await other.post("/auth/reset", { token, password: next })).status).toBe(200);
    expect((await other.post("/auth/reset", { token, password: "Another-Fresh-Pass-7" })).status).toBe(400);
    expect((await c.get("/me")).status).toBe(401);
    expect((await other.post("/auth/login", { email, password: PASSWORD })).status).toBe(401);
    expect((await other.post("/auth/login", { email, password: next })).status).toBe(200);
  });

  it("deletes an account and its sole-owner team", async () => {
    const { c, orgId } = await signedInUser();
    expect((await c.post("/me/delete", { password: "wrong-password-xx" })).status).toBe(401);
    expect((await c.post("/me/delete", { password: PASSWORD })).status).toBe(200);
    expect((await c.get("/me")).status).toBe(401);
    expect(get("SELECT id FROM orgs WHERE id = $id", { id: orgId })).toBeUndefined();
  });
});

describe("request security", () => {
  it("refuses cross-site writes", async () => {
    const { c } = await signedInUser();
    const evil = await c.call("PATCH", "/me", { name: "Pwned" }, { origin: "https://evil.example" });
    expect(evil.status).toBe(403);
    const noOrigin = await c.call("PATCH", "/me", { name: "Pwned" }, { origin: "" });
    expect(noOrigin.status).toBe(403);
    const sameSite = await c.call("PATCH", "/me", { name: "Fine" }, { origin: "", "sec-fetch-site": "same-origin" });
    expect(sameSite.status).toBe(200);
  });

  it("only accepts JSON bodies within the size limit", async () => {
    const c = new TestClient();
    const form = await c.call("POST", "/auth/login", "email=a&password=b", { "content-type": "application/x-www-form-urlencoded" });
    expect(form.status).toBe(415);
    const big = await c.post("/auth/signup", { name: "x".repeat(70_000), email: "a@b.co", password: PASSWORD, company: "c" });
    expect(big.status).toBe(413);
    const bad = await c.call("POST", "/auth/login", "{not json", {});
    expect(bad.status).toBe(400);
  });

  it("validates input and returns the field", async () => {
    const r = await new TestClient().post("/auth/signup", { name: "A", email: "not-an-email", password: PASSWORD, company: "B" });
    expect(r.status).toBe(400);
    expect(r.data.field).toBe("email");
  });

  it("returns 404 for unknown routes and malformed ids", async () => {
    const { c } = await signedInUser();
    expect((await c.get("/nope")).status).toBe(404);
    expect((await c.get("/orgs/../../etc/passwd/members")).status).toBe(404);
    expect((await c.get("/orgs/not-a-uuid/members")).status).toBe(404);
  });

  it("sets hardened session cookies and no-store responses", async () => {
    const c = new TestClient();
    const email = "cookie@example.com";
    await c.post("/auth/signup", { name: "C", email, password: PASSWORD, company: "D" });
    const res = await c.post("/auth/verify", { token: lastLink(email, "verify") });
    const cookie = res.headers.getSetCookie()[0];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const id = cookie.split(";")[0].split("=")[1];
    expect(get("SELECT id FROM sessions WHERE id = $id", { id })).toBeUndefined();
  });

  it("rate limits sign-ups per address", async () => {
    const c = new TestClient(undefined, "192.0.2.200");
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await c.post("/auth/signup", { name: "R", email: `rl${i}@example.com`, password: PASSWORD, company: "R" })).status;
    expect(last).toBe(429);
  }, 30_000);
});

describe("teams, roles and invites", () => {
  it("invites a teammate who accepts with the invited email only", async () => {
    const owner = await signedInUser("Owner One", "Team Co");
    const mate = await signedInUser("Mate Two", "Other Co");
    const stranger = await signedInUser("Stranger", "Else Co");

    expect((await owner.c.post(`/orgs/${owner.orgId}/invites`, { email: mate.email, role: "editor" })).status).toBe(201);
    const token = lastLink(mate.email, "invite");
    expect((await stranger.c.post("/invites/accept", { token })).status).toBe(403);
    const preview = await mate.c.post<{ invite: { orgName: string; role: string } }>("/invites/preview", { token });
    expect(preview.data.invite).toEqual({ orgName: "Team Co", role: "editor" });
    const accepted = await mate.c.post("/invites/accept", { token });
    expect(accepted.data.orgId).toBe(owner.orgId);
    expect((await mate.c.post("/invites/accept", { token })).status).toBe(400);

    const members = await mate.c.get<{ members: { name: string; role: string }[] }>(`/orgs/${owner.orgId}/members`);
    expect(members.data.members.map((m) => [m.name, m.role])).toEqual([
      ["Owner One", "owner"],
      ["Mate Two", "editor"],
    ]);
  });

  it("hides other teams behind 404 and enforces role ranks", async () => {
    const owner = await signedInUser("Boss", "Boss Co");
    const outsider = await signedInUser("Outsider", "Out Co");
    expect((await outsider.c.get(`/orgs/${owner.orgId}/members`)).status).toBe(404);
    expect((await outsider.c.patch(`/orgs/${owner.orgId}`, { name: "Hijacked" })).status).toBe(404);

    const viewer = await signedInUser("Viewer", "V Co");
    await owner.c.post(`/orgs/${owner.orgId}/invites`, { email: viewer.email, role: "viewer" });
    await viewer.c.post("/invites/accept", { token: lastLink(viewer.email, "invite") });
    expect((await viewer.c.patch(`/orgs/${owner.orgId}`, { name: "Renamed" })).status).toBe(403);
    expect((await viewer.c.post(`/orgs/${owner.orgId}/invites`, { email: "x@example.com", role: "viewer" })).status).toBe(403);
    const me = await viewer.c.get<{ user: { id: string } }>("/me");
    expect((await viewer.c.patch(`/orgs/${owner.orgId}/members/${me.data.user.id}`, { role: "owner" })).status).toBe(403);
  });

  it("keeps at least one owner and gates Team-plan roles", async () => {
    const owner = await signedInUser("Solo", "Solo Co");
    const me = await owner.c.get<{ user: { id: string } }>("/me");
    const demote = await owner.c.patch(`/orgs/${owner.orgId}/members/${me.data.user.id}`, { role: "editor" });
    expect(demote.status).toBe(400);
    expect((await owner.c.del(`/orgs/${owner.orgId}/members/${me.data.user.id}`)).status).toBe(400);
    const approver = await owner.c.post(`/orgs/${owner.orgId}/invites`, { email: "appr@example.com", role: "approver" });
    expect(approver.status).toBe(400);
    expect(approver.data.error).toMatch(/Team plan/);
  });

  it("records an audit trail visible to admins", async () => {
    const owner = await signedInUser("Auditor", "Audit Co");
    await owner.c.patch(`/orgs/${owner.orgId}`, { name: "Audit Co Ltd" });
    const trail = await owner.c.get<{ entries: { action: string }[] }>(`/orgs/${owner.orgId}/audit`);
    expect(trail.data.entries.map((e) => e.action)).toEqual(expect.arrayContaining(["org.renamed", "account.created"]));
    expect(testOutbox().length).toBeGreaterThan(0);
  });
});
