import { config } from "@/server/config";
import { open, seal } from "@/server/crypto/envelope";
import { ipHash } from "@/server/crypto/secrets";
import { all, get, newId, now, run } from "@/server/db";
import { notFound, tooMany } from "@/server/errors";
import { audit, rateLimit, sendMail } from "@/server/platform";
import { orgName, setTier, type Tier } from "@/server/services/orgs";

export type Lead = { name: string; email: string; company: string; makes?: string; sellWhen?: string; plan?: string; notes?: string };

export async function createLead(input: Lead, source: string, ip: string | null) {
  if (!rateLimit(`lead:ip:${ip ?? "none"}`, 5, 3600).allowed) throw tooMany(3600);
  const id = newId();
  run("INSERT INTO leads (id, data_sealed, source, ip_hash, created_at) VALUES ($id, $d, $s, $ip, $t)", {
    id,
    d: seal(input, `lead:${id}`),
    s: source.slice(0, 80),
    ip: ipHash(ip),
    t: now(),
  });
  audit({ action: "lead.created", targetType: "lead", targetId: id, meta: { plan: input.plan ?? "" } });
  // Notify the team without putting the lead's details in the email; they read it in the admin page.
  for (const to of config().superadmins) {
    await sendMail({ to, subject: "New early-access request", text: `A new early-access request arrived (${input.plan || "plan not chosen"}). Review it at ${config().appUrl}/admin/.` }).catch(() => {});
  }
  return id;
}

export function listLeads(limit = 200) {
  return all<{ id: string; data_sealed: string; source: string; created_at: number }>("SELECT id, data_sealed, source, created_at FROM leads ORDER BY created_at DESC LIMIT $l", {
    l: Math.min(1000, limit),
  }).map((r) => ({ id: r.id, ...open<Lead>(r.data_sealed, `lead:${r.id}`), source: r.source, createdAt: r.created_at }));
}

export function deleteLead(actorId: string, id: string) {
  const res = run("DELETE FROM leads WHERE id = $id", { id });
  if (Number(res.changes) === 0) throw notFound();
  audit({ userId: actorId, action: "lead.deleted", targetType: "lead", targetId: id });
}

export function listAllOrgs() {
  return all<{ id: string; name_sealed: string; tier: Tier; created_at: number; members: number; products: number }>(
    `SELECT o.id, o.name_sealed, o.tier, o.created_at,
       (SELECT COUNT(*) FROM memberships m WHERE m.org_id = o.id) AS members,
       (SELECT COUNT(*) FROM products p WHERE p.org_id = o.id AND p.archived_at IS NULL) AS products
     FROM orgs o ORDER BY o.created_at DESC LIMIT 1000`,
  ).map((r) => ({ id: r.id, name: orgName(r.id, r.name_sealed), tier: r.tier, createdAt: r.created_at, members: r.members, products: r.products }));
}

export function adminSetTier(actorId: string, orgId: string, tier: Tier) {
  if (!get("SELECT 1 FROM orgs WHERE id = $id", { id: orgId })) throw notFound();
  setTier(actorId, orgId, tier);
}
