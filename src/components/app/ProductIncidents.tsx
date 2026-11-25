"use client";

import { useEffect, useState } from "react";
import { AreaField, SelectField, TextField } from "@/components/plan/fields";
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
  rootCause?: string;
  measuresTaken?: string;
  userMeasures?: string;
  correctiveMeasure?: string;
  sensitivity?: "low" | "medium" | "high";
  srpReference?: string;
};
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

  const patch = async (body: { times?: Partial<Record<TimeField, number | null>>; data?: Partial<IncidentData> }) => {
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
  const now = Date.now();

  return (
    <div className="stack">
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
        {canEdit && (
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
        )}
        <ErrorLine error={error || list.error} />
      </section>

      {current && (
        <section className="stack-sm" aria-labelledby="case-title">
          <div className="row-between">
            <h3 id="case-title">{current.data.title}</h3>
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
            draft={{
              productName,
              productVersion: current.data.productVersion ?? p?.product.version,
              manufacturer: p?.product.manufacturer,
              memberState: p?.updates.csirtCountry,
              contact: p?.vulns.contact,
              awareAt: current.times.awareAt,
              ...current.data,
            }}
          />
          {canEdit && <CaseDetails key={current.id} data={current.data} onSave={(data) => patch({ data })} />}
        </section>
      )}
    </div>
  );
}

function CaseDetails({ data, onSave }: { data: IncidentData; onSave: (d: Partial<IncidentData>) => void }) {
  const [d, setD] = useState<IncidentData>(data);
  const set = (k: keyof IncidentData) => (v: string) => setD((x) => ({ ...x, [k]: v }));
  return (
    <details className="template case-details" open={!data.summary}>
      <summary>
        <span className="label">Case details for the reports</span>
        <span className="muted">Fill these once; every draft above uses them.</span>
      </summary>
      <div className="form-grid">
        <div className="span-2">
          <AreaField id="cd-summary" label="Summary" rows={2} value={d.summary ?? ""} onChange={set("summary")} placeholder="What happened, in two sentences." />
        </div>
        <TextField id="cd-version" label="Affected versions" value={d.productVersion ?? ""} onChange={set("productVersion")} placeholder="2.0 to 2.4.1" />
        <TextField id="cd-severity" label="Severity" value={d.severity ?? ""} onChange={set("severity")} placeholder="High, CVSS 8.1" />
        <TextField id="cd-states" label="Member States where sold" value={(d.marketStates ?? []).join(", ")} onChange={(v) => setD((x) => ({ ...x, marketStates: v.split(",").map((s) => s.trim()).filter(Boolean) }))} placeholder="Germany, France" />
        <SelectField<"" | "low" | "medium" | "high">
          id="cd-sens"
          label="Sensitivity of the information"
          value={d.sensitivity ?? ""}
          options={[
            { value: "", label: "Choose" },
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
          onChange={(v) => setD((x) => ({ ...x, sensitivity: v || undefined }))}
        />
        <div className="span-2">
          <AreaField id="cd-nature" label="Nature of the exploit or incident" rows={2} value={d.exploitNature ?? ""} onChange={set("exploitNature")} />
        </div>
        <div className="span-2">
          <AreaField id="cd-impact" label="Impact" rows={2} value={d.impact ?? ""} onChange={set("impact")} />
        </div>
        <div className="span-2">
          <AreaField id="cd-taken" label="Measures taken" rows={2} value={d.measuresTaken ?? ""} onChange={set("measuresTaken")} />
        </div>
        <div className="span-2">
          <AreaField id="cd-users" label="What users can do" rows={2} value={d.userMeasures ?? ""} onChange={set("userMeasures")} />
        </div>
        <div className="span-2">
          <AreaField id="cd-fix" label="Security update or corrective measure" rows={2} value={d.correctiveMeasure ?? ""} onChange={set("correctiveMeasure")} />
        </div>
        <TextField id="cd-root" label="Root cause (for the final report)" value={d.rootCause ?? ""} onChange={set("rootCause")} />
        <TextField id="cd-actor" label="Malicious actor, if known" value={d.maliciousActor ?? ""} onChange={set("maliciousActor")} />
        <TextField id="cd-srp" label="ENISA platform reference" value={d.srpReference ?? ""} onChange={set("srpReference")} />
      </div>
      <button type="button" className="btn btn-primary" onClick={() => onSave(d)}>
        Save case details
      </button>
    </details>
  );
}
