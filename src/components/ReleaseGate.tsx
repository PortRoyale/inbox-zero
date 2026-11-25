"use client";

import { useMemo, useState } from "react";
import { PageHero } from "@/components/PageHero";
import { ConfirmButton, CopyButton, Fcf } from "@/components/primitives";
import { SpecTable } from "@/components/structure";
import { formatDate, useToday } from "@/components/Timeline";
import { Walkthrough, type RunChoice, type RunLevel } from "@/components/walkthrough/Walkthrough";
import {
  baselineQuestions,
  evaluateReleaseGate,
  pentestTriggers,
  surfaceTriggers,
  type GateAnswers,
  type GateResult,
  type Outcome,
  type YesNo,
} from "@/lib/release-gate";
import { releaseRecordText } from "@/lib/report-text";

const outcomeLabel: Record<Outcome, string> = {
  pass: "Pass",
  blocked: "Blocked",
  required: "Required",
  "not-required": "Not required",
  "n/a": "N/A",
  incomplete: "Waiting",
};

type QuestionId = keyof GateAnswers;

const EXAMPLE_RELEASE = { product: "Example gateway", version: "4.12.0", ticket: "CHG-1234" };
const EXAMPLE_ANSWERS: GateAnswers = {
  scanningInPipeline: "yes",
  noOpenCriticalHigh: "yes",
  fixesReportedVuln: "no",
  ...Object.fromEntries([...surfaceTriggers, ...pentestTriggers].map((t) => [t.id, "no"])),
  T2: "yes",
  T7: "yes",
};
const EXAMPLE_NOTES: Partial<Record<QuestionId, string>> = {
  T2: "New REST endpoint for remote diagnostics",
  T7: "OpenSSL 3.0 to 3.3",
};

const baselineTitles: Record<(typeof baselineQuestions)[number]["id"], string> = {
  scanningInPipeline: "Scanning runs in the pipeline",
  noOpenCriticalHigh: "Scan results are clean",
  fixesReportedVuln: "Fixes a reported vulnerability",
};

// Each trigger as a short label (kicker) and a full question (what people read first).
const triggerCopy: Record<string, { label: string; question: string }> = {
  T1: { label: "Network services", question: "Did this release add or change network ports, services or protocols?" },
  T2: { label: "APIs and web interfaces", question: "Did this release add or change APIs or web interfaces, including local or service UIs?" },
  T3: { label: "Authentication and access", question: "Did this release change authentication, authorisation, roles or remote management access?" },
  T4: { label: "Cryptography and keys", question: "Did this release change cryptography, TLS configuration, certificates or key handling?" },
  T5: { label: "Payment data", question: "Did this release change payment or cardholder data flows?" },
  T6: { label: "Updates and secure boot", question: "Did this release change the update mechanism or secure boot?" },
  T7: { label: "Platform components", question: "Did this release update the OS, kernel, base image or a runtime component such as a web server or OpenSSL?" },
  T8: { label: "Network-facing components", question: "Did composition analysis flag a new or upgraded network-facing component?" },
  T9: { label: "Findings to verify", question: "Are there static analysis findings that need runtime verification, such as possible injection points?" },
  T10: { label: "Defaults and logging", question: "Did this release change default configuration, hardening, or logging and audit functions?" },
  T11: { label: "New data types", question: "Does this release collect, store or transmit new types of data?" },
  A1: { label: "New architecture", question: "Does this release introduce a new architecture or platform, or is it a new product?" },
  A2: { label: "Pen test age", question: "Has it been more than 12 months since this product line had a full penetration test?" },
};

const gateChoices: RunChoice<YesNo>[] = [
  { value: "yes", label: "Yes", hint: "This changed in this release.", keys: ["1", "y"], tone: "partial" },
  { value: "no", label: "No", hint: "Not touched by this release.", keys: ["2", "n"], tone: "neutral" },
];

const STORAGE_KEY = "release-gate-v2";

export function ReleaseGate() {
  const today = useToday();
  const [release, setRelease] = useState({ product: "", version: "", ticket: "" });
  const [answers, setAnswers] = useState<GateAnswers>({});
  const [notes, setNotes] = useState<Partial<Record<QuestionId, string>>>({});
  const [runKey, setRunKey] = useState(0);

  const result = useMemo(() => evaluateReleaseGate(answers), [answers]);
  const yesTriggers = [...surfaceTriggers, ...pentestTriggers].filter((t) => answers[t.id] === "yes").map((t) => ({ ...t, note: notes[t.id] }));

  const loadExample = () => {
    setRelease(EXAMPLE_RELEASE);
    setAnswers(EXAMPLE_ANSWERS);
    setNotes(EXAMPLE_NOTES);
    try {
      localStorage.setItem(`${STORAGE_KEY}:pos`, JSON.stringify({ phase: "done" }));
    } catch {
      // Storage is optional.
    }
    setRunKey((k) => k + 1);
  };

  const clear = () => {
    setRelease({ product: "", version: "", ticket: "" });
    setAnswers({});
    setNotes({});
    try {
      localStorage.removeItem(`${STORAGE_KEY}:pos`);
    } catch {
      // Storage is optional.
    }
    setRunKey((k) => k + 1);
  };

  const levels: RunLevel[] = [
    {
      id: "baseline",
      label: "Baseline scans",
      questions: baselineQuestions.map((q, i) => ({
        id: q.id,
        ref: `G.${i + 1}`,
        title: baselineTitles[q.id],
        prompt: q.text,
        choiceTones: q.id === "fixesReportedVuln" ? { yes: "partial", no: "neutral" } : { yes: "good", no: "bad" },
        choiceHints:
          q.id === "fixesReportedVuln"
            ? { yes: "A retest of the fix is required.", no: "No security fix in this release." }
            : { yes: "Confirmed for this release.", no: "The release gate blocks until fixed or approved." },
      })),
    },
    {
      id: "surface",
      label: "Attack surface",
      questions: surfaceTriggers.map((t) => ({ id: t.id, ref: t.id, title: triggerCopy[t.id].label, prompt: triggerCopy[t.id].question })),
    },
    {
      id: "pentest",
      label: "Full pen test triggers",
      questions: pentestTriggers.map((t) => ({ id: t.id, ref: t.id, title: triggerCopy[t.id].label, prompt: triggerCopy[t.id].question })),
    },
  ];

  const resultTable = (rows: GateResult[], showReason: boolean) => (
    <SpecTable
      className="gate-results"
      rows={rows}
      rowKey={(r) => r.id}
      cols={[
        { key: "check", label: "Check", head: true, render: (r) => r.title },
        { key: "decision", label: "Decision", width: "11rem", render: (r) => <span className={`outcome-tag is-${r.outcome === "n/a" ? "na" : r.outcome}`}>{outcomeLabel[r.outcome]}</span> },
        { key: "why", label: showReason ? "Why" : "What it is", width: "42%", render: (r) => (showReason && result.complete ? r.reason : r.description) },
      ]}
    />
  );

  const record = (
    <div className="record stack">
      <div className="sheet-head">
        <div>
          <Fcf keyCell="Release record" cells={[formatDate(today), result.complete ? "Complete" : "Incomplete"]} />
          <h2>{[release.product, release.version].filter(Boolean).join(" ") || "Release record"}</h2>
        </div>
        {result.complete && <CopyButton label="Copy release record" getText={() => releaseRecordText({ release, date: formatDate(today), result, yesTriggers })} />}
      </div>
      <SpecTable
        rows={[release]}
        rowKey={() => "release"}
        cols={[
          { key: "p", label: "Product", head: true, render: (r) => r.product || "Not set" },
          { key: "v", label: "Version", width: "9rem", code: true, render: (r) => r.version || "Not set" },
          { key: "t", label: "Change ticket", width: "11rem", code: true, render: (r) => r.ticket || "Not set" },
          { key: "d", label: "Date", width: "10rem", code: true, render: () => formatDate(today) },
        ]}
      />
      {resultTable(result.results, true)}
      <SpecTable
        caption={`Changed surface · ${yesTriggers.length} trigger${yesTriggers.length === 1 ? "" : "s"}`}
        rows={yesTriggers}
        rowKey={(t) => t.id}
        cols={[
          { key: "id", label: "Ref", width: "4.5rem", code: true, render: (t) => t.id },
          { key: "what", label: "Trigger", head: true, render: (t) => t.text },
          { key: "note", label: "What changed", width: "38%", render: (t) => t.note || <span className="muted">No note</span> },
        ]}
      />
      {yesTriggers.length === 0 && <p className="muted">No attack-surface or pen test triggers in this release.</p>}
      <p className="aside-note muted">
        Every product should also get a full Level 1 scan of its production baseline at least quarterly, whatever the release schedule. These cadences are
        sensible defaults; adjust them to your own policy.
      </p>
      <div className="row">
        <ConfirmButton label="Start a new release" confirmLabel="Clear everything" onConfirm={clear} />
      </div>
    </div>
  );

  const intro = (
    <div className="run-setup">
      <div className="run-setup-head">
        <Fcf keyCell="Level 0" cells={["The release"]} />
        <h2>Which release are you gating?</h2>
        <p className="muted">Answer what changed. The gate decides the testing each change needs and writes the release record.</p>
      </div>
      <div className="release-fields">
        {(
          [
            ["product", "Product", "Smart thermostat"],
            ["version", "Version", "4.12.0"],
            ["ticket", "Change ticket / PR", "CHG-1234"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <label key={key} className="field" htmlFor={`release-${key}`}>
            <span className="label">{label}</span>
            <input id={`release-${key}`} value={release[key]} onChange={(e) => setRelease((r) => ({ ...r, [key]: e.target.value }))} placeholder={placeholder} />
          </label>
        ))}
      </div>
      <SpecTable
        caption="Your route"
        rows={levels}
        rowKey={(l) => l.id}
        cols={[
          { key: "lvl", label: "Level", width: "5rem", code: true, render: (_l, i) => String(i + 1) },
          { key: "name", label: "Section", head: true, render: (l) => l.label },
          { key: "n", label: "Questions", width: "7rem", code: true, render: (l) => l.questions.length },
          { key: "decides", label: "Decides", width: "38%", render: (_l, i) => ["Whether the release may ship", "Level 1 and Level 2 testing", "A full penetration test"][i] },
        ]}
      />
      <p className="muted">
        Want to see the output first?{" "}
        <button type="button" className="link-btn" onClick={loadExample}>
          Load an example release record
        </button>
      </p>
    </div>
  );

  const hits = yesTriggers.length;

  return (
    <div className="wrap stack" data-tool="gate">
      <PageHero
        id="gate-title"
        tool="gate"
        motif="chip"
        seed={23}
        label="Free tool"
        cells={["Change control", "Annex I Pt II(3)"]}
        title="Release security gate"
        lead="Test depth should follow what changed, not the version label. Sixteen yes-or-no questions, about two minutes, one release record."
      />
      <Walkthrough<YesNo>
        key={runKey}
        id="gate-run"
        name="Release gate"
        storageKey={STORAGE_KEY}
        levels={levels}
        choices={gateChoices}
        answers={answers}
        onAnswer={(id, v) => setAnswers((prev) => ({ ...prev, [id]: v }))}
        feedback={(q, v) => {
          if (q.id === "scanningInPipeline") return v === "yes" ? "Baseline scanning confirmed." : "Gate blocked: run Level 1 on this release and date the pipeline fix.";
          if (q.id === "noOpenCriticalHigh") return v === "yes" ? "Clean results logged." : "Gate blocked until findings are fixed or formally approved.";
          if (q.id === "fixesReportedVuln") return v === "yes" ? "A fix verification retest is now required." : "No retest needed.";
          return v === "yes" ? `Changed surface logged as ${q.ref}. Add what changed for the record.` : "Not touched. Logged.";
        }}
        followUp={(q, v, next) =>
          v === "yes" && !q.ref.startsWith("G.") ? (
            <label className="field" htmlFor={`note-${q.id}`}>
              <span className="label">What changed? (evidence for the record)</span>
              <input
                id={`note-${q.id}`}
                autoFocus
                value={notes[q.id as QuestionId] ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [q.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    next();
                  }
                }}
                placeholder="e.g. New REST endpoint for remote diagnostics. Press Enter to continue."
              />
            </label>
          ) : null
        }
        intro={intro}
        startLabel="Start the gate · 16 questions"
        stats={[
          { label: "Triggers", value: hits, tone: hits ? "partial" : undefined },
          {
            label: "Gate",
            value: answers.scanningInPipeline === "no" || answers.noOpenCriticalHigh === "no" ? "Blocked" : answers.scanningInPipeline && answers.noOpenCriticalHigh ? "Pass" : "…",
            tone: answers.scanningInPipeline === "no" || answers.noOpenCriticalHigh === "no" ? "bad" : answers.scanningInPipeline && answers.noOpenCriticalHigh ? "good" : undefined,
          },
        ]}
        levelSummary={() => resultTable(result.results, false)}
        outroLabel="See the release record"
        outroMeta={result.complete ? "✓" : `${Object.keys(answers).length}/16`}
        outro={record}
        aside={
          <div className="run-aside record-mini">
            <p className="label">Required testing</p>
            <ul>
              {result.results.map((r) => (
                <li key={r.id} className={`outcome-${r.outcome}`}>
                  <span>{r.title.split(":")[0]}</span>
                  <span className={`outcome-tag is-${r.outcome === "n/a" ? "na" : r.outcome}`}>{outcomeLabel[r.outcome]}</span>
                </li>
              ))}
            </ul>
          </div>
        }
      />
    </div>
  );
}
