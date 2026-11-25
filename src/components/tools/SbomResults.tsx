"use client";

import { SpecTable } from "@/components/structure";

export type QualityCheck = { id: string; label: string; passed: boolean; detail: string };
export type FindingView = {
  id?: string;
  vulnId: string;
  aliases: string[];
  summary: string;
  severity: "critical" | "high" | "medium" | "low" | "none" | "unknown";
  score: number | null;
  component: string;
  version: string;
  fixedIn: string[];
  references: string[];
  status?: string;
  note?: string;
};

export const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  investigating: "Investigating",
  "not-affected": "Not affected",
  fixed: "Fixed",
  accepted: "Risk accepted",
};

export function QualityTable({ score, checks }: { score: number; checks: QualityCheck[] }) {
  return (
    <div className="stack-sm">
      <div className="score-strip">
        <p className="label">SBOM quality</p>
        <span className="gauge" aria-hidden="true">
          <span style={{ width: `${score}%`, ["--pct" as string]: score }} />
        </span>
        <p className="code score-figure">{score}%</p>
      </div>
      <SpecTable
        rows={checks}
        rowKey={(c) => c.id}
        cols={[
          { key: "check", label: "Check", head: true, width: "34%", render: (c) => c.label },
          { key: "result", label: "Result", width: "9rem", render: (c) => <span className={`count-tag ${c.passed ? "is-good" : "is-bad"}`}>{c.passed ? "Pass" : "Gap"}</span> },
          { key: "detail", label: "Detail", render: (c) => c.detail },
        ]}
      />
    </div>
  );
}

export function SeverityCounts({ counts }: { counts: Record<string, number> }) {
  const order = ["critical", "high", "medium", "low", "unknown"] as const;
  return (
    <ul className="sev-counts">
      {order.map((s) => (
        <li key={s} className={`is-${s}`}>
          <span className="sev-n code">{counts[s] ?? 0}</span>
          <span className="sev-l">{s}</span>
        </li>
      ))}
    </ul>
  );
}

export function FindingsTable({ findings, onStatus }: { findings: FindingView[]; onStatus?: (f: FindingView, status: string) => void }) {
  if (!findings.length) return <p className="note-line">No known vulnerabilities in components with package URLs.</p>;
  return (
    <SpecTable
      className="findings-table"
      rows={findings}
      rowKey={(f) => `${f.vulnId}|${f.component}|${f.version}`}
      cols={[
        { key: "sev", label: "Severity", width: "8.5rem", render: (f) => <span className={`sev-tag is-${f.severity}`}>{f.score !== null ? `${f.severity} ${f.score.toFixed(1)}` : f.severity}</span> },
        {
          key: "vuln",
          label: "Vulnerability",
          head: true,
          render: (f) => (
            <>
              <span className="cell-title">
                {f.references[0] ? (
                  <a href={f.references[0]} target="_blank" rel="noreferrer">
                    {f.vulnId}
                  </a>
                ) : (
                  f.vulnId
                )}
                {f.aliases.length > 0 && <span className="muted code"> {f.aliases.slice(0, 2).join(", ")}</span>}
              </span>
              <span className="cell-body">{f.summary}</span>
            </>
          ),
        },
        { key: "comp", label: "Component", width: "12rem", code: true, render: (f) => `${f.component} ${f.version}` },
        { key: "fix", label: "Fixed in", width: "9rem", code: true, render: (f) => (f.fixedIn.length ? f.fixedIn.slice(0, 3).join(", ") : "No fix yet") },
        ...(onStatus
          ? [
              {
                key: "status",
                label: "Status",
                width: "10rem",
                render: (f: FindingView) => (
                  <select className="cell-select" aria-label={`Status for ${f.vulnId}`} value={f.status ?? "open"} onChange={(e) => onStatus(f, e.target.value)}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                ),
              },
            ]
          : []),
      ]}
    />
  );
}
