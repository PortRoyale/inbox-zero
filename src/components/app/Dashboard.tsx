"use client";

import { useState } from "react";
import { industries } from "@/content/industries";
import { SelectField, TextField } from "@/components/plan/fields";
import { SpecTable } from "@/components/structure";
import { api } from "@/lib/client/api";
import { Act, can, ErrorLine, PageTitle, planLabel, useApp, useLoad, when } from "@/components/app/AppShell";

type ProductSummary = {
  id: string;
  name: string;
  industry: string;
  archived: boolean;
  updatedAt: number;
  planVersion: number;
  summary: { completeness: number; gaps: number; blockers: number; actions: number } | null;
  findings: Record<string, number> | null;
  openIncidents: number;
};

type Billing = { state: "trial" | "active" | "past_due" | "lapsed"; tier: string; trialEndsAt: number; paidUntil: number | null; checkoutAvailable: boolean; canManage: boolean };

export function Dashboard() {
  const { org } = useApp();
  const [showArchived, setShowArchived] = useState(false);
  const products = useLoad(() => api<{ products: ProductSummary[] }>("GET", `/orgs/${org.id}/products${showArchived ? "?archived=1" : ""}`), [org.id, showArchived]);
  const billing = useLoad(() => api<Billing>("GET", `/orgs/${org.id}/billing`), [org.id]);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api<{ id: string }>("POST", `/orgs/${org.id}/products`, { name, industry: industry || undefined });
      window.location.assign(`/app/product/?id=${res.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const list = products.data?.products ?? [];
  const b = billing.data;

  return (
    <>
      <PageTitle label="Workspace" cells={[org.name, planLabel(org), org.role]} title="Products" lead="Every product has its own security plan, release records, SBOM watch and incident clock." />

      {b && b.state !== "active" && (
        <section className={`sheet billing-banner is-${b.state}`} role="status">
          <p>
            {b.state === "trial" && (
              <>
                <strong>Free trial</strong> until {when(b.trialEndsAt).slice(0, 11)}. Choose a plan to keep editing after that; reading and exporting always stay available.
              </>
            )}
            {b.state === "past_due" && (
              <>
                <strong>Payment failed.</strong> Update your payment method to keep your plan active.
              </>
            )}
            {b.state === "lapsed" && (
              <>
                <strong>Read-only.</strong> Your trial or plan has ended. You can still read, export and report incidents.
              </>
            )}
          </p>
          <a className="btn btn-primary" href="/app/account/#billing">
            {b.canManage ? "Choose a plan" : "See billing"}
          </a>
        </section>
      )}

      <section className="sheet stack-sm" aria-labelledby="products-title">
        <div className="row-between">
          <h2 id="products-title">Your products</h2>
          <label className="cell-check" htmlFor="show-archived">
            <input id="show-archived" type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            <span>Show archived</span>
          </label>
        </div>
        <ErrorLine error={products.error} />
        {products.data && list.length === 0 && <p className="muted">No products yet. Add your first one below; its plan starts preset for its sector.</p>}
        {list.length > 0 && (
          <SpecTable
            className="product-table"
            rows={list}
            rowKey={(p) => p.id}
            rowClass={(p) => (p.archived ? "is-out" : undefined)}
            cols={[
              { key: "name", label: "Product", head: true, render: (p) => <a href={`/app/product/?id=${p.id}`}>{p.name}</a> },
              {
                key: "plan",
                label: "Plan",
                width: "11rem",
                render: (p) =>
                  p.summary ? (
                    <span className="mini-gauge">
                      <span className="gauge" aria-hidden="true">
                        <span style={{ width: `${p.summary.completeness}%`, ["--pct" as string]: p.summary.completeness }} />
                      </span>
                      <span className="code">{p.summary.completeness}%</span>
                    </span>
                  ) : (
                    "Not started"
                  ),
              },
              {
                key: "gaps",
                label: "Plan gaps",
                width: "9rem",
                render: (p) => {
                  const g = p.summary?.gaps ?? 0;
                  return <span className={`count-tag ${g ? "is-bad" : "is-good"}`}>{g ? `${g} open` : "None"}</span>;
                },
              },
              {
                key: "vulns",
                label: "Open vulns",
                width: "9rem",
                render: (p) => {
                  if (!p.findings) return <span className="muted">No SBOM</span>;
                  const serious = (p.findings.critical ?? 0) + (p.findings.high ?? 0);
                  const all = Object.values(p.findings).reduce((a, n) => a + n, 0);
                  return <span className={`count-tag ${serious ? "is-bad" : all ? "is-partial" : "is-good"}`}>{serious ? `${serious} serious` : all ? `${all} open` : "None"}</span>;
                },
              },
              {
                key: "inc",
                label: "Incidents",
                width: "8rem",
                render: (p) => <span className={`count-tag ${p.openIncidents ? "is-bad" : "is-good"}`}>{p.openIncidents ? `${p.openIncidents} open` : "None"}</span>,
              },
              { key: "updated", label: "Updated", width: "10rem", code: true, render: (p) => when(p.updatedAt).slice(0, 11) },
            ]}
          />
        )}
      </section>

      {can(org.role, "editor") && (
        <section className="sheet stack-sm" aria-labelledby="new-product">
          <h2 id="new-product">Add a product</h2>
          <form className="inline-form" onSubmit={create}>
            <TextField id="np-name" label="Product name" value={name} onChange={setName} required placeholder="Smart thermostat" />
            <SelectField
              id="np-industry"
              label="Sector"
              value={industry}
              options={[{ value: "", label: "Choose later" }, ...industries.map((i) => ({ value: i.slug, label: i.name }))]}
              onChange={setIndustry}
            />
            <Act><button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
              {busy ? "Adding…" : "Add product"}
            </button></Act>
          </form>
          <ErrorLine error={error} />
        </section>
      )}
    </>
  );
}
