"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/PageHero";
import { ConfirmButton, ContactLine, CopyButton, Fcf } from "@/components/primitives";
import { OptionGrid, SpecTable } from "@/components/structure";
import { formatDate, useToday } from "@/components/Timeline";
import { readinessChoices, readinessFeedback } from "@/components/walkthrough/choices";
import { Walkthrough, type RunLevel } from "@/components/walkthrough/Walkthrough";
import { readinessBand, scoreAssessment, type Answers, type AnswerStatus } from "@/lib/assessment-score";
import { categories, productTypes, requirementsFor, type ProductType, type Requirement } from "@/lib/cra-requirements";
import { assessmentReportText } from "@/lib/report-text";
import { paths } from "@/lib/paths";
import { PLAN_FROM_ASSESSMENT_KEY } from "@/lib/plan/storage";

const STORAGE_KEY = "cra-assessment-v1";

const SECTION_LETTERS = "ABCDEF";

type Saved = { productName: string; types: ProductType[]; answers: Answers };

export function Assessment() {
  const [productName, setProductName] = useState("");
  const [types, setTypes] = useState<ProductType[]>(["hardware", "firmware"]);
  const [answers, setAnswers] = useState<Answers>({});
  const [loaded, setLoaded] = useState(false);
  const [runKey, setRunKey] = useState(0);

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
      // Storage can be unavailable (private mode, embedded viewers); the tool works without it.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ productName, types, answers } satisfies Saved));
    } catch {
      // Persistence is a convenience only.
    }
  }, [loaded, productName, types, answers]);

  const reqs = useMemo(() => requirementsFor(types), [types]);
  const score = useMemo(() => scoreAssessment(reqs, answers), [reqs, answers]);
  const itemIds = useMemo(() => buildItemIds(reqs), [reqs]);
  const byId = useMemo(() => Object.fromEntries(reqs.map((r) => [r.id, r])), [reqs]);

  const reset = () => {
    setProductName("");
    setTypes([]);
    setAnswers({});
    try {
      localStorage.removeItem(`${STORAGE_KEY}:pos`);
    } catch {
      // Storage is optional.
    }
    setRunKey((k) => k + 1);
  };

  const levels: RunLevel[] = categories
    .map((cat) => ({
      id: cat.id,
      label: cat.label,
      questions: reqs
        .filter((r) => r.category === cat.id)
        .map((r) => ({
          id: r.id,
          ref: itemIds[r.id],
          title: r.title,
          prompt: r.question,
          detail: <p>{r.guidance}</p>,
          basis: `CRA ${r.craRef}`,
          tag: { label: r.priority, tone: r.priority as "critical" | "high" | "standard" },
        })),
    }))
    .filter((l) => l.questions.length > 0);

  const gaps = score.gaps.length;

  const intro = (
    <div className="run-setup">
      <div className="run-setup-head">
        <Fcf keyCell="Level 0" cells={["Your product"]} />
        <h2>What are you checking?</h2>
        <p className="muted">Pick what the product includes. The questions adapt: {reqs.length} apply right now.</p>
      </div>
      <label className="field" htmlFor="product-name">
        <span className="label">Product name (optional)</span>
        <input id="product-name" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Smart thermostat v2" />
      </label>
      <OptionGrid
        id="type"
        legend="What does it include?"
        required
        options={productTypes.map((t) => ({ value: t.id, label: t.label, hint: t.hint }))}
        selected={types}
        onChange={(next) => setTypes(next as ProductType[])}
        note={types.length === 0 ? "Select at least one to start." : undefined}
      />
      {levels.length > 0 && (
        <SpecTable
          caption="Your route"
          rows={levels}
          rowKey={(l) => l.id}
          cols={[
            { key: "lvl", label: "Level", width: "5rem", code: true, render: (_l, i) => String(i + 1) },
            { key: "name", label: "Section", head: true, render: (l) => l.label },
            { key: "n", label: "Questions", width: "7rem", code: true, render: (l) => l.questions.length },
            {
              key: "done",
              label: "Answered",
              width: "7rem",
              code: true,
              render: (l) => `${l.questions.filter((q) => answers[q.id] !== undefined).length}/${l.questions.length}`,
            },
          ]}
        />
      )}
    </div>
  );

  return (
    <div className="wrap stack" data-tool="readiness">
      <PageHero
        id="assess-title"
        tool="readiness"
        motif="gauge"
        seed={17}
        label="Free tool"
        cells={["Inspection run", "Annex I"]}
        title="CRA readiness check"
        lead="One question at a time, about ten minutes. “Partly” is a perfectly good answer. Your answers stay in this browser."
      />
      <Walkthrough<AnswerStatus>
        key={runKey}
        id="readiness-run"
        name="Readiness check"
        storageKey={STORAGE_KEY}
        levels={levels}
        choices={readinessChoices}
        answers={answers}
        onAnswer={(id, v) => setAnswers((prev) => ({ ...prev, [id]: v }))}
        feedback={(q, v) => readinessFeedback(q.title, byId[q.id]?.priority ?? "standard", v)}
        intro={intro}
        canStart={types.length > 0}
        startLabel={`Start the check · ${reqs.length} questions`}
        stats={[
          { label: "Gaps", value: gaps, tone: gaps ? "bad" : undefined },
          { label: "Time left", value: score.total - score.answeredCount ? `~${Math.max(1, Math.round(((score.total - score.answeredCount) * 18) / 60))} min` : "Done" },
        ]}
        levelSummary={(li) => {
          const cat = score.byCategory.find((c) => c.id === levels[li].id);
          const levelGaps = score.gaps.filter((g) => g.category === levels[li].id);
          return (
            <SpecTable
              rows={[0]}
              rowKey={() => "s"}
              cols={[
                { key: "score", label: "Level score", width: "9rem", code: true, render: () => (cat ? `${cat.percent}%` : "N/A") },
                {
                  key: "bar",
                  label: "Readiness",
                  bare: true,
                  render: () => (
                    <span className="gauge" role="img" aria-label={`${cat?.percent ?? 0}%`}>
                      <span style={{ width: `${cat?.percent ?? 0}%`, ["--pct" as string]: cat?.percent ?? 0 }} />
                    </span>
                  ),
                },
                { key: "gaps", label: "Gaps", width: "6rem", code: true, render: () => levelGaps.length },
                { key: "crit", label: "Critical", width: "6rem", code: true, render: () => levelGaps.filter((g) => g.priority === "critical").length },
              ]}
            />
          );
        }}
        outroLabel="See my report"
        outroMeta={score.answeredCount ? `${score.percent}%` : "0%"}
        outro={<Report productName={productName} types={types} score={score} itemIds={itemIds} answers={answers} />}
        aside={
          <div className="run-aside">
            <ConfirmButton label="Start over" confirmLabel="Clear all answers" onConfirm={reset} />
          </div>
        }
      />
    </div>
  );
}

function Report({
  productName,
  types,
  score,
  itemIds,
  answers,
}: {
  productName: string;
  types: ProductType[];
  score: ReturnType<typeof scoreAssessment>;
  itemIds: Record<string, string>;
  answers: Answers;
}) {
  const today = useToday();
  const band = readinessBand(score.percent);
  const weakest = [...score.byCategory].sort((a, b) => a.percent - b.percent)[0];
  const typeLabels = productTypes.filter((t) => types.includes(t.id)).map((t) => t.label);
  const date = formatDate(today);

  return (
    <div id="report" className="report" aria-labelledby="report-title">
      <div className="sheet-head">
        <div>
          <Fcf keyCell="Inspection report" cells={[date, `${score.answeredCount}/${score.total} answered`]} />
          <h2 id="report-title">{productName ? `${productName}: CRA readiness` : "CRA readiness report"}</h2>
          <p className="muted">{typeLabels.join(" · ")}</p>
        </div>
        <CopyButton
          label="Copy report as text"
          getText={() => assessmentReportText({ productName, productTypes: typeLabels, date, score, itemIds })}
        />
      </div>

      <div className="report-summary">
        <div className="scale-block">
          <p className="label">Readiness score</p>
          <p className="big-figure code">
            {score.percent}
            <span>%</span>
          </p>
          <ReadinessScale percent={score.percent} />
          <p className={`band band-${band.tone}`}>{band.label}</p>
        </div>
        <dl className="tblock report-tblock">
          <div>
            <dt>Open gaps</dt>
            <dd className="code">{score.gaps.length}</dd>
          </div>
          <div>
            <dt>Critical gaps</dt>
            <dd className="code">{score.criticalGaps}</dd>
          </div>
          <div>
            <dt>Weakest area</dt>
            <dd>{weakest ? `${weakest.label} (${weakest.percent}%)` : "None"}</dd>
          </div>
        </dl>
        <ul className="areas">
          {score.byCategory.map((c) => (
            <li key={c.id}>
              <div className="area-row">
                <span>{c.label}</span>
                <span className="code">{c.percent}%</span>
              </div>
              <div className="gauge">
                <span style={{ width: `${c.percent}%`, ["--pct" as string]: c.percent }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="report-cta">
        <div>
          <h3>Turn this report into your security plan</h3>
          <p>Your {score.answeredCount} answers carry over. The plan builder adds the risk assessment, evidence and a dated action plan for every gap.</p>
        </div>
        <a
          className="btn btn-on-ink"
          href={paths.plan}
          onClick={() => {
            try {
              localStorage.setItem(PLAN_FROM_ASSESSMENT_KEY, JSON.stringify({ productName, types, answers }));
            } catch {
              // Without storage the plan builder still opens; answers can be imported there.
            }
          }}
        >
          Build my plan from these answers
        </a>
      </div>
      <div className="redlines">
        <Fcf redline keyCell="Redline list" cells={["Highest priority first"]} />
        {score.gaps.length === 0 ? (
          <p>No gaps among the items you answered. Keep the evidence on file.</p>
        ) : (
          <SpecTable
            className="fix-register"
            rows={score.gaps}
            rowKey={(g) => g.id}
            cols={[
              { key: "ref", label: "Ref", width: "4.5rem", code: true, render: (g) => <span className="redline-id">{itemIds[g.id]}</span> },
              {
                key: "req",
                label: "Requirement",
                head: true,
                render: (g) => (
                  <details className="redline-item">
                    <summary>{g.title}</summary>
                    <p>{g.guidance}</p>
                  </details>
                ),
              },
              {
                key: "ans",
                label: "Answer",
                width: "8.5rem",
                render: (g) => <span className={`run-answer-chip is-${answers[g.id] === "partial" ? "partial" : "bad"}`}>{answers[g.id] === "partial" ? "Partly" : "No"}</span>,
              },
              { key: "prio", label: "Priority", width: "8.5rem", render: (g) => <span className={`prio prio-${g.priority}`}>{g.priority}</span> },
              { key: "ref2", label: "Basis", width: "13rem", code: true, render: (g) => g.craRef },
            ]}
          />
        )}
      </div>

      <div className="report-help">
        <p>Want a security expert to review this with you?</p>
        <ContactLine />
      </div>
      <p className="label">Self-assessment guidance. Not legal advice or a conformity assessment.</p>
    </div>
  );
}

function ReadinessScale({ percent }: { percent: number }) {
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);
  const zones = [
    { from: 0, to: 30, label: "Early" },
    { from: 30, to: 60, label: "Gaps" },
    { from: 60, to: 85, label: "Progress" },
    { from: 85, to: 100, label: "Ready" },
  ];
  const x = (v: number) => 16 + (v / 100) * 368;
  return (
    <svg className="scale" viewBox="0 0 400 74" role="img" aria-label={`Score ${percent} out of 100`}>
      {zones.map((z) => (
        <g key={z.label}>
          <line x1={x(z.from)} y1="10" x2={x(z.from)} y2="22" stroke="var(--ink)" strokeWidth="1" />
          <text x={(x(z.from) + x(z.to)) / 2} y="16" textAnchor="middle" className="scale-zone">
            {z.label}
          </text>
        </g>
      ))}
      <line x1={x(0)} y1="34" x2={x(100)} y2="34" stroke="var(--ink)" strokeWidth="2" />
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x(v)} y1="34" x2={x(v)} y2={v % 50 === 0 ? 46 : 41} stroke="var(--ink)" strokeWidth="1" />
          <text x={x(v)} y="62" textAnchor="middle" className="scale-num">
            {v}
          </text>
        </g>
      ))}
      <path d={`M${x(percent) - 8} 22 L${x(percent) + 8} 22 L${x(percent)} 33 Z`} fill="var(--redline)" />
    </svg>
  );
}

function buildItemIds(reqs: Requirement[]) {
  const ids: Record<string, string> = {};
  categories.forEach((cat, ci) => {
    reqs
      .filter((r) => r.category === cat.id)
      .forEach((r, i) => {
        ids[r.id] = `${SECTION_LETTERS[ci]}.${i + 1}`;
      });
  });
  return ids;
}
