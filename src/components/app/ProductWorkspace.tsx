"use client";

import { useEffect, useState } from "react";
import { TextField } from "@/components/plan/fields";
import { PlanBuilder } from "@/components/plan/PlanBuilder";
import { ConfirmButton, CopyButton } from "@/components/primitives";
import { ReleaseGate } from "@/components/ReleaseGate";
import { SpecTable } from "@/components/structure";
import { api, apiDownload } from "@/lib/client/api";
import type { Plan } from "@/lib/plan/model";
import { Act, can, ErrorLine, PageTitle, useApp, useLoad, when } from "@/components/app/AppShell";
import { ProductIncidents } from "@/components/app/ProductIncidents";
import { ProductSbom } from "@/components/app/ProductSbom";

type PlanResponse = { productName: string; archived: boolean; role: string; tier: string; orgId: string; plan: Plan; version: number; updatedAt: number };
type Revision = { id: string; rev: string; fingerprint: string; statement: Record<string, unknown> & { approver: string; issuedAt: string; summary: string }; signature: Record<string, unknown> & { kid: string; alg: string }; createdAt: number };
type Release = { id: string; version: string; ticket: string; outcomes: { id: string; title: string; outcome: string; reason: string }[]; triggers: { id: string; note: string }[]; createdAt: number };

const TABS = ["plan", "revisions", "releases", "sbom", "incidents", "evidence", "settings"] as const;
type Tab = (typeof TABS)[number];

// Section tabs as one row of equal cells across the top, so the plan builder keeps its own step rail.
function WorkspaceTabs({ items, value, onChange }: { items: { id: string; label: string; content: React.ReactNode }[]; value: number; onChange: (i: number) => void }) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const map: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = (map[e.key] + items.length) % items.length;
    onChange(next);
    document.getElementById(`ws-tab-${items[next].id}`)?.focus();
  };
  return (
    <div className="ws-tabs">
      <div className="ws-tablist" role="tablist" aria-label="Product sections">
        {items.map((it, i) => (
          <button
            key={it.id}
            id={`ws-tab-${it.id}`}
            type="button"
            role="tab"
            aria-selected={i === value}
            aria-controls={`ws-panel-${it.id}`}
            tabIndex={i === value ? 0 : -1}
            className="ws-tab"
            onClick={() => onChange(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="ws-tab-no code">{String(i + 1).padStart(2, "0")}</span>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
      {items.map((it, i) => (
        <div key={it.id} id={`ws-panel-${it.id}`} role="tabpanel" aria-labelledby={`ws-tab-${it.id}`} hidden={i !== value} className={it.id === "plan" ? "ws-panel is-plan" : "ws-panel sheet"}>
          {i === value ? it.content : null}
        </div>
      ))}
    </div>
  );
}

export function ProductWorkspace() {
  const { org } = useApp();
  const [productId, setProductId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("plan");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setProductId(q.get("id"));
    const t = q.get("tab") as Tab | null;
    if (t && TABS.includes(t)) setTab(t);
  }, []);
  const plan = useLoad(() => (productId ? api<PlanResponse>("GET", `/products/${productId}/plan`) : Promise.resolve(null)), [productId]);

  const changeTab = (i: number) => {
    const t = TABS[i];
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url);
  };

  if (!productId) return <p className="muted">Choose a product from your list.</p>;
  if (plan.error) {
    return (
      <section className="sheet">
        <ErrorLine error={plan.error} />
        <a className="btn" href="/app/">
          Back to products
        </a>
      </section>
    );
  }
  if (!plan.data) return <p className="muted">Loading the product…</p>;
  const p = plan.data;
  const role = org.role;
  // Archived products are read-only, apart from incidents, export, restore and delete.
  const edit = can(role, "editor") && !p.archived;

  return (
    <>
      <PageTitle
        label="Product"
        cells={[org.name, `v${p.version}`, role, ...(p.archived ? ["Archived"] : [])]}
        title={p.productName}
        lead={`Last saved ${when(p.updatedAt)}.`}
        actions={
          <a className="btn" href="/app/">
            All products
          </a>
        }
      />
      {p.archived && (
        <div className="note-line row-between archived-banner">
          <p>
            <strong>Archived.</strong> Everything stays readable and exportable, and incidents can still be reported. Restore it to edit the plan, releases and SBOMs.
          </p>
          {can(role, "admin") && (
            <button type="button" className="btn btn-small" onClick={() => changeTab(TABS.indexOf("settings"))}>
              Go to settings
            </button>
          )}
        </div>
      )}
      <WorkspaceTabs
        value={TABS.indexOf(tab)}
        onChange={changeTab}
        items={[
          {
            id: "plan",
            label: "Security plan",
            content:
              tab === "plan" ? (
                <PlanBuilder cloud={{ productId, initialPlan: p.plan, initialVersion: p.version, canEdit: edit, canApprove: can(role, "approver") && !p.archived }} />
              ) : null,
          },
          { id: "revisions", label: "Signed revisions", content: tab === "revisions" ? <Revisions productId={productId} onOpenPlan={() => changeTab(0)} /> : null },
          { id: "releases", label: "Release records", content: tab === "releases" ? <Releases productId={productId} productName={p.productName} canEdit={edit} /> : null },
          { id: "sbom", label: "SBOM watch", content: tab === "sbom" ? <ProductSbom productId={productId} canEdit={edit} canDelete={can(role, "admin")} /> : null },
          { id: "incidents", label: "Incident clock", content: tab === "incidents" ? <ProductIncidents productId={productId} productName={p.productName} canEdit={can(role, "editor")} /> : null },
          { id: "evidence", label: "Evidence export", content: tab === "evidence" ? <Evidence productId={productId} canExport={can(role, "editor")} /> : null },
          { id: "settings", label: "Settings", content: tab === "settings" ? <Settings productId={productId} name={p.productName} archived={p.archived} onChanged={plan.reload} canEdit={edit} isAdmin={can(role, "admin")} /> : null },
        ]}
      />
    </>
  );
}

function Revisions({ productId, onOpenPlan }: { productId: string; onOpenPlan: () => void }) {
  const revs = useLoad(() => api<{ revisions: Revision[] }>("GET", `/products/${productId}/revisions`), [productId]);
  return (
    <div className="stack-sm">
      <h2>Signed revisions</h2>
      <p className="muted">
        Each revision fingerprints the plan with SHA-512 and is signed by the server with Ed25519 and ML-DSA-65. Issue one from the plan's Review step. Anyone can check a
        signed statement on the <a href="/verify-signature/">verification page</a>.
      </p>
      <ErrorLine error={revs.error} />
      {revs.data && revs.data.revisions.length === 0 && (
        <div className="note-line row-between">
          <p>No revisions yet. Revision A is issued from step 8, Review and export, once an approver is happy with the plan.</p>
          <button type="button" className="btn btn-small" onClick={onOpenPlan}>
            Open the plan
          </button>
        </div>
      )}
      {revs.data && revs.data.revisions.length > 0 && (
        <SpecTable
          rows={revs.data.revisions}
          rowKey={(r) => r.id}
          cols={[
            { key: "rev", label: "Rev", width: "4.5rem", code: true, render: (r) => r.rev },
            {
              key: "what",
              label: "Change",
              head: true,
              render: (r) => (
                <>
                  <span className="cell-title">{r.statement.summary}</span>
                  <span className="cell-body">
                    Approved by {r.statement.approver} · {when(r.createdAt)}
                  </span>
                </>
              ),
            },
            { key: "fp", label: "Fingerprint", width: "12rem", code: true, render: (r) => `${r.fingerprint.slice(0, 16)}…` },
            { key: "key", label: "Key", width: "9rem", code: true, render: (r) => r.signature.kid },
            {
              key: "copy",
              label: "Statement",
              width: "11rem",
              render: (r) => <CopyButton label="Copy signed" getText={() => JSON.stringify({ statement: r.statement, signature: r.signature }, null, 2)} />,
            },
          ]}
        />
      )}
    </div>
  );
}

function Releases({ productId, productName, canEdit }: { productId: string; productName: string; canEdit: boolean }) {
  const list = useLoad(() => api<{ releases: Release[] }>("GET", `/products/${productId}/releases`), [productId]);
  return (
    <div className="stack-flow">
      <div className="stack-sm">
        <h2>Release records</h2>
        <ErrorLine error={list.error} />
        {list.data && list.data.releases.length === 0 && <p className="note-line">No releases recorded yet. Gate your next release below and save the record.</p>}
        {list.data && list.data.releases.length > 0 && (
          <SpecTable
            rows={list.data.releases}
            rowKey={(r) => r.id}
            cols={[
              { key: "v", label: "Version", width: "8rem", code: true, render: (r) => r.version },
              { key: "ticket", label: "Change", width: "9rem", code: true, render: (r) => r.ticket || "None" },
              {
                key: "testing",
                label: "Testing required",
                head: true,
                render: (r) => {
                  const required = r.outcomes.filter((o) => o.outcome === "required" || o.outcome === "blocked");
                  return required.length ? required.map((o) => o.title.split(":")[0]).join(", ") : "No extra testing";
                },
              },
              { key: "triggers", label: "Triggers", width: "8rem", code: true, render: (r) => (r.triggers.length ? r.triggers.map((t) => t.id).join(" ") : "None") },
              { key: "when", label: "Recorded", width: "10rem", code: true, render: (r) => when(r.createdAt).slice(0, 11) },
            ]}
          />
        )}
      </div>
      {canEdit ? (
        <ReleaseGate
          embedded={{
            productId,
            productName,
            onSave: async (r) => {
              await api("POST", `/products/${productId}/releases`, { versionLabel: r.versionLabel, ticket: r.ticket, answers: r.answers, notes: r.notes });
              list.reload();
            },
          }}
        />
      ) : (
        <p className="note-line">Your role can read release records but not add them.</p>
      )}
    </div>
  );
}

function Evidence({ productId, canExport }: { productId: string; canExport: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      await apiDownload("POST", `/products/${productId}/export`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack-sm">
      <h2>Evidence export</h2>
      <p>One file with everything an auditor or notified body asks for: the plan, signed revisions, release records, SBOM checks and findings, and incident timelines.</p>
      <SpecTable
        rows={[
          { what: "Bundle", how: "JSON with the plan, revisions, releases, SBOM summaries and incidents." },
          { what: "Manifest", how: "SHA-512 digest of the bundle, product, date and contents list." },
          { what: "Signature", how: "Ed25519 and ML-DSA-65 over the manifest; valid only if both verify." },
          { what: "Verification", how: "Paste the file on the public verification page to check signature and digest." },
        ]}
        rowKey={(r) => r.what}
        cols={[
          { key: "what", label: "Part", width: "10rem", head: true, render: (r) => r.what },
          { key: "how", label: "What it holds", render: (r) => r.how },
        ]}
      />
      <div className="row">
        {canExport ? (
          <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>
            {busy ? "Preparing…" : "Download signed evidence"}
          </button>
        ) : (
          <p className="note-line">Editors and above can export evidence.</p>
        )}
        <a className="btn btn-quiet" href="/verify-signature/">
          Verify a file
        </a>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

function Settings({ productId, name, archived, onChanged, canEdit, isAdmin }: { productId: string; name: string; archived: boolean; onChanged: () => void; canEdit: boolean; isAdmin: boolean }) {
  const [newName, setNewName] = useState(name);
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setError("");
    setMsg("");
    try {
      await fn();
      setMsg(done);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="stack-flow">
      <section className="stack-sm">
        <h2>Product settings</h2>
        {canEdit && (
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => api("PATCH", `/products/${productId}`, { name: newName }), "Renamed.");
            }}
          >
            <TextField id="ps-name" label="Product name" value={newName} onChange={setNewName} required />
            <Act><button type="submit" className="btn" disabled={!newName.trim() || newName === name}>
              Rename
            </button></Act>
          </form>
        )}
      </section>
      {isAdmin && (
        <section className="stack-sm danger-zone">
          <h3>Archive or delete</h3>
          <p className="muted">Archiving keeps everything readable and frees a product slot. Deleting removes the plan, revisions, records, SBOMs and incidents for good.</p>
          <div className="row">
            {archived ? (
              <button type="button" className="btn" onClick={() => act(() => api("PATCH", `/products/${productId}`, { archived: false }).then(onChanged), "Restored.")}>
                Restore product
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => act(() => api("PATCH", `/products/${productId}`, { archived: true }).then(onChanged), "Archived. It stays readable.")}>
                Archive product
              </button>
            )}
          </div>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <TextField id="ps-confirm" label={`Type "${name}" to delete`} value={confirm} onChange={setConfirm} />
            <Act>
              <ConfirmButton
                label="Delete product"
                confirmLabel="Delete for good"
                onConfirm={() =>
                  act(async () => {
                    await api("POST", `/products/${productId}/delete`, { confirmName: confirm });
                    window.location.assign("/app/");
                  }, "Deleted.")
                }
              />
            </Act>
          </form>
        </section>
      )}
      {msg && <p className="note-line">{msg}</p>}
      <ErrorLine error={error} />
    </div>
  );
}
