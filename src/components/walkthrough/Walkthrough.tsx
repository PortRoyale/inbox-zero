"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// One engine for every questionnaire on the site: one question at a time, sections as levels,
// a progress rail, keyboard answers, instant feedback and a level-complete moment.

export type Tone = "good" | "partial" | "bad" | "neutral";

export type RunChoice<V extends string> = {
  value: V;
  label: string;
  hint: string;
  keys: string[];
  tone: Tone;
};

export type RunQuestion = {
  id: string;
  ref: string;
  title: string;
  prompt: string;
  detail?: React.ReactNode;
  tag?: { label: string; tone: "critical" | "high" | "standard" };
  basis?: string;
  /** Per-question overrides: the same answer can be good on one question and a trigger on another. */
  choiceTones?: Partial<Record<string, Tone>>;
  choiceHints?: Partial<Record<string, string>>;
};

export type RunLevel = { id: string; label: string; blurb?: string; questions: RunQuestion[] };

type Pos = { phase: "intro" } | { phase: "q"; level: number; index: number } | { phase: "level-done"; level: number } | { phase: "review" } | { phase: "done" };

const SECONDS_PER_QUESTION = 18;

export function Walkthrough<V extends string>({
  id,
  name,
  levels,
  choices,
  answers,
  onAnswer,
  feedback,
  followUp,
  intro,
  canStart = true,
  startLabel = "Start",
  outro,
  outroLabel = "See my report",
  outroMeta,
  stats,
  levelSummary,
  aside,
  storageKey,
  compact = false,
}: {
  id: string;
  name: string;
  levels: RunLevel[];
  choices: RunChoice<V>[];
  answers: Partial<Record<string, V>>;
  onAnswer: (questionId: string, value: V) => void;
  feedback?: (q: RunQuestion, value: V) => string;
  followUp?: (q: RunQuestion, value: V, next: () => void) => React.ReactNode | null;
  intro?: React.ReactNode;
  canStart?: boolean;
  startLabel?: string;
  outro: React.ReactNode;
  outroLabel?: string;
  outroMeta?: React.ReactNode;
  stats?: { label: string; value: React.ReactNode; tone?: Tone }[];
  levelSummary?: (levelIndex: number) => React.ReactNode;
  aside?: React.ReactNode;
  storageKey?: string;
  compact?: boolean;
}) {
  const [pos, setPos] = useState<Pos>(() => {
    if (intro) return { phase: "intro" };
    // Without a start screen, open on the first unanswered question.
    for (let li = 0; li < levels.length; li++) {
      const qi = levels[li].questions.findIndex((q) => answers[q.id] === undefined);
      if (qi >= 0) return { phase: "q", level: li, index: qi };
    }
    return levels.length ? { phase: "done" } : { phase: "intro" };
  });
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [pending, setPending] = useState<{ qid: string; value: V } | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const live = useRef<HTMLParagraphElement>(null);
  const restored = useRef(false);

  const flat = useMemo(() => levels.flatMap((l, li) => l.questions.map((q, qi) => ({ q, li, qi }))), [levels]);
  const total = flat.length;
  const answered = flat.filter((f) => answers[f.q.id] !== undefined).length;

  // Resume where the person left off.
  useEffect(() => {
    if (!storageKey || restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(`${storageKey}:pos`);
      if (raw) setPos(JSON.parse(raw) as Pos);
    } catch {
      // Storage is optional.
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !restored.current) return;
    try {
      localStorage.setItem(`${storageKey}:pos`, JSON.stringify(pos));
    } catch {
      // Storage is optional.
    }
  }, [pos, storageKey]);

  // Keep the position valid when the question set changes (for example, product types changed).
  useEffect(() => {
    if (pos.phase === "q") {
      const l = levels[pos.level];
      if (!l) setPos(levels.length ? { phase: "q", level: 0, index: 0 } : { phase: "intro" });
      else if (pos.index >= l.questions.length) setPos({ phase: "q", level: pos.level, index: Math.max(0, l.questions.length - 1) });
    }
    if (pos.phase === "level-done" && !levels[pos.level]) setPos({ phase: "review" });
  }, [levels, pos]);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const go = useCallback(
    (next: Pos, d: "fwd" | "back" = "fwd") => {
      clearTimer();
      setPending(null);
      setShowDetail(false);
      setDir(d);
      setPos(next);
    },
    [],
  );

  const advance = useCallback(() => {
    if (pos.phase === "intro") return go({ phase: "q", level: 0, index: 0 });
    if (pos.phase === "q") {
      const l = levels[pos.level];
      if (pos.index + 1 < l.questions.length) return go({ phase: "q", level: pos.level, index: pos.index + 1 });
      return go({ phase: "level-done", level: pos.level });
    }
    if (pos.phase === "level-done") {
      if (pos.level + 1 < levels.length) return go({ phase: "q", level: pos.level + 1, index: 0 });
      return go({ phase: "review" });
    }
    if (pos.phase === "review") return go({ phase: "done" });
  }, [go, levels, pos]);

  const back = useCallback(() => {
    if (pos.phase === "q") {
      if (pos.index > 0) return go({ phase: "q", level: pos.level, index: pos.index - 1 }, "back");
      if (pos.level > 0) return go({ phase: "q", level: pos.level - 1, index: levels[pos.level - 1].questions.length - 1 }, "back");
      if (intro) return go({ phase: "intro" }, "back");
    }
    if (pos.phase === "level-done") return go({ phase: "q", level: pos.level, index: levels[pos.level].questions.length - 1 }, "back");
    if (pos.phase === "review") return go({ phase: "level-done", level: levels.length - 1 }, "back");
    if (pos.phase === "done") return go({ phase: "review" }, "back");
  }, [go, intro, levels, pos]);

  const current = pos.phase === "q" ? levels[pos.level]?.questions[pos.index] : undefined;
  const shownValue = current ? (pending?.qid === current.id ? pending.value : (answers[current.id] as V | undefined)) : undefined;
  const follow = current && shownValue !== undefined && followUp ? followUp(current, shownValue, advance) : null;

  const answer = useCallback(
    (value: V) => {
      if (!current) return;
      onAnswer(current.id, value);
      setPending({ qid: current.id, value });
      const msg = feedback?.(current, value) ?? "";
      if (live.current) live.current.textContent = msg;
      clearTimer();
      const needsMore = followUp?.(current, value, advance);
      if (!needsMore) {
        const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        timer.current = setTimeout(advance, reduce ? 900 : 650);
      }
    },
    [advance, current, feedback, followUp, onAnswer],
  );

  useEffect(() => clearTimer, []);

  // Move focus to the new question so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (pos.phase !== "intro") headRef.current?.focus({ preventScroll: true });
  }, [pos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea, select, [contenteditable=true]") || (t.tagName === "BUTTON" && e.key === "Enter"))) return;
      const root = document.getElementById(id);
      if (!root) return;
      const k = e.key.toLowerCase();
      if (pos.phase === "q") {
        const c = choices.find((ch) => ch.keys.includes(k));
        if (c) {
          e.preventDefault();
          answer(c.value);
          return;
        }
        if (k === "arrowleft") return (e.preventDefault(), back());
        if (k === "arrowright" || k === "s") return (e.preventDefault(), advance());
        if (k === "?") return (e.preventDefault(), setShowDetail((x) => !x));
        if (k === "enter" && current && answers[current.id] !== undefined) return (e.preventDefault(), advance());
      } else if (pos.phase === "level-done" && k === "enter") {
        e.preventDefault();
        advance();
      } else if (pos.phase === "level-done" && k === "arrowleft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, answer, answers, back, choices, current, id, pos.phase]);

  const flatIndex = pos.phase === "q" ? flat.findIndex((f) => f.li === pos.level && f.qi === pos.index) : -1;
  const remaining = total - answered;
  const minutes = Math.max(1, Math.round((remaining * SECONDS_PER_QUESTION) / 60));
  const choiceOf = (v: V | undefined) => choices.find((c) => c.value === v);
  const toneOf = (q: RunQuestion, v: V | undefined): Tone | undefined => {
    const c = choiceOf(v);
    return c ? (q.choiceTones?.[c.value] ?? c.tone) : undefined;
  };

  const firstOpen = (li: number) => {
    const qi = levels[li].questions.findIndex((q) => answers[q.id] === undefined);
    return qi < 0 ? 0 : qi;
  };

  const levelCounts = (li: number) =>
    choices.map((c) => ({ ...c, count: levels[li].questions.filter((q) => answers[q.id] === c.value).length }));

  return (
    <div id={id} className={`run${compact ? " is-compact" : ""}`} data-phase={pos.phase}>
      {!compact && (
        <nav className="run-map sheet" aria-label={`${name} levels`}>
          <p className="run-map-title">{name}</p>
          <ol>
            {intro && (
              <li>
                <button type="button" className={`run-map-btn${pos.phase === "intro" ? " is-here" : ""}`} onClick={() => go({ phase: "intro" }, "back")}>
                  <span className="run-map-no">0</span>
                  <span className="run-map-label">Start</span>
                  <span className="run-map-meta code">{canStart ? "✓" : ""}</span>
                </button>
              </li>
            )}
            {levels.map((l, li) => {
              const done = l.questions.filter((q) => answers[q.id] !== undefined).length;
              const here = (pos.phase === "q" || pos.phase === "level-done") && pos.level === li;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    className={`run-map-btn${here ? " is-here" : ""}${done === l.questions.length ? " is-clear" : ""}`}
                    onClick={() => go({ phase: "q", level: li, index: firstOpen(li) }, li < (pos.phase === "q" ? pos.level : 0) ? "back" : "fwd")}
                    disabled={!canStart}
                    aria-current={here ? "step" : undefined}
                  >
                    <span className="run-map-no">{li + 1}</span>
                    <span className="run-map-label">{l.label}</span>
                    <span className="run-map-meta code">
                      {done === l.questions.length ? "✓" : `${done}/${l.questions.length}`}
                    </span>
                    <span className="run-map-bar" aria-hidden="true">
                      <span style={{ width: `${(done / Math.max(1, l.questions.length)) * 100}%` }} />
                    </span>
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                className={`run-map-btn${pos.phase === "review" || pos.phase === "done" ? " is-here" : ""}`}
                onClick={() => go({ phase: answered ? "done" : "review" })}
                disabled={!canStart}
              >
                <span className="run-map-no">{levels.length + 1}</span>
                <span className="run-map-label">{outroLabel.replace(/^See (my|the) /i, "").replace(/^./, (c) => c.toUpperCase())}</span>
                <span className="run-map-meta code">{outroMeta ?? (answered === total && total ? "✓" : "0%")}</span>
              </button>
            </li>
          </ol>
          {aside}
        </nav>
      )}

      <div className="run-stage sheet">
        {pos.phase !== "intro" && (
          <div className="run-hud">
            <div className="run-hud-where">
              <span className="run-hud-level code">
                {pos.phase === "q" || pos.phase === "level-done" ? `Level ${pos.level + 1}/${levels.length}` : pos.phase === "review" ? "Review" : "Result"}
              </span>
              <span className="run-hud-name">
                {pos.phase === "q" || pos.phase === "level-done" ? levels[pos.level]?.label : pos.phase === "review" ? "Check your answers" : name}
              </span>
            </div>
            <ol className="run-rail" aria-label={`${answered} of ${total} answered`}>
              {flat.map((f, i) => {
                const v = answers[f.q.id];
                const c = choiceOf(v);
                const tone = toneOf(f.q, v);
                return (
                  <li
                    key={f.q.id}
                    className={`${tone ? `is-${tone}` : ""}${i === flatIndex ? " is-here" : ""}${i > 0 && flat[i - 1].li !== f.li ? " is-break" : ""}`}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={`${f.q.ref} ${f.q.title}${c ? `: ${c.label}` : ""}`}
                      onClick={() => go({ phase: "q", level: f.li, index: f.qi }, i < flatIndex ? "back" : "fwd")}
                    />
                  </li>
                );
              })}
            </ol>
            <dl className="run-hud-stats">
              <div>
                <dt>Answered</dt>
                <dd className="code">
                  {answered}/{total}
                </dd>
              </div>
              {(stats ?? [{ label: "Time left", value: remaining ? `~${minutes} min` : "Done" }]).map((s) => (
                <div key={s.label} className={s.tone ? `is-${s.tone}` : undefined}>
                  <dt>{s.label}</dt>
                  <dd className="code">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <p ref={live} className="visually-hidden" aria-live="polite" />

        {pos.phase === "intro" && (
          <div className={`run-pane run-intro is-${dir}`} key="intro">
            {intro}
            <div className="run-start">
              <button type="button" className="btn btn-primary run-start-btn" disabled={!canStart} onClick={() => go({ phase: "q", level: 0, index: answered ? Math.max(0, firstOpen(0)) : 0 })}>
                {answered ? `Continue · ${remaining} to go` : startLabel}
              </button>
              <p className="run-start-meta code">
                {total} questions · {levels.length} levels · about {Math.max(1, Math.round((total * SECONDS_PER_QUESTION) / 60))} min · keys 1 to {choices.length}
              </p>
            </div>
          </div>
        )}

        {pos.phase === "q" && current && (
          <div className={`run-pane run-q is-${dir}`} key={current.id}>
            <div className="run-q-head">
              <span className="run-ref code" aria-hidden="true">
                {current.ref}
              </span>
              <p className="run-q-meta code">
                <span className="run-q-ref">{current.ref}</span>
                <span>
                  Question {flatIndex + 1} of {total}
                </span>
                {current.tag && <span className={`prio prio-${current.tag.tone}`}>{current.tag.label}</span>}
              </p>
              <p className="run-q-kicker">{current.title}</p>
              <h2 ref={headRef} tabIndex={-1} className="run-q-title" id={`${id}-q`}>
                {current.prompt}
              </h2>
              {current.detail && (
                <div className="run-detail">
                  <button type="button" className="run-detail-btn" aria-expanded={showDetail} onClick={() => setShowDetail((x) => !x)}>
                    <span className="key">?</span> What good looks like
                  </button>
                  {showDetail && (
                    <div className="run-detail-body">
                      {current.detail}
                      {current.basis && <p className="code muted">Basis: {current.basis}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="run-choices" role="radiogroup" aria-labelledby={`${id}-q`} style={{ ["--choices" as string]: choices.length }}>
              {choices.map((c) => {
                const on = answers[current.id] === c.value;
                const tone = current.choiceTones?.[c.value] ?? c.tone;
                return (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`run-choice is-${tone}${on ? " is-on" : ""}${pending?.value === c.value && pending.qid === current.id ? " is-pop" : ""}`}
                    onClick={() => answer(c.value)}
                  >
                    <span className="key" aria-hidden="true">
                      {c.keys[0].toUpperCase()}
                    </span>
                    <span className="run-choice-label">{c.label}</span>
                    <span className="run-choice-hint">{current.choiceHints?.[c.value] ?? c.hint}</span>
                  </button>
                );
              })}
            </div>

            {follow && <div className="run-follow">{follow}</div>}

            <div className="run-feedback" aria-hidden="true">
              {pending && pending.qid === current.id && feedback ? <p key={pending.value}>{feedback(current, pending.value)}</p> : <p className="run-keys code">← back · S skip · ? guidance</p>}
            </div>

            <div className="run-nav">
              <button type="button" className="btn btn-quiet" onClick={back}>
                ← Back
              </button>
              {follow || answers[current.id] !== undefined ? (
                <button type="button" className="btn btn-primary" onClick={advance}>
                  Continue →
                </button>
              ) : (
                <button type="button" className="btn" onClick={advance}>
                  Skip for now
                </button>
              )}
            </div>
          </div>
        )}

        {pos.phase === "level-done" && levels[pos.level] && (
          <div className={`run-pane run-level is-${dir}`} key={`done-${pos.level}`}>
            <p className="run-stamp" aria-hidden="true">
              Level {pos.level + 1} clear
            </p>
            <h2 ref={headRef} tabIndex={-1}>
              {levels[pos.level].label}
            </h2>
            <ul className="run-tally">
              {levelCounts(pos.level).map((c) => (
                <li key={c.value} className={`is-${c.tone}`}>
                  <span className="run-tally-n code">{c.count}</span>
                  <span className="run-tally-l">{c.label}</span>
                </li>
              ))}
            </ul>
            {levelSummary && <div className="run-level-summary">{levelSummary(pos.level)}</div>}
            {levels[pos.level].questions.some((q) => answers[q.id] === undefined) && (
              <p className="note-line">
                {levels[pos.level].questions.filter((q) => answers[q.id] === undefined).length} skipped.{" "}
                <button type="button" className="link-btn" onClick={() => go({ phase: "q", level: pos.level, index: firstOpen(pos.level) }, "back")}>
                  Answer them now
                </button>
              </p>
            )}
            <div className="run-nav">
              <button type="button" className="btn btn-quiet" onClick={back}>
                ← Back
              </button>
              <button type="button" className="btn btn-primary" onClick={advance}>
                {pos.level + 1 < levels.length ? `Level ${pos.level + 2}: ${levels[pos.level + 1].label} →` : "Review my answers →"}
              </button>
            </div>
          </div>
        )}

        {pos.phase === "review" && (
          <div className={`run-pane run-review is-${dir}`} key="review">
            <h2 ref={headRef} tabIndex={-1}>
              Check your answers
            </h2>
            <p className="muted">
              {answered} of {total} answered. Select any answer to change it.
            </p>
            <div className="spec run-review-table">
              <table>
                <colgroup>
                  <col style={{ width: "4.5rem" }} />
                  <col />
                  <col style={{ width: "9rem" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Ref</th>
                    <th scope="col">Question</th>
                    <th scope="col">Answer</th>
                  </tr>
                </thead>
                {levels.map((l, li) => (
                  <tbody key={l.id}>
                    <tr className="spec-group">
                      <th colSpan={3} scope="colgroup">
                        <span>
                          Level {li + 1} · {l.label}
                        </span>
                      </th>
                    </tr>
                    {l.questions.map((q, qi) => {
                      const c = choiceOf(answers[q.id]);
                      const tone = toneOf(q, answers[q.id]);
                      return (
                        <tr key={q.id}>
                          <td className="code" data-label="Ref">
                            {q.ref}
                          </td>
                          <th scope="row" data-label="Question">
                            {q.title}
                          </th>
                          <td data-label="Answer">
                            <button type="button" className={`run-answer-chip is-${tone ?? "open"}`} onClick={() => go({ phase: "q", level: li, index: qi }, "back")}>
                              {c ? c.label : "Skipped"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
            <div className="run-nav">
              <button type="button" className="btn btn-quiet" onClick={back}>
                ← Back
              </button>
              <button type="button" className="btn btn-primary" onClick={advance} disabled={answered === 0}>
                {outroLabel} →
              </button>
            </div>
          </div>
        )}

        {pos.phase === "done" && (
          <div className={`run-pane run-done is-${dir}`} key="done">
            <h2 ref={headRef} tabIndex={-1} className="visually-hidden">
              {outroLabel}
            </h2>
            {outro}
            <div className="run-nav">
              <button type="button" className="btn btn-quiet" onClick={() => go({ phase: "review" }, "back")}>
                ← Review answers
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
