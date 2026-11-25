"use client";

import { useEffect, useState } from "react";
import { SelectField, TextField } from "@/components/plan/fields";
import { ConfirmButton } from "@/components/primitives";
import { SpecTable } from "@/components/structure";
import { api, apiDownload } from "@/lib/client/api";
import { Act, can, ErrorLine, PageTitle, planLabel, useApp, useLoad, when, type Role } from "@/components/app/AppShell";

type Member = { userId: string; role: Role; joinedAt: number; name: string; email: string };
type Invite = { id: string; email: string; role: Role; expiresAt: number; sentAt: number };
type AuditEntry = { id: number; userId: string | null; action: string; target: string; meta: Record<string, unknown>; at: number };
type OrgInfo = { id: string; name: string; tier: "starter" | "team"; trial: boolean; role: Role; limits: { products: number; members: number; roles: Role[] } };

const ROLE_HELP: Record<Role, string> = {
  owner: "Everything, including billing and owners",
  admin: "Team, products and settings",
  approver: "Signs off plan revisions",
  editor: "Edits plans, records, SBOMs, incidents",
  viewer: "Reads everything",
};

function useFlash() {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setMsg("");
    setError("");
    try {
      await fn();
      if (done) setMsg(done);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  const view = (
    <>
      {msg && <p className="note-line">{msg}</p>}
      <ErrorLine error={error} />
    </>
  );
  return { run, view };
}

export function TeamPage() {
  const { me, org, refresh } = useApp();
  const info = useLoad(() => api<OrgInfo>("GET", `/orgs/${org.id}`), [org.id]);
  const members = useLoad(() => api<{ members: Member[] }>("GET", `/orgs/${org.id}/members`), [org.id]);
  const isAdmin = can(org.role, "admin");
  const invites = useLoad(() => (isAdmin ? api<{ invites: Invite[] }>("GET", `/orgs/${org.id}/invites`) : Promise.resolve({ invites: [] as Invite[] })), [org.id, isAdmin]);
  const audit = useLoad(() => (isAdmin ? api<{ entries: AuditEntry[] }>("GET", `/orgs/${org.id}/audit`) : Promise.resolve({ entries: [] as AuditEntry[] })), [org.id, isAdmin]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [name, setName] = useState(org.name);
  const flash = useFlash();
  const roles = (info.data?.limits.roles ?? ["owner", "editor", "viewer"]).filter((r) => r !== "owner" || org.role === "owner");
  const names = Object.fromEntries((members.data?.members ?? []).map((m) => [m.userId, m.name]));

  return (
    <>
      <PageTitle label="Team" cells={[org.name, planLabel(org), `${members.data?.members.length ?? 0}/${info.data?.limits.members ?? "?"} people`]} title="Team and roles" lead="Invite colleagues and choose what each can do. Every change is in the audit log." />

      <section className="sheet stack-sm" aria-labelledby="members-title">
        <h2 id="members-title">Members</h2>
        <ErrorLine error={members.error} />
        {members.data && (
          <SpecTable
            rows={members.data.members}
            rowKey={(m) => m.userId}
            cols={[
              {
                key: "n",
                label: "Person",
                head: true,
                render: (m) => (
                  <>
                    <span className="cell-title">
                      {m.name}
                      {m.userId === me.user.id ? " (you)" : ""}
                    </span>
                    <span className="cell-body">{m.email}</span>
                  </>
                ),
              },
              {
                key: "r",
                label: "Role",
                width: "12rem",
                render: (m) =>
                  isAdmin && m.userId !== me.user.id ? (
                    <select className="cell-select" aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => flash.run(() => api("PATCH", `/orgs/${org.id}/members/${m.userId}`, { role: e.target.value }).then(members.reload), "Role updated.")}>
                      {[...new Set([...roles, m.role])].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="code">{m.role}</span>
                  ),
              },
              { key: "h", label: "Can", render: (m) => <span className="muted">{ROLE_HELP[m.role]}</span> },
              { key: "j", label: "Joined", width: "9rem", code: true, render: (m) => when(m.joinedAt).slice(0, 11) },
              {
                key: "x",
                label: "Remove",
                width: "10rem",
                render: (m) =>
                  (isAdmin || m.userId === me.user.id) && (
                    <ConfirmButton
                      label={m.userId === me.user.id ? "Leave team" : "Remove"}
                      confirmLabel="Confirm"
                      onConfirm={() =>
                        flash.run(async () => {
                          await api("DELETE", `/orgs/${org.id}/members/${m.userId}`);
                          if (m.userId === me.user.id) window.location.assign("/app/");
                          else members.reload();
                        }, "Removed.")
                      }
                    />
                  ),
              },
            ]}
          />
        )}
      </section>

      {isAdmin && (
        <section className="sheet stack-sm" aria-labelledby="invite-title">
          <h2 id="invite-title">Invite someone</h2>
          <form
            className="inline-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await flash.run(() => api("POST", `/orgs/${org.id}/invites`, { email, role }), `Invite sent to ${email}.`)) {
                setEmail("");
                invites.reload();
              }
            }}
          >
            <TextField id="inv-email" label="Work email" type="email" value={email} onChange={setEmail} required />
            <SelectField<Role> id="inv-role" label="Role" value={role} options={roles.filter((r) => r !== "owner").map((r) => ({ value: r, label: `${r}: ${ROLE_HELP[r]}` }))} onChange={setRole} />
            <Act><button type="submit" className="btn btn-primary" disabled={!email.trim()}>
              Send invite
            </button></Act>
          </form>
          {info.data?.tier === "starter" && <p className="muted">Approver and admin roles come with the Team plan.</p>}
          {invites.data && invites.data.invites.length > 0 && (
            <SpecTable
              caption="Pending invites"
              rows={invites.data.invites}
              rowKey={(i) => i.id}
              cols={[
                { key: "e", label: "Email", head: true, render: (i) => i.email },
                { key: "r", label: "Role", width: "8rem", code: true, render: (i) => i.role },
                { key: "x", label: "Expires", width: "10rem", code: true, render: (i) => when(i.expiresAt).slice(0, 11) },
                {
                  key: "c",
                  label: "Revoke",
                  width: "9rem",
                  render: (i) => (
                    <button type="button" className="btn btn-small" onClick={() => flash.run(() => api("DELETE", `/orgs/${org.id}/invites/${i.id}`).then(invites.reload), "Invite revoked.")}>
                      Revoke
                    </button>
                  ),
                },
              ]}
            />
          )}
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              flash.run(() => api("PATCH", `/orgs/${org.id}`, { name }).then(refresh), "Team renamed.");
            }}
          >
            <TextField id="org-name" label="Team name" value={name} onChange={setName} required />
            <Act><button type="submit" className="btn" disabled={!name.trim() || name === org.name}>
              Rename team
            </button></Act>
          </form>
        </section>
      )}
      {flash.view}

      {isAdmin && audit.data && (
        <section className="sheet stack-sm" aria-labelledby="audit-title">
          <h2 id="audit-title">Audit log</h2>
          <SpecTable
            rows={audit.data.entries.slice(0, 100)}
            rowKey={(a) => String(a.id)}
            cols={[
              { key: "t", label: "When (UTC)", width: "12rem", code: true, render: (a) => when(a.at).replace(" UTC", "") },
              { key: "w", label: "Who", width: "12rem", render: (a) => (a.userId ? (names[a.userId] ?? "Former member") : "System") },
              { key: "a", label: "Action", head: true, code: true, render: (a) => a.action },
              { key: "d", label: "Detail", render: (a) => Object.entries(a.meta).map(([k, v]) => `${k}: ${String(v)}`).join(", ") },
            ]}
          />
        </section>
      )}
    </>
  );
}

type Billing = {
  state: "trial" | "active" | "past_due" | "lapsed";
  tier: "starter" | "team";
  trialEndsAt: number;
  paidUntil: number | null;
  provider: string | null;
  checkoutAvailable: boolean;
  checkoutProvider: string;
  period: "month" | "year";
  canManage: boolean;
  portalAvailable: boolean;
  prices: { starter: string; team: string };
};

const PLANS = [
  { tier: "starter" as const, name: "Starter", products: "1 product", people: "3 people" },
  { tier: "team" as const, name: "Team", products: "Up to 5 products", people: "25 people, approver and admin roles" },
];

export function AccountPage() {
  const { me, org, refresh } = useApp();
  const billing = useLoad(() => api<Billing>("GET", `/orgs/${org.id}/billing`), [org.id]);
  const sessions = useLoad(() => api<{ sessions: { current: boolean; createdAt: number; lastSeenAt: number; device: string }[] }>("GET", "/me/sessions"), []);
  const [name, setName] = useState(me.user.name);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [del, setDel] = useState("");
  const [teamName, setTeamName] = useState("");
  const [banner, setBanner] = useState("");
  const flash = useFlash();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("billing");
    if (q === "success") setBanner("Payment received. Your plan activates as soon as the payment provider confirms it, usually within a minute.");
    if (q === "cancelled") setBanner("Checkout was cancelled. Nothing was charged.");
  }, []);

  const checkout = (tier: "starter" | "team") =>
    flash.run(async () => {
      const r = await api<{ url: string }>("POST", `/orgs/${org.id}/billing/checkout`, { tier });
      window.location.assign(r.url);
    });

  const b = billing.data;

  return (
    <>
      <PageTitle label="Account" cells={[me.user.email]} title="Account and billing" lead="Your profile, security, plan and data." />
      {banner && (
        <p className="note-line" role="status">
          {banner}
        </p>
      )}

      <section className="sheet stack-sm" id="billing" aria-labelledby="billing-title">
        <h2 id="billing-title">Plan for {org.name}</h2>
        <ErrorLine error={billing.error} />
        {b && (
          <>
            <SpecTable
              rows={[b]}
              rowKey={() => "b"}
              cols={[
                { key: "s", label: "Status", width: "10rem", render: (x) => <span className={`count-tag ${x.state === "active" ? "is-good" : x.state === "trial" ? "is-partial" : "is-bad"}`}>{x.state === "past_due" ? "Payment due" : x.state}</span> },
                { key: "t", label: "Plan", width: "8rem", code: true, render: (x) => x.tier },
                { key: "u", label: "Paid until", width: "10rem", code: true, render: (x) => (x.paidUntil ? when(x.paidUntil).slice(0, 11) : x.state === "active" ? "Renews monthly" : "None") },
                { key: "tr", label: "Trial ends", width: "10rem", code: true, render: (x) => when(x.trialEndsAt).slice(0, 11) },
                { key: "p", label: "Billed by", render: (x) => x.provider ?? "Not yet" },
              ]}
            />
            {b.canManage ? (
              b.checkoutAvailable ? (
                <div className="plan-pick">
                  {PLANS.map((p) => (
                    <div key={p.tier} className={`plan-cell${b.tier === p.tier && b.state === "active" ? " is-current" : ""}`}>
                      <p className="label">{p.name}</p>
                      <p className="plan-price code">{b.prices[p.tier]}</p>
                      <p className="muted">
                        {p.products} · {p.people}
                      </p>
                      <button type="button" className="btn btn-primary" onClick={() => checkout(p.tier)}>
                        {b.tier === p.tier && b.state === "active" ? (b.period === "year" ? "Extend by a year" : "Current plan") : `Choose ${p.name}`}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="note-line">Online payment is not switched on for this deployment yet. Email us and we will invoice you.</p>
              )
            ) : (
              <p className="muted">Only team owners can change the plan.</p>
            )}
            {b.portalAvailable && b.canManage && (
              <button type="button" className="btn" onClick={() => flash.run(async () => window.location.assign((await api<{ url: string }>("POST", `/orgs/${org.id}/billing/portal`)).url))}>
                Manage payment method and invoices
              </button>
            )}
          </>
        )}
      </section>

      <section className="sheet stack-sm" aria-labelledby="profile-title">
        <h2 id="profile-title">Profile</h2>
        <form className="inline-form" onSubmit={(e) => (e.preventDefault(), flash.run(() => api("PATCH", "/me", { name }).then(refresh), "Name saved."))}>
          <TextField id="me-name" label="Your name" value={name} onChange={setName} required />
          <Act><button type="submit" className="btn" disabled={!name.trim() || name === me.user.name}>
            Save name
          </button></Act>
        </form>
        <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await flash.run(() => api("POST", "/me/password", pw), "Password changed. Other devices were signed out.")) setPw({ current: "", next: "" });
          }}
        >
          <TextField id="pw-cur" label="Current password" type="password" autoComplete="current-password" value={pw.current} onChange={(v) => setPw((x) => ({ ...x, current: v }))} />
          <TextField id="pw-new" label="New password" type="password" autoComplete="new-password" value={pw.next} onChange={(v) => setPw((x) => ({ ...x, next: v }))} hint="At least 12 characters." />
          <Act><button type="submit" className="btn" disabled={!pw.current || pw.next.length < 12}>
            Change password
          </button></Act>
        </form>
      </section>

      <section className="sheet stack-sm" aria-labelledby="sessions-title">
        <div className="row-between">
          <h2 id="sessions-title">Signed-in devices</h2>
          <button type="button" className="btn" onClick={() => flash.run(() => api("DELETE", "/me/sessions").then(sessions.reload), "Signed out of other devices.")}>
            Sign out other devices
          </button>
        </div>
        {sessions.data && (
          <SpecTable
            rows={sessions.data.sessions}
            rowKey={(s) => `${s.createdAt}-${s.device}`}
            cols={[
              { key: "d", label: "Device", head: true, render: (s) => `${s.device.slice(0, 90)}${s.current ? " (this device)" : ""}` },
              { key: "c", label: "Signed in", width: "10rem", code: true, render: (s) => when(s.createdAt).slice(0, 11) },
              { key: "l", label: "Last seen", width: "10rem", code: true, render: (s) => when(s.lastSeenAt).slice(0, 11) },
            ]}
          />
        )}
      </section>

      <section className="sheet stack-sm" aria-labelledby="teams-title">
        <h2 id="teams-title">Teams</h2>
        <SpecTable
          rows={me.orgs}
          rowKey={(o) => o.id}
          cols={[
            { key: "n", label: "Team", head: true, render: (o) => o.name },
            { key: "r", label: "Your role", width: "9rem", code: true, render: (o) => o.role },
            { key: "t", label: "Plan", width: "8rem", code: true, render: (o) => o.tier },
          ]}
        />
        <form className="inline-form" onSubmit={async (e) => (e.preventDefault(), (await flash.run(() => api("POST", "/orgs", { name: teamName }).then(refresh), "Team created.")) && setTeamName(""))}>
          <TextField id="new-team" label="Create another team" value={teamName} onChange={setTeamName} placeholder="Acme Devices GmbH" />
          <Act><button type="submit" className="btn" disabled={!teamName.trim()}>
            Create team
          </button></Act>
        </form>
      </section>

      <section className="sheet stack-sm danger-zone" aria-labelledby="data-title">
        <h2 id="data-title">Your data</h2>
        <div className="row">
          <button type="button" className="btn" onClick={() => flash.run(() => apiDownload("GET", "/me/export"))}>
            Download my data
          </button>
        </div>
        <form className="inline-form" onSubmit={(e) => e.preventDefault()}>
          <TextField id="del-pw" label="Password to delete your account" type="password" autoComplete="current-password" value={del} onChange={setDel} />
          <Act>
            <ConfirmButton
              label="Delete account"
              confirmLabel="Delete for good"
              onConfirm={() =>
                flash.run(async () => {
                  await api("POST", "/me/delete", { password: del });
                  window.location.assign("/");
                })
              }
            />
          </Act>
        </form>
        <p className="muted">Teams where you are the only member are deleted with your account. Make someone else owner first if others remain.</p>
      </section>
      {flash.view}
    </>
  );
}

type Lead = { id: string; name: string; email: string; company: string; makes?: string; sellWhen?: string; plan?: string; notes?: string; createdAt: number };
type AdminOrg = { id: string; name: string; tier: "starter" | "team"; createdAt: number; members: number; products: number };

export function AdminPage() {
  const { me } = useApp();
  const leads = useLoad(() => api<{ leads: Lead[] }>("GET", "/admin/leads"), []);
  const orgs = useLoad(() => api<{ orgs: AdminOrg[] }>("GET", "/admin/orgs"), []);
  const flash = useFlash();
  if (!me.superadmin) return <p className="form-error">Not found.</p>;
  return (
    <>
      <PageTitle label="Admin" title="Early access and teams" lead="Lead details are decrypted only here, for superadmins." />
      <section className="sheet stack-sm">
        <h2>Early-access requests</h2>
        <ErrorLine error={leads.error} />
        {leads.data && (
          <SpecTable
            rows={leads.data.leads}
            rowKey={(l) => l.id}
            cols={[
              {
                key: "w",
                label: "Who",
                head: true,
                render: (l) => (
                  <>
                    <span className="cell-title">
                      {l.name}, {l.company}
                    </span>
                    <span className="cell-body">
                      <a href={`mailto:${l.email}`}>{l.email}</a>
                    </span>
                  </>
                ),
              },
              { key: "p", label: "Plan", width: "8rem", code: true, render: (l) => l.plan || "Not sure" },
              { key: "m", label: "Makes", width: "12rem", render: (l) => l.makes ?? "" },
              { key: "n", label: "Notes", render: (l) => l.notes ?? "" },
              { key: "d", label: "Received", width: "9rem", code: true, render: (l) => when(l.createdAt).slice(0, 11) },
              {
                key: "x",
                label: "Delete",
                width: "9rem",
                render: (l) => <ConfirmButton label="Delete" confirmLabel="Confirm" onConfirm={() => flash.run(() => api("DELETE", `/admin/leads/${l.id}`).then(leads.reload))} />,
              },
            ]}
          />
        )}
      </section>
      <section className="sheet stack-sm">
        <h2>Teams</h2>
        {orgs.data && (
          <SpecTable
            rows={orgs.data.orgs}
            rowKey={(o) => o.id}
            cols={[
              { key: "n", label: "Team", head: true, render: (o) => o.name },
              { key: "m", label: "People", width: "7rem", code: true, render: (o) => o.members },
              { key: "p", label: "Products", width: "8rem", code: true, render: (o) => o.products },
              { key: "c", label: "Created", width: "9rem", code: true, render: (o) => when(o.createdAt).slice(0, 11) },
              {
                key: "t",
                label: "Grant plan",
                width: "12rem",
                render: (o) => (
                  <select className="cell-select" aria-label={`Plan for ${o.name}`} value={o.tier} onChange={(e) => flash.run(() => api("PATCH", `/admin/orgs/${o.id}`, { tier: e.target.value }).then(orgs.reload), "Plan granted.")}>
                    <option value="starter">starter</option>
                    <option value="team">team</option>
                  </select>
                ),
              },
            ]}
          />
        )}
      </section>
      {flash.view}
    </>
  );
}
