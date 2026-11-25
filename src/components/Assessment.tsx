"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/PageHero";
import { Balloon, ConfirmButton, ContactLine, CopyButton, Fcf, RedPen } from "@/components/primitives";
import { SheetTabs, type SheetTab } from "@/components/SheetTabs";
import { formatDate, useToday } from "@/components/Timeline";
import { readinessBand, scoreAssessment, type Answers, type AnswerStatus } from "@/lib/assessment-score";
import { categories, productTypes, requirementsFor, type ProductType, type Requirement } from "@/lib/cra-requirements";
import { assessmentReportText } from "@/lib/report-text";
import { paths } from "@/lib/paths";
import { PLAN_FROM_ASSESSMENT_KEY } from "@/lib/plan/storage";
import { regulation } from "@/lib/site";

const STORAGE_KEY = "cra-assessment-v1";

const statusOptions: { value: AnswerStatus; label: string }[] = [
  { value: "done", label: "Yes" },
  { value: "partial", label: "Partly" },
  { value: "missing", label: "No" },
  { value: "na", label: "N/A" },
];

const SECTION_LETTERS = "ABCDEF";

type Saved = { productName: string; types: ProductType[]; answers: Answers };

export function Assessment() {
  const [productName, setProductName] = useState("");
  const [types, setTypes] = useState<ProductType[]>(["hardware", "firmware"]);
  const [answers, setAnswers] = useState<Answers>({});
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);

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

  const statusCounts = statusOptions.map((o) => ({
    ...o,
    count: reqs.filter((r) => answers[r.id] === o.value).length,
  }));

  const toggleType = (t: ProductType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const reset = () => {
    setProductName("");
    setTypes([]);
    setAnswers({});
    setStep(0);
  };

  const sections = categories
    .map((cat, ci) => ({ cat, letter: SECTION_LETTERS[ci], items: reqs.filter((r) => r.category === cat.id) }))
    .filter((x) => x.items.length > 0);

  const steps: SheetTab[] = [
    {
      id: "product",
      label: "Your product",
      state: types.length ? "done" : "open",
      content: (
        <div className="setup">
          <h2>What are you assessing?</h2>
          <label className="field" htmlFor="product-name">
            <span className="label">Product name (optional)</span>
            <input id="product-name" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Smart thermostat v2" />
          </label>
          <fieldset className="types">
            <legend className="label">What does it include? Select all that apply.</legend>
            <div className="types-grid">
              {productTypes.map((t) => {
                const checked = types.includes(t.id);
                return (
                  <label key={t.id} className={`type-option${checked ? " is-checked" : ""}`} htmlFor={`type-${t.id}`}>
                    <input id={`type-${t.id}`} type="checkbox" checked={checked} onChange={() => toggleType(t.id)} />
                    <span>
                      <strong>{t.label}</strong>
                      <span className="muted">{t.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {types.length === 0 && <p className="note-line">Select at least one type. The questions are filtered to what your product includes.</p>}
        </div>
      ),
    },
    ...sections.map(({ cat, letter, items }) => {
      const answered = items.filter((r) => answers[r.id]).length;
      return {
        id: cat.id,
        label: cat.label,
        state: answered === items.length ? ("done" as const) : ("open" as const),
        badge: answered === items.length ? undefined : `${answered}/${items.length}`,
        content: (
          <section className="insp-section" aria-labelledby={`sec-${cat.id}`}>
            <div className="insp-section-head">
              <Fcf keyCell={`Section ${letter}`} cells={[`${items.length} items`]} />
              <h2 id={`sec-${cat.id}`}>{cat.label}</h2>
            </div>
            <ol className="insp-list">
              {items.map((r) => (
                <InspectionItem
                  key={r.id}
                  req={r}
                  itemId={itemIds[r.id]}
                  value={answers[r.id]}
                  onChange={(st) => setAnswers((prev) => ({ ...prev, [r.id]: st }))}
                />
              ))}
            </ol>
          </section>
        ),
      };
    }),
    {
      id: "report",
      label: "Your report",
      content:
        score.answeredCount > 0 ? (
          <Report productName={productName} types={types} score={score} itemIds={itemIds} answers={answers} />
        ) : (
          <p className="note-line">Answer at least one item to see your report.</p>
        ),
    },
  ];

  return (
    <div className="wrap stack">
      <PageHero
        id="assess-title"
        motif="gauge"
        seed={17}
        label="Free tool"
        cells={["Inspection sheet", "Annex I"]}
        title="CRA readiness check"
        lead="Answer honestly; “Partly” is a perfectly good answer. Your answers stay in this browser and never leave your device."
      />
      <SheetTabs
        label="Readiness check steps"
        wizard
        items={steps}
        value={step}
        onValueChange={setStep}
        side={
          <div className="sheet status-panel">
            <p className="label">Inspection status</p>
            <p className="status-count code">
              {score.answeredCount}
              <span className="muted"> / {score.total}</span>
            </p>
            <div className="gauge" role="progressbar" aria-valuemin={0} aria-valuemax={score.total} aria-valuenow={score.answeredCount} aria-label="Items answered">
              <span style={{ width: `${score.total ? (score.answeredCount / score.total) * 100 : 0}%` }} />
            </div>
            <dl className="status-tally">
              {statusCounts.map((sc) => (
                <div key={sc.value}>
                  <dt>
                    <span className={`swatch swatch-${sc.value}`} aria-hidden="true" />
                    {sc.label}
                  </dt>
                  <dd className="code">{sc.count}</dd>
                </div>
              ))}
            </dl>
            <button type="button" className="btn btn-primary" onClick={() => setStep(steps.length - 1)} disabled={score.answeredCount === 0}>
              {score.complete ? "See my report" : "See report so far"}
            </button>
            <ConfirmButton label="Start over" confirmLabel="Clear all answers" onConfirm={reset} />
          </div>
        }
      />
    </div>
  );
}

function InspectionItem({
  req,
  itemId,
  value,
  onChange,
}: {
  req: Requirement;
  itemId: string;
  value: AnswerStatus | undefined;
  onChange: (s: AnswerStatus) => void;
}) {
  const titleId = `item-${req.id}`;
  return (
    <li className={`insp-item${value ? ` is-${value}` : ""}`}>
      <Balloon>{itemId}</Balloon>
      <div className="insp-body">
        <div className="insp-title-row">
          <h3 id={titleId}>
            <span className={`mark${value && value !== "missing" ? ` mark-${value}` : ""}`}>
              {req.title}
              {value === "missing" && <RedPen />}
            </span>
          </h3>
          <span className={`prio prio-${req.priority}`}>{req.priority}</span>
        </div>
        <p className="insp-q">{req.question}</p>
        <details className="insp-more">
          <summary>What good looks like</summary>
          <p>{req.guidance}</p>
          <p className="code muted">CRA ref. {req.craRef}</p>
        </details>
        <div className="seg" role="radiogroup" aria-labelledby={titleId}>
          {statusOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              data-status={o.value}
              aria-checked={value === o.value}
              onClick={() => onChange(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </li>
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
            <dt>Instrument</dt>
            <dd>{regulation}</dd>
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
                <span style={{ width: `${c.percent}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="redlines">
        <Fcf redline keyCell="Redline list" cells={["Highest priority first"]} />
        {score.gaps.length === 0 ? (
          <p>No gaps among the items you answered. Keep the evidence on file.</p>
        ) : (
          <ol>
            {score.gaps.map((g) => (
              <li key={g.id}>
                <span className="redline-id code">{itemIds[g.id]}</span>
                <div>
                  <p className="redline-title">
                    {g.title} <span className={`prio prio-${g.priority}`}>{g.priority}</span>
                  </p>
                  <p>{g.guidance}</p>
                  <p className="code muted">CRA ref. {g.craRef}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
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
