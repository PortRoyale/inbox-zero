"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ApiError, api, loginUrl } from "@/lib/client/api";
import { site } from "@/lib/site";

export type Role = "owner" | "admin" | "approver" | "editor" | "viewer";
export type Org = { id: string; name: string; tier: "starter" | "team"; role: Role; trial: boolean };
export const planLabel = (o: { tier: string; trial?: boolean }) => (o.trial ? "Team trial" : `${o.tier} plan`);
export type Me = { user: { id: string; email: string; name: string; emailVerified: boolean }; orgs: Org[]; superadmin: boolean };

const RANK: Record<Role, number> = { owner: 4, admin: 3, approver: 2, editor: 1, viewer: 0 };
export const can = (role: Role | undefined, min: Role) => !!role && RANK[role] >= RANK[min];

type Ctx = { me: Me; org: Org; setOrgId: (id: string) => void; refresh: () => Promise<void> };
const AppContext = createContext<Ctx | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside AppShell");
  return ctx;
}

const ORG_KEY = "readyline-org";

export function AppShell({ current, children }: { current: "products" | "team" | "account" | "admin"; children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [orgId, setOrgIdState] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api<Me>("GET", "/me");
      setMe(data);
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(ORG_KEY);
      } catch {
        // Storage is optional.
      }
      setOrgIdState((prev) => prev ?? (data.orgs.some((o) => o.id === stored) ? stored : (data.orgs[0]?.id ?? null)));
    } catch (e) {
      if ((e as ApiError).status === 401) window.location.assign(loginUrl(window.location.pathname + window.location.search));
      else setError((e as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setOrgId = (id: string) => {
    setOrgIdState(id);
    try {
      localStorage.setItem(ORG_KEY, id);
    } catch {
      // Storage is optional.
    }
  };

  const signOut = async () => {
    await api("POST", "/auth/logout").catch(() => {});
    window.location.assign("/login/");
  };

  if (error) {
    return (
      <main className="wrap app-main">
        <p className="form-error" role="alert">
          {error}
        </p>
      </main>
    );
  }
  if (!me) {
    return (
      <main className="wrap app-main" aria-busy="true">
        <p className="muted">Loading your workspace…</p>
      </main>
    );
  }
  const org = me.orgs.find((o) => o.id === orgId) ?? me.orgs[0];

  const nav = [
    { id: "products", href: "/app/", label: "Products" },
    { id: "team", href: "/app/team/", label: "Team" },
    { id: "account", href: "/app/account/", label: "Account" },
    ...(me.superadmin ? [{ id: "admin", href: "/admin/", label: "Admin" }] : []),
  ];

  return (
    <>
      <header className="masthead app-masthead">
        <div className="wrap">
          <a className="wordmark" href="/" aria-label={`${site.name} home`}>
            <span aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" className="logo-mark">
                <path d="M10 2.6 A7.4 7.4 0 0 1 17.4 10" className="mark-q1" fill="none" strokeWidth="2.6" />
                <path d="M17.4 10 A7.4 7.4 0 0 1 10 17.4" className="mark-q2" fill="none" strokeWidth="2.6" />
                <path d="M10 17.4 A7.4 7.4 0 0 1 2.6 10" className="mark-q3" fill="none" strokeWidth="2.6" />
                <path d="M2.6 10 A7.4 7.4 0 0 1 10 2.6" className="mark-q4" fill="none" strokeWidth="2.6" />
                <path d="M10 0v20M0 10h20" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </span>
            <span>{site.name.toUpperCase()}</span>
          </a>
          <nav aria-label="Workspace">
            {nav.map((n) => (
              <a key={n.id} href={n.href} aria-current={n.id === current ? "page" : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="app-who">
            {me.orgs.length > 1 && org ? (
              <label className="org-switch">
                <span className="visually-hidden">Team</span>
                <select value={org.id} onChange={(e) => setOrgId(e.target.value)}>
                  {me.orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              org && <span className="app-org">{org.name}</span>
            )}
            <button type="button" className="btn btn-quiet" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="wrap stack app-main" data-tool="plan">
        {!org ? (
          <section className="sheet">
            <h1>No team yet</h1>
            <p>You are not a member of any team. Ask a teammate for an invite, or create a team in your account settings.</p>
            <a className="btn btn-primary" href="/app/account/">
              Account settings
            </a>
          </section>
        ) : (
          <AppContext.Provider value={{ me, org, setOrgId, refresh: load }}>{children}</AppContext.Provider>
        )}
      </main>
    </>
  );
}

export function PageTitle({ label, cells, title, lead, actions }: { label: string; cells?: string[]; title: string; lead?: string; actions?: React.ReactNode }) {
  return (
    <section className="sheet app-title">
      <div>
        <p className="fcf">
          <span className="fcf-key">{label}</span>
          {cells?.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </p>
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {actions && <div className="app-title-actions">{actions}</div>}
    </section>
  );
}

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setError("");
    fn()
      .then((d) => live && setData(d))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, reload: () => setTick((t) => t + 1), setData };
}

/** A form button that sits on the same line as the inputs beside it (label, control and hint rows). */
export function Act({ children }: { children: React.ReactNode }) {
  return (
    <div className="field form-action">
      <span className="label" aria-hidden="true">
        &nbsp;
      </span>
      {children}
    </div>
  );
}

export function ErrorLine({ error }: { error: string }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}

export const when = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "";
