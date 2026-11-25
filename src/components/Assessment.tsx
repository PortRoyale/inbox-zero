"use client";

import { useEffect, useMemo, useState } from "react";
import { readinessBand, scoreAssessment, type Answers, type AnswerStatus } from "@/lib/assessment-score";
import {
  categories,
  productTypes,
  requirementsFor,
  type Priority,
  type ProductType,
  type Requirement,
} from "@/lib/cra-requirements";
import { site } from "@/lib/site";

const STORAGE_KEY = "cra-assessment-v1";

const statusOptions: { value: AnswerStatus; label: string; active: string }[] = [
  { value: "done", label: "Yes", active: "border-good bg-good-tint text-good" },
  { value: "partial", label: "Partly", active: "border-ok bg-ok-tint text-ok" },
  { value: "missing", label: "No", active: "border-bad bg-bad-tint text-bad" },
  { value: "na", label: "N/A", active: "border-ink-soft bg-paper text-ink-soft" },
];

const priorityStyle: Record<Priority, string> = {
  critical: "bg-bad-tint text-bad",
  high: "bg-warn-tint text-warn",
  standard: "bg-paper text-muted",
};

const toneStyle = {
  good: { text: "text-good", bar: "bg-good", tint: "bg-good-tint" },
  ok: { text: "text-ok", bar: "bg-ok", tint: "bg-ok-tint" },
  warn: { text: "text-warn", bar: "bg-warn", tint: "bg-warn-tint" },
  bad: { text: "text-bad", bar: "bg-bad", tint: "bg-bad-tint" },
};

type Saved = { productName: string; types: ProductType[]; answers: Answers };

export function Assessment() {
  const [productName, setProductName] = useState("");
  const [types, setTypes] = useState<ProductType[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [loaded, setLoaded] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Saved;
        setProductName(saved.productName ?? "");
        setTypes(saved.types ?? []);
        setAnswers(saved.answers ?? {});
      }
    } catch {
      // Storage may be unavailable (private mode); the tool still works without it.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ productName, types, answers } satisfies Saved));
    } catch {
      // Ignore storage failures; persistence is a convenience only.
    }
  }, [loaded, productName, types, answers]);

  const reqs = useMemo(() => requirementsFor(types), [types]);
  const score = useMemo(() => scoreAssessment(reqs, answers), [reqs, answers]);

  const toggleType = (t: ProductType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const setAnswer = (id: string, status: AnswerStatus) => setAnswers((prev) => ({ ...prev, [id]: status }));

  const reset = () => {
    if (!window.confirm("Clear all answers and start again?")) return;
    setProductName("");
    setTypes([]);
    setAnswers({});
    setShowResults(false);
  };

  const openResults = () => {
    setShowResults(true);
    requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <div className="no-print max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-brand uppercase">Free tool</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">CRA readiness check</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Answer honestly. “Partly” is a perfectly good answer. Your answers are saved in this browser only and never
          leave your device.
        </p>
      </div>

      <section className="no-print mt-10 rounded-xl border border-line p-5 sm:p-6">
        <h2 className="font-semibold text-ink">1. About your product</h2>
        <label className="mt-4 block max-w-md text-sm font-medium text-ink-soft">
          Product name <span className="font-normal text-muted">(optional, shown on your report)</span>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Smart thermostat v2"
            className="mt-1.5 block w-full rounded-md border border-line px-3 py-2 text-ink placeholder:text-muted"
          />
        </label>
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-ink-soft">What does it include? Select all that apply.</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {productTypes.map((t) => {
              const checked = types.includes(t.id);
              return (
                <label
                  key={t.id}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3.5 transition ${
                    checked ? "border-brand bg-brand-tint" : "border-line hover:border-ink-soft"
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleType(t.id)} className="mt-1 accent-brand" />
                  <span>
                    <span className="block text-sm font-medium text-ink">{t.label}</span>
                    <span className="block text-xs text-muted">{t.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      {types.length === 0 ? (
        <p className="no-print mt-8 rounded-lg bg-paper p-5 text-ink-soft">Select at least one product type to see the questions.</p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
          <div className="no-print space-y-8">
            <h2 className="font-semibold text-ink">2. Security requirements ({reqs.length})</h2>
            {categories.map((cat) => {
              const inCat = reqs.filter((r) => r.category === cat.id);
              if (inCat.length === 0) return null;
              return (
                <section key={cat.id}>
                  <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{cat.label}</h3>
                  <div className="mt-3 space-y-3">
                    {inCat.map((r) => (
                      <QuestionCard key={r.id} req={r} value={answers[r.id]} onChange={(s) => setAnswer(r.id, s)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="no-print lg:sticky lg:top-24">
            <div className="rounded-xl border border-line p-5">
              <p className="text-sm text-ink-soft">Progress</p>
              <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">
                {score.answeredCount} <span className="text-base font-normal text-muted">/ {score.total} answered</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${score.total ? (score.answeredCount / score.total) * 100 : 0}%` }}
                />
              </div>
              <button
                type="button"
                onClick={openResults}
                disabled={score.answeredCount === 0}
                className="mt-5 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                {score.complete ? "See my results" : "See results so far"}
              </button>
              <button type="button" onClick={reset} className="mt-2 w-full rounded-md px-4 py-2 text-sm text-muted hover:text-ink">
                Start over
              </button>
            </div>
          </aside>
        </div>
      )}

      {showResults && score.answeredCount > 0 && (
        <Results productName={productName} types={types} score={score} />
      )}
    </div>
  );
}

function QuestionCard({
  req,
  value,
  onChange,
}: {
  req: Requirement;
  value: AnswerStatus | undefined;
  onChange: (s: AnswerStatus) => void;
}) {
  return (
    <div className="rounded-xl border border-line p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-medium text-ink">{req.title}</h4>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${priorityStyle[req.priority]}`}>
          {req.priority}
        </span>
      </div>
      <p className="mt-1.5 text-ink-soft">{req.question}</p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-brand hover:underline">What good looks like</summary>
        <p className="mt-2 text-ink-soft">{req.guidance}</p>
        <p className="mt-1 text-xs text-muted">CRA reference: {req.craRef}</p>
      </details>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={req.title}>
        {statusOptions.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`min-w-16 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                active ? o.active : "border-line text-ink-soft hover:border-ink-soft"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Results({
  productName,
  types,
  score,
}: {
  productName: string;
  types: ProductType[];
  score: ReturnType<typeof scoreAssessment>;
}) {
  const band = readinessBand(score.percent);
  const tone = toneStyle[band.tone];
  const typeLabels = productTypes.filter((t) => types.includes(t.id)).map((t) => t.label);
  const generatedOn = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <section id="results" className="mt-14 scroll-mt-24 border-t border-line pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">Your report</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">
            {productName ? `${productName}: CRA readiness` : "CRA readiness report"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {typeLabels.join(" · ")} · {generatedOn}
            {!score.complete && ` · ${score.total - score.answeredCount} questions unanswered`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:border-ink-soft"
        >
          Print / save as PDF
        </button>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className={`rounded-xl p-6 ${tone.tint}`}>
          <p className="text-sm text-ink-soft">Readiness score</p>
          <p className={`mt-1 text-5xl font-semibold tabular-nums ${tone.text}`}>{score.percent}%</p>
          <p className={`mt-1 font-medium ${tone.text}`}>{band.label}</p>
        </div>
        <div className="rounded-xl border border-line p-6">
          <p className="text-sm text-ink-soft">Open gaps</p>
          <p className="mt-1 text-5xl font-semibold text-ink tabular-nums">{score.gaps.length}</p>
          <p className="mt-1 text-sm text-muted">including {score.criticalGaps} critical</p>
        </div>
        <div className="rounded-xl border border-line p-6">
          <p className="text-sm text-ink-soft">By area</p>
          <ul className="mt-3 space-y-2.5">
            {score.byCategory.map((c) => {
              const t = toneStyle[readinessBand(c.percent).tone];
              return (
                <li key={c.id} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-ink-soft">{c.label}</span>
                    <span className="font-medium text-ink tabular-nums">{c.percent}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper">
                    <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${c.percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <h3 className="mt-10 text-lg font-semibold text-ink">Prioritised action plan</h3>
      {score.gaps.length === 0 ? (
        <p className="mt-3 text-ink-soft">No gaps among the questions you answered. Keep the evidence on file.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {score.gaps.map((g, i) => (
            <li key={g.id} className="flex gap-4 rounded-xl border border-line p-4 break-inside-avoid">
              <span className="font-mono text-sm text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{g.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${priorityStyle[g.priority]}`}>
                    {g.priority}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{g.guidance}</p>
                <p className="mt-1 text-xs text-muted">CRA reference: {g.craRef}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="no-print mt-10 rounded-xl bg-ink p-6 text-white sm:p-8">
        <h3 className="text-xl font-semibold">Want help closing these gaps?</h3>
        <p className="mt-2 max-w-2xl text-white/75">
          Early-access customers get the security plan builder, SBOM monitoring and a reporting playbook, plus a review
          of this report with a security expert.
        </p>
        <a
          href={`mailto:${site.contactEmail}?subject=CRA%20readiness%20report%20(${score.percent}%25)`}
          className="mt-5 inline-block rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-brand-tint"
        >
          Book a free review
        </a>
      </div>

      <p className="mt-6 text-xs text-muted">
        This self-assessment is guidance, not legal advice or a conformity assessment. Generated with {site.name}.
      </p>
    </section>
  );
}
