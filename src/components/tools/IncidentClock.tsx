"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/primitives";
import { SpecTable } from "@/components/structure";
import { formatRemaining, formatUtc, incidentMilestones, nextDeadline, reportDraft, type DraftData, type DraftStage, type IncidentKind, type IncidentTimes, type Milestone } from "@/lib/incidents";

// The CRA Art. 14 reporting clock for one vulnerability or incident: deadlines, status and report drafts.
// Shared by the free tool (state kept in the browser) and the product workspace (saved on the server).

export type TimeField = "earlyWarningAt" | "notificationAt" | "fixAvailableAt" | "finalReportAt" | "usersInformedAt" | "closedAt";

const FIELD_FOR: Partial<Record<Milestone["id"], TimeField>> = {
  "early-warning": "earlyWarningAt",
  notification: "notificationAt",
  "final-report": "finalReportAt",
  users: "usersInformedAt",
};

const STATE_LABEL: Record<Milestone["state"], string> = { done: "Done", due: "Due", overdue: "Overdue", waiting: "Waiting", optional: "On request" };
const STATE_TONE: Record<Milestone["state"], string> = { done: "is-good", due: "is-partial", overdue: "is-bad", waiting: "is-neutral", optional: "is-neutral" };

export const toLocalInput = (ms: number) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
};
export const fromLocalInput = (v: string) => (v ? new Date(v).getTime() : null);

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function IncidentClock({
  kind,
  times,
  draft,
  onTime,
  readOnly = false,
}: {
  kind: IncidentKind;
  times: IncidentTimes;
  draft: DraftData;
  onTime?: (field: TimeField, ms: number | null) => void;
  readOnly?: boolean;
}) {
  const now = useNow();
  const milestones = incidentMilestones(kind, times, now);
  const next = nextDeadline(milestones);
  const [stage, setStage] = useState<DraftStage>("early-warning");
  const report = reportDraft(kind, stage, draft);
  const gaps = report.fields.filter((f) => f.required && f.value.startsWith("[to complete")).length;

  const rows: (Milestone | { id: "fix"; label: string })[] = [...milestones.filter((m) => m.id !== "intermediate")];
  if (kind === "vulnerability") rows.splice(2, 0, { id: "fix", label: "Fix or mitigation available" });

  return (
    <div className="stack-flow">
      <div className={`clock-banner ${next ? STATE_TONE[next.state] : "is-good"}`} role="status" aria-live="polite">
        <p className="label">{next ? `Next: ${next.label}` : "No open deadline"}</p>
        <p className="clock-figure code">{next && next.remainingMs !== null ? formatRemaining(next.remainingMs) : "All due reports sent"}</p>
        <p className="clock-sub">{next?.dueAt ? `Due ${formatUtc(next.dueAt)}` : `Aware since ${formatUtc(times.awareAt)}`}</p>
      </div>

      <SpecTable
        className="clock-table"
        rows={rows}
        rowKey={(r) => r.id}
        cols={[
          {
            key: "m",
            label: "Milestone",
            head: true,
            render: (r) =>
              "state" in r ? (
                <>
                  <span className="cell-title">{r.label}</span>
                  <span className="cell-body">{r.note}</span>
                </>
              ) : (
                <>
                  <span className="cell-title">{r.label}</span>
                  <span className="cell-body">Starts the 14-day final report clock (Art. 14(2)(c)).</span>
                </>
              ),
          },
          { key: "due", label: "Due (UTC)", width: "11rem", code: true, render: (r) => ("state" in r && r.dueAt ? formatUtc(r.dueAt).replace(" UTC", "") : "No fixed time") },
          {
            key: "state",
            label: "Status",
            width: "8.5rem",
            render: (r) => ("state" in r ? <span className={`count-tag ${STATE_TONE[r.state]}`}>{STATE_LABEL[r.state]}</span> : <span className={`count-tag ${times.fixAvailableAt ? "is-good" : "is-neutral"}`}>{times.fixAvailableAt ? "Done" : "Waiting"}</span>),
          },
          {
            key: "done",
            label: "Done at (your time)",
            width: "14rem",
            render: (r) => {
              const field = "state" in r ? FIELD_FOR[r.id] : "fixAvailableAt";
              if (!field) return null;
              const value = times[field];
              if (readOnly || !onTime) return <span className="code">{value ? formatUtc(value) : "Not yet"}</span>;
              return value ? (
                <span className="done-cell">
                  <input type="datetime-local" aria-label={`${"label" in r ? r.label : ""} time`} value={toLocalInput(value)} onChange={(e) => onTime(field, fromLocalInput(e.target.value))} />
                  <button type="button" className="link-btn" onClick={() => onTime(field, null)}>
                    Clear
                  </button>
                </span>
              ) : (
                <button type="button" className="btn btn-small" onClick={() => onTime(field, Date.now())}>
                  Mark done now
                </button>
              );
            },
          },
        ]}
      />

      <section className="stack-sm" aria-labelledby="draft-title">
        <div className="row-between">
          <h3 id="draft-title">Report drafts</h3>
          <div className="seg" role="radiogroup" aria-label="Report stage">
            {(
              [
                ["early-warning", "24 h warning"],
                ["notification", "72 h notice"],
                ["final-report", "Final report"],
                ["users", "User notice"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={stage === v} onClick={() => setStage(v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <p className="muted">
          {report.title}.{" "}
          {gaps ? (
            <>
              {gaps} required field{gaps > 1 ? "s" : ""} still to complete{readOnly ? "" : <> in <a href="#case-details">the case details</a></>}.
            </>
          ) : (
            "All required fields are filled in."
          )}{" "}
          Submit CSIRT reports through ENISA&apos;s Single Reporting Platform.
        </p>
        <SpecTable
          rows={report.fields}
          rowKey={(f) => f.label}
          rowClass={(f) => (f.required && f.value.startsWith("[to complete") ? "is-gap" : undefined)}
          cols={[
            { key: "l", label: "Field", head: true, width: "32%", render: (f) => f.label },
            { key: "v", label: "Value", render: (f) => (f.value.startsWith("[to complete") ? <span className="gap-text">{f.value}</span> : f.value) },
            {
              key: "r",
              label: "State",
              width: "9rem",
              render: (f) => {
                const missing = f.value.startsWith("[to complete");
                return <span className={`count-tag ${missing ? "is-bad" : f.required ? "is-good" : "is-neutral"}`}>{missing ? "Missing" : f.required ? "Filled" : "Optional"}</span>;
              },
            },
          ]}
        />
        <CopyButton label="Copy draft text" getText={() => report.text} />
      </section>
    </div>
  );
}
