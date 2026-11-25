"use client";

import { useMemo, useState } from "react";
import {
  baselineQuestions,
  evaluateReleaseGate,
  pentestTriggers,
  surfaceTriggers,
  type GateAnswers,
  type Outcome,
  type YesNo,
} from "@/lib/release-gate";

const outcomeStyle: Record<Outcome, { label: string; className: string }> = {
  pass: { label: "Pass", className: "bg-good-tint text-good" },
  blocked: { label: "Blocked", className: "bg-bad-tint text-bad" },
  required: { label: "Required", className: "bg-warn-tint text-warn" },
  "not-required": { label: "Not required", className: "bg-paper text-muted" },
  "n/a": { label: "N/A", className: "bg-paper text-muted" },
  incomplete: { label: "Waiting", className: "bg-paper text-muted" },
};

type QuestionId = keyof GateAnswers;

export function ReleaseGate() {
  const [release, setRelease] = useState({ product: "", version: "", ticket: "" });
  const [answers, setAnswers] = useState<GateAnswers>({});
  const [notes, setNotes] = useState<Partial<Record<QuestionId, string>>>({});

  const result = useMemo(() => evaluateReleaseGate(answers), [answers]);
  const totalQuestions = baselineQuestions.length + surfaceTriggers.length + pentestTriggers.length;
  const answeredCount = Object.values(answers).filter(Boolean).length;

  const setAnswer = (id: QuestionId, v: YesNo) => setAnswers((prev) => ({ ...prev, [id]: v }));
  const setNote = (id: QuestionId, v: string) => setNotes((prev) => ({ ...prev, [id]: v }));

  const markRemainingNo = () =>
    setAnswers((prev) => {
      const next = { ...prev };
      for (const t of [...surfaceTriggers, ...pentestTriggers]) next[t.id] ??= "no";
      return next;
    });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <div className="max-w-3xl">
        <p className="no-print text-sm font-semibold tracking-wide text-brand uppercase">Free tool</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Release security gate</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Testing should depend on what changed, not on whether you call it a minor release. Answer for this release and
          get the security testing it needs. A hotfix that touches authentication needs more than a major release that
          only changes copy.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-8">
          <section className="rounded-xl border border-line p-5 sm:p-6">
            <h2 className="font-semibold text-ink">Release</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["product", "Product", "Smart thermostat"],
                  ["version", "Version", "4.12.0"],
                  ["ticket", "Change ticket / PR", "CHG-1234"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <label key={key} className="text-sm font-medium text-ink-soft">
                  {label}
                  <input
                    value={release[key]}
                    onChange={(e) => setRelease((r) => ({ ...r, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="mt-1.5 block w-full rounded-md border border-line px-3 py-2 text-ink placeholder:text-muted"
                  />
                </label>
              ))}
            </div>
          </section>

          <QuestionGroup
            title="Baseline"
            intro="Code-level scanning is the minimum gate for every release."
            questions={baselineQuestions}
            answers={answers}
            notes={notes}
            onAnswer={setAnswer}
            onNote={setNote}
          />
          <QuestionGroup
            title="Attack-surface triggers"
            intro="Any “yes” here means targeted testing of what changed."
            questions={surfaceTriggers}
            answers={answers}
            notes={notes}
            onAnswer={setAnswer}
            onNote={setNote}
            showIds
            action={
              <button type="button" onClick={markRemainingNo} className="no-print text-sm text-brand hover:underline">
                Mark unanswered triggers “No”
              </button>
            }
          />
          <QuestionGroup
            title="Full penetration test triggers"
            questions={pentestTriggers}
            answers={answers}
            notes={notes}
            onAnswer={setAnswer}
            onNote={setNote}
            showIds
          />
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-xl border border-line p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold text-ink">Required testing</h2>
              <span className="text-xs text-muted tabular-nums">
                {answeredCount}/{totalQuestions} answered
              </span>
            </div>
            {(release.product || release.version) && (
              <p className="mt-1 text-sm text-ink-soft">
                {[release.product, release.version, release.ticket].filter(Boolean).join(" · ")}
              </p>
            )}
            <ul className="mt-4 space-y-4">
              {result.results.map((r) => (
                <li key={r.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{r.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${outcomeStyle[r.outcome].className}`}>
                      {outcomeStyle[r.outcome].label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{r.description}</p>
                  {result.complete && <p className="mt-1.5 text-sm text-ink-soft">{r.reason}</p>}
                </li>
              ))}
            </ul>
            {result.complete && (
              <button
                type="button"
                onClick={() => window.print()}
                className="no-print mt-5 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                Print release record
              </button>
            )}
          </div>
          <p className="mt-4 text-xs text-muted">
            Every product should also get a full Level 1 scan of its production baseline at least quarterly, regardless of
            releases. Cadences here are sensible defaults; adjust them to your own policy.
          </p>
        </aside>
      </div>
    </div>
  );
}

function QuestionGroup({
  title,
  intro,
  questions,
  answers,
  notes,
  onAnswer,
  onNote,
  showIds = false,
  action,
}: {
  title: string;
  intro?: string;
  questions: readonly { id: QuestionId; text: string }[];
  answers: GateAnswers;
  notes: Partial<Record<QuestionId, string>>;
  onAnswer: (id: QuestionId, v: YesNo) => void;
  onNote: (id: QuestionId, v: string) => void;
  showIds?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold text-ink">{title}</h2>
          {intro && <p className="mt-1 text-sm text-ink-soft">{intro}</p>}
        </div>
        {action}
      </div>
      <div className="mt-3 divide-y divide-line rounded-xl border border-line">
        {questions.map((q) => {
          const value = answers[q.id];
          return (
            <div key={q.id} className="p-4 break-inside-avoid">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-ink">
                  {showIds && <span className="mr-2 font-mono text-xs text-muted">{q.id}</span>}
                  {q.text}
                </p>
                <div className="flex shrink-0 gap-2" role="radiogroup" aria-label={q.text}>
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={value === v}
                      onClick={() => onAnswer(q.id, v)}
                      className={`w-14 rounded-md border px-3 py-1.5 text-sm font-medium capitalize transition ${
                        value === v ? "border-brand bg-brand text-white" : "border-line text-ink-soft hover:border-ink-soft"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              {value === "yes" && showIds && (
                <input
                  value={notes[q.id] ?? ""}
                  onChange={(e) => onNote(q.id, e.target.value)}
                  placeholder="Notes / evidence (e.g. new REST endpoint for diagnostics)"
                  className="mt-3 block w-full rounded-md border border-line px-3 py-2 text-sm text-ink placeholder:text-muted"
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
