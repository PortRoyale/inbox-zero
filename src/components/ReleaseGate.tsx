"use client";

import { useMemo, useState } from "react";
import { ConfirmButton, CopyButton, Fcf, RevisionCloud } from "@/components/primitives";
import { formatDate, useToday } from "@/components/Timeline";
import {
  baselineQuestions,
  evaluateReleaseGate,
  pentestTriggers,
  surfaceTriggers,
  type GateAnswers,
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
type Question = { id: QuestionId; text: string };

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

export function ReleaseGate() {
  const today = useToday();
  const [isExample, setIsExample] = useState(true);
  const [release, setRelease] = useState(EXAMPLE_RELEASE);
  const [answers, setAnswers] = useState<GateAnswers>(EXAMPLE_ANSWERS);
  const [notes, setNotes] = useState(EXAMPLE_NOTES);

  const result = useMemo(() => evaluateReleaseGate(answers), [answers]);
  const totalQuestions = baselineQuestions.length + surfaceTriggers.length + pentestTriggers.length;
  const answeredCount = Object.values(answers).filter(Boolean).length;

  const setAnswer = (id: QuestionId, v: YesNo) => {
    setIsExample(false);
    setAnswers((prev) => ({ ...prev, [id]: v }));
  };
  const setNote = (id: QuestionId, v: string) => setNotes((prev) => ({ ...prev, [id]: v }));

  const clear = () => {
    setIsExample(false);
    setRelease({ product: "", version: "", ticket: "" });
    setAnswers({});
    setNotes({});
  };

  const markRemainingNo = () => {
    setIsExample(false);
    setAnswers((prev) => {
      const next = { ...prev };
      for (const t of [...surfaceTriggers, ...pentestTriggers]) next[t.id] ??= "no";
      return next;
    });
  };

  const yesTriggers = [...surfaceTriggers, ...pentestTriggers]
    .filter((t) => answers[t.id] === "yes")
    .map((t) => ({ ...t, note: notes[t.id] }));

  return (
    <div className="wrap stack">
      <section className="sheet" aria-labelledby="gate-title">
        <div className="sheet-head">
          <div>
            <Fcf keyCell="Free tool" cells={["Change control", "Annex I Pt II(3)"]} />
            <h1 id="gate-title" className="page-title">
              Release security gate
            </h1>
            <p className="lead">
              Test depth should follow what changed, not the version label. A hotfix that touches authentication needs
              more testing than a major release that only changes copy. Changed items get clouded, as on a drawing
              revision.
            </p>
          </div>
        </div>
        {isExample && (
          <div className="example-banner">
            <p>
              <strong>Example release loaded.</strong> Change any answer to make it yours, or start blank.
            </p>
            <button type="button" className="btn" onClick={clear}>
              Start blank
            </button>
          </div>
        )}
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
              <input
                id={`release-${key}`}
                value={release[key]}
                onChange={(e) => {
                  setIsExample(false);
                  setRelease((r) => ({ ...r, [key]: e.target.value }));
                }}
                placeholder={placeholder}
              />
            </label>
          ))}
        </div>
      </section>

      <div className="tool-grid">
        <div className="tool-main">
          <QuestionGroup
            title="Baseline"
            code="Gate 0"
            intro="Code-level scanning is the minimum gate for every release."
            questions={baselineQuestions}
            answers={answers}
            notes={notes}
            onAnswer={setAnswer}
            onNote={setNote}
          />
          <QuestionGroup
            title="Attack-surface triggers"
            code="Level 2"
            intro="Any “yes” means targeted testing of what changed."
            questions={surfaceTriggers}
            answers={answers}
            notes={notes}
            onAnswer={setAnswer}
            onNote={setNote}
            clouded
            action={
              <button type="button" className="btn btn-quiet" onClick={markRemainingNo}>
                Mark unanswered “No”
              </button>
            }
          />
          <QuestionGroup
            title="Full penetration test triggers"
            code="Level 3"
            questions={pentestTriggers}
            answers={answers}
            notes={notes}
            onAnswer={setAnswer}
            onNote={setNote}
            clouded
          />
        </div>

        <aside className="tool-aside">
          <div className="sheet record">
            <div className="record-head">
              <p className="label">Release record</p>
              <p className="code muted">
                {answeredCount}/{totalQuestions} answered
              </p>
            </div>
            <dl className="tblock">
              <div>
                <dt>Product · version</dt>
                <dd>{[release.product, release.version].filter(Boolean).join(" · ") || "—"}</dd>
              </div>
              <div>
                <dt>Change</dt>
                <dd>{release.ticket || "—"}</dd>
              </div>
              <div>
                <dt>Changed surface</dt>
                <dd>{yesTriggers.length ? yesTriggers.map((t) => t.id).join(" ") : "None"}</dd>
              </div>
            </dl>
            <ul className="outcomes">
              {result.results.map((r) => (
                <li key={r.id} className={`outcome outcome-${r.outcome}`}>
                  <div className="outcome-head">
                    <p>{r.title}</p>
                    <span className="outcome-tag code">{outcomeLabel[r.outcome]}</span>
                  </div>
                  <p className="muted">{result.complete ? r.reason : r.description}</p>
                </li>
              ))}
            </ul>
            {result.complete && (
              <CopyButton
                label="Copy release record"
                getText={() => releaseRecordText({ release, date: formatDate(today), result, yesTriggers })}
              />
            )}
            {!isExample && <ConfirmButton label="Clear answers" confirmLabel="Clear everything" onConfirm={clear} />}
          </div>
          <p className="aside-note muted">
            Every product should also get a full Level 1 scan of its production baseline at least quarterly, whatever the
            release schedule. These cadences are sensible defaults; adjust them to your own policy.
          </p>
        </aside>
      </div>
    </div>
  );
}

function QuestionGroup({
  title,
  code,
  intro,
  questions,
  answers,
  notes,
  onAnswer,
  onNote,
  clouded = false,
  action,
}: {
  title: string;
  code: string;
  intro?: string;
  questions: readonly Question[];
  answers: GateAnswers;
  notes: Partial<Record<QuestionId, string>>;
  onAnswer: (id: QuestionId, v: YesNo) => void;
  onNote: (id: QuestionId, v: string) => void;
  clouded?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <section className="sheet" aria-label={title}>
      <div className="group-head">
        <div>
          <Fcf keyCell={code} cells={[`${questions.length} items`]} />
          <h2>{title}</h2>
          {intro && <p className="muted">{intro}</p>}
        </div>
        {action}
      </div>
      <ol className="triggers">
        {questions.map((q) => {
          const value = answers[q.id];
          const changed = clouded && value === "yes";
          const labelId = `q-${q.id}`;
          return (
            <li key={q.id}>
              <RevisionCloud active={changed} className="trigger">
                <div className="trigger-row">
                  <p id={labelId} className="trigger-text">
                    {clouded &&
                      (changed ? (
                        <span className="revtri" aria-label={`Changed: ${q.id}`}>
                          {q.id}
                        </span>
                      ) : (
                        <span className="trigger-id code">{q.id}</span>
                      ))}
                    <span>{q.text}</span>
                  </p>
                  <div className="seg" role="radiogroup" aria-labelledby={labelId}>
                    {(["yes", "no"] as const).map((v) => (
                      <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onAnswer(q.id, v)}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                {changed && (
                  <label className="field" htmlFor={`note-${q.id}`}>
                    <span className="visually-hidden">Notes or evidence for {q.id}</span>
                    <input
                      id={`note-${q.id}`}
                      value={notes[q.id] ?? ""}
                      onChange={(e) => onNote(q.id, e.target.value)}
                      placeholder="What changed? (evidence for the record)"
                    />
                  </label>
                )}
              </RevisionCloud>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
