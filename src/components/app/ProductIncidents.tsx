"use client";

import { useEffect, useRef, useState } from "react";
import { SelectField, TextField } from "@/components/plan/fields";
import { IncidentDetailsFields, type CaseFields } from "@/components/tools/IncidentDetails";
import { SpecTable } from "@/components/structure";
import { fromLocalInput, IncidentClock, toLocalInput, type TimeField } from "@/components/tools/IncidentClock";
import { api } from "@/lib/client/api";
import { formatRemaining, incidentMilestones, nextDeadline, type IncidentKind, type IncidentTimes } from "@/lib/incidents";
import type { Plan } from "@/lib/plan/model";
import { Act, ErrorLine, useLoad, when } from "@/components/app/AppShell";

type IncidentData = {
  title: string;
  summary?: string;
  productVersion?: string;
  marketStates?: string[];
  exploitNature?: string;
  severity?: string;
  impact?: string;
  maliciousActor?: string;
  suspectedMalicious?: boolean;
  manufacturer?: string;
  memberState?: string;
  contact?: string;
  rootCause?: string;
  measuresTaken?: string;
  userMeasures?: string;
  correctiveMeasure?: string;
  sensitivity?: "low" | "medium" | "high";
  srpReference?: string;
};
// In an update, "" or null clears a stored value.
type DataPatch = Partial<Omit<IncidentData, "suspectedMalicious">> & { suspectedMalicious?: boolean | null };
type Incident = { id: string; kind: IncidentKind; times: IncidentTimes; data: IncidentData; createdAt: number; updatedAt: number };

export function ProductIncidents({ productId, productName, canEdit }: { productId: string; productName: string; canEdit: boolean }) {
  const list = useLoad(() => api<{ incidents: Incident[] }>("GET", `/products/${productId}/incidents`), [productId]);
  const plan = useLoad(() => api<{ plan: Plan }>("GET", `/products/${productId}/plan`), [productId]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const incidents = list.data?.incidents ?? [];
  const current = incidents.find((i) => i.id === selected) ?? incidents.find((i) => !i.times.closedAt) ?? null;

  const [kind, setKind] = useState<IncidentKind>("vulnerability");
  const [title, setTitle] = useState("");
  const [aware, setAware] = useState("");
  useEffect(() => setAware(toLocalInput(Date.now())), []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api<{ id: string }>("POST", `/products/${productId}/incidents`, { kind, awareAt: fromLocalInput(aware), data: { title } });
      setTitle("");
      setSelected(res.id);
      list.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const patch = async (body: { times?: Partial<Record<TimeField, number | null>>; data?: DataPatch }) => {
    if (!current) return;
    setError("");
    try {
      const updated = await api<Incident>("PATCH", `/products/${productId}/incidents/${current.id}`, body);
      list.setData((d) => (d ? { incidents: d.incidents.map((i) => (i.id === updated.id ? updated : i)) } : d));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const p = plan.data?.plan;
  const defaults: CaseFields = { productVersion: p?.product.version, manufacturer: p?.product.manufacturer, memberState: p?.updates.csirtCountry, contact: p?.vulns.contact };
  const now = Date.now();

  return (
    <div className="stack-flow">
      <section className="stack-sm">
        <h2>Incident clock</h2>
        <p className="muted">
          Actively exploited vulnerabilities and severe incidents must be reported to ENISA&apos;s Single Reporting Platform: an early warning within 24 hours, a notification within
          72 hours and a final report later. Open a case the moment you become aware.
        </p>
        {incidents.length > 0 && (
          <SpecTable
            rows={incidents}
            rowKey={(i) => i.id}
            rowClass={(i) => (i.id === current?.id ? "is-strong" : i.times.closedAt ? "is-out" : undefined)}
            cols={[
              {
                key: "t",
                label: "Case",
                head: true,
                render: (i) => (
                  <button type="button" className="link-btn" onClick={() => setSelected(i.id)}>
                    {i.data.title}
                  </button>
                ),
              },
              { key: "k", label: "Kind", width: "9rem", code: true, render: (i) => (i.kind === "vulnerability" ? "Exploited vuln" : "Severe incident") },
              { key: "a", label: "Aware", width: "10rem", code: true, render: (i) => when(i.times.awareAt).slice(0, 18) },
              {
                key: "n",
                label: "Next deadline",
                width: "12rem",
                render: (i) => {
                  if (i.times.closedAt) return <span className="count-tag is-neutral">Closed</span>;
                  const next = nextDeadline(incidentMilestones(i.kind, i.times, now));
                  if (!next || next.remainingMs === null) return <span className="count-tag is-good">None open</span>;
                  return <span className={`count-tag ${next.state === "overdue" ? "is-bad" : "is-partial"}`}>{formatRemaining(next.remainingMs)}</span>;
                },
              },
            ]}
          />
        )}
        <ErrorLine error={error || list.error} />
      </section>

      {canEdit && (
        <section className="stack-sm" aria-labelledby="new-case-title">
          <h3 id="new-case-title">{incidents.length ? "Open a new case" : "Open your first case"}</h3>
          <form className="inline-form incident-form" onSubmit={create}>
            <SelectField<IncidentKind>
              id="in-kind"
              label="What happened"
              value={kind}
              options={[
                { value: "vulnerability", label: "Actively exploited vulnerability" },
                { value: "incident", label: "Severe incident" },
              ]}
              onChange={setKind}
            />
            <TextField id="in-title" label="Short title" value={title} onChange={setTitle} required placeholder="Auth bypass exploited in v2.4" />
            <TextField id="in-aware" label="Became aware" type="datetime-local" value={aware} onChange={setAware} required hint="Your local time." />
            <Act><button type="submit" className="btn btn-primary" disabled={!title.trim() || !aware}>
              Start the clock
            </button></Act>
          </form>
        </section>
      )}
      {current && (
        <section className="stack-sm case-panel" aria-labelledby="case-title">
          <div className="row-between">
            <h3 id="case-title">
              <span className="label">Case</span> {current.data.title}
            </h3>
            {canEdit && (
              <button type="button" className="btn" onClick={() => patch({ times: { closedAt: current.times.closedAt ? null : Date.now() } })}>
                {current.times.closedAt ? "Reopen case" : "Close case"}
              </button>
            )}
          </div>
          <IncidentClock
            kind={current.kind}
            times={current.times}
            readOnly={!canEdit}
            onTime={(field, ms) => patch({ times: { [field]: ms } })}
            draft={{ ...current.data, ...withPlanDefaults(current.data, defaults), productName, awareAt: current.times.awareAt }}
          />
          {canEdit && <CaseDetails key={current.id} kind={current.kind} data={withPlanDefaults(current.data, defaults)} onSave={(data) => patch({ data })} />}
        </section>
      )}
    </div>
  );
}

// Case values win; empty ones fall back to what the product's plan already says.
function withPlanDefaults(data: IncidentData, defaults: CaseFields): IncidentData {
  return {
    ...data,
    productVersion: data.productVersion || defaults.productVersion,
    manufacturer: data.manufacturer || defaults.manufacturer,
    memberState: data.memberState || defaults.memberState,
    contact: data.contact || defaults.contact,
  };
}

function CaseDetails({ kind, data, onSave }: { kind: IncidentKind; data: IncidentData; onSave: (d: DataPatch) => void }) {
  const [d, setD] = useState<IncidentData>(data);
  const [dirty, setDirty] = useState(false);
  const ref = useRef<HTMLDetailsElement>(null);
  // Open while the 24-hour warning still lacks something, and whenever a "case details" link is followed.
  const missing = !data.summary || !data.manufacturer || !data.memberState || !data.marketStates?.length;
  useEffect(() => {
    const reveal = () => {
      if (window.location.hash === "#case-details" && ref.current) ref.current.open = true;
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);
  const change = (patch: Partial<CaseFields>) => {
    setD((x) => ({ ...x, ...patch }) as IncidentData);
    setDirty(true);
  };
  const save = () => {
    // Send every field, with "" or null for cleared ones, so clearing a value sticks.
    const { title: _t, ...fields } = d;
    onSave({ ...fields, suspectedMalicious: d.suspectedMalicious ?? null });
    setDirty(false);
  };
  return (
    <details ref={ref} className="template case-details" id="case-details" open={missing}>
      <summary>
        <span className="label">Case details for the reports</span>
        <span className="muted">Fill these once; every draft above uses them.</span>
      </summary>
      <IncidentDetailsFields idPrefix="cd" kind={kind} value={d} onChange={change} askReference />
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty}>
          Save case details
        </button>
        {dirty && <span className="muted">Unsaved changes</span>}
      </div>
    </details>
  );
}
