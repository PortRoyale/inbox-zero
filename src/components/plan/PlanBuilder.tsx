"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { craClassInfo, industries, industryBySlug } from "@/content/industries";
import type { CraClass } from "@/content/types";
import { AreaField, Chips, SelectField, TextField, Toggle } from "@/components/plan/fields";
import { Markdown } from "@/components/plan/Markdown";
import { PageHero } from "@/components/PageHero";
import { Balloon, ConfirmButton, CopyButton, Fcf } from "@/components/primitives";
import { formatDate, useToday } from "@/components/Timeline";
import type { AnswerStatus } from "@/lib/assessment-score";
import { categories, productTypes, type ProductType } from "@/lib/cra-requirements";
import { paths } from "@/lib/paths";
import { analyzePlan, type Step } from "@/lib/plan/analyze";
import { planTitle, planToMarkdown } from "@/lib/plan/document";
import { fingerprintPlan, nextRevisionLetter } from "@/lib/plan/hash";
import {
  addYears,
  applyIndustry,
  dataOptions,
  emptyPlan,
  euMemberStates,
  examplePlan,
  interfaceOptions,
  newId,
  practiceOptions,
  type Component,
  type Plan,
  type Risk,
} from "@/lib/plan/model";
import { riskLevel, riskScore, suggestRisks } from "@/lib/plan/risks";
import { PLAN_PRESET_KEY, PLAN_STORAGE_KEY } from "@/lib/plan/storage";
import { disclosurePolicy, reportingRunbook, securityTxt } from "@/lib/plan/templates";

const ASSESSMENT_KEY = "cra-assessment-v1";
const canDownload = process.env.NEXT_PUBLIC_ROUTING !== "hash";

const STEPS: { id: Step; label: string; blurb: string }[] = [
  { id: "product", label: "Product", blurb: "What it is, who uses it, how long you support it." },
  { id: "architecture", label: "Architecture", blurb: "Components, interfaces and the data it handles." },
  { id: "risks", label: "Risks", blurb: "Suggested from your architecture. Accept, adjust or add." },
  { id: "controls", label: "Requirements", blurb: "How you meet each essential requirement, with evidence." },
  { id: "development", label: "Development", blurb: "How you build, scan and test." },
  { id: "vulnerabilities", label: "Vulnerabilities", blurb: "How people report issues and how fast you fix them." },
  { id: "updates", label: "Updates & reporting", blurb: "Update delivery and the 24-hour reporting clock." },
  { id: "review", label: "Review & export", blurb: "Fix what's flagged, issue a revision, export." },
];

const STATUS_OPTIONS: { value: AnswerStatus; label: string }[] = [
  { value: "done", label: "Yes" },
  { value: "partial", label: "Partly" },
  { value: "missing", label: "No" },
  { value: "na", label: "N/A" },
];

export function PlanBuilder() {
  const todayMs = useToday();
  const today = new Date(todayMs).toISOString().slice(0, 10);
  const [plan, setPlan] = useState<Plan>(() => exampleWithOwners());
  const [isExample, setIsExample] = useState(true);
  const [step, setStep] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [view, setView] = useState<"build" | "document">("build");
  const [loaded, setLoaded] = useState(false);
  const [fingerprint, setFingerprint] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const preset = localStorage.getItem(PLAN_PRESET_KEY);
      const saved = localStorage.getItem(PLAN_STORAGE_KEY);
      if (preset) {
        localStorage.removeItem(PLAN_PRESET_KEY);
        setPlan(withRisks(applyIndustry(emptyPlan(), preset)));
        setIsExample(false);
      } else if (saved) {
        const parsed = JSON.parse(saved) as { plan: Plan; isExample: boolean; advanced: boolean };
        setPlan({ ...emptyPlan(), ...parsed.plan });
        setIsExample(parsed.isExample);
        setAdvanced(parsed.advanced);
      }
    } catch {
      // Storage is optional.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({ plan, isExample, advanced }));
    } catch {
      // Storage is optional.
    }
  }, [plan, isExample, advanced, loaded]);

  useEffect(() => {
    let live = true;
    fingerprintPlan(plan).then((h) => live && setFingerprint(h));
    return () => {
      live = false;
    };
  }, [plan]);

  const analysis = useMemo(() => analyzePlan(plan, today), [plan, today]);
  const markdown = useMemo(() => planToMarkdown(plan, analysis, fingerprint || "pending", formatDate(todayMs)), [plan, analysis, fingerprint, todayMs]);

  const update = (fn: (p: Plan) => Plan) => {
    setIsExample(false);
    setPlan((p) => withRisks(fn(p)));
  };

  const go = (i: number) => {
    setStep(i);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const startBlank = () => {
    setPlan(withRisks(emptyPlan()));
    setIsExample(false);
    go(0);
  };

  const current = STEPS[step];
  const stepChecks = analysis.checks.filter((c) => c.step === current.id && !c.passed);

  return (
    <div className="wrap stack">
      <PageHero
        id="plan-title"
        motif="document"
        seed={11}
        label="Plan builder"
        cells={["Annex VII", "Technical documentation"]}
        title="Product security plan"
        lead="Eight short steps produce the technical documentation the CRA asks for. Gaps are never hidden; they become actions with owners and dates."
        aside={<PlanStatus analysis={analysis} />}
      >
        {isExample && (
          <div className="example-banner">
            <p>
              <strong>Example plan loaded</strong> for a fictional smart thermostat. Edit anything to make it yours, or start blank.
            </p>
            <div className="row">
              <SelectField
                id="start-industry"
                label="Start blank for"
                value=""
                options={[{ value: "", label: "Choose your sector" }, ...industries.map((i) => ({ value: i.slug, label: i.name }))]}
                onChange={(slug) => {
                  setPlan(withRisks(applyIndustry(emptyPlan(), slug)));
                  setIsExample(false);
                  go(0);
                }}
              />
              <button type="button" className="btn" onClick={startBlank}>
                Start blank
              </button>
            </div>
          </div>
        )}
        <div className="mode-row">
          <span className="label">View</span>
          <div className="seg" role="radiogroup" aria-label="View">
            <button type="button" role="radio" aria-checked={view === "build"} onClick={() => setView("build")}>
              Build steps
            </button>
            <button type="button" role="radio" aria-checked={view === "document"} onClick={() => setView("document")}>
              Document
            </button>
          </div>
          {view === "build" && (
            <>
              <span className="label">Detail</span>
              <div className="seg" role="radiogroup" aria-label="Detail level">
                <button type="button" role="radio" aria-checked={!advanced} onClick={() => setAdvanced(false)}>
                  Simple
                </button>
                <button type="button" role="radio" aria-checked={advanced} onClick={() => setAdvanced(true)}>
                  Advanced
                </button>
              </div>
            </>
          )}
        </div>
      </PageHero>

      {view === "build" && (
      <div className="plan-grid" ref={topRef}>
        <nav className="stepper sheet" aria-label="Plan steps">
          <ol>
            {STEPS.map((s, i) => {
              const st = analysis.stepStatus[s.id];
              const state = st.blockers ? "blocked" : st.failing ? "open" : "done";
              return (
                <li key={s.id}>
                  <button type="button" className={`step-btn is-${state}`} aria-current={i === step ? "step" : undefined} onClick={() => go(i)}>
                    <Balloon>{i + 1}</Balloon>
                    <span className="step-label">{s.label}</span>
                    <span className="step-state code">{state === "done" ? "✓" : st.failing}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="sheet step-body" aria-labelledby="step-title">
          <div className="step-head">
            <Fcf keyCell={`Step ${step + 1}/8`} cells={[current.label]} />
            <h2 id="step-title">{current.blurb}</h2>
          </div>

          {current.id === "product" && <ProductStep plan={plan} update={update} advanced={advanced} />}
          {current.id === "architecture" && <ArchitectureStep plan={plan} update={update} advanced={advanced} />}
          {current.id === "risks" && <RisksStep plan={plan} update={update} advanced={advanced} />}
          {current.id === "controls" && <ControlsStep plan={plan} update={update} advanced={advanced} reqs={analysis.reqs} />}
          {current.id === "development" && <DevelopmentStep plan={plan} update={update} advanced={advanced} />}
          {current.id === "vulnerabilities" && <VulnStep plan={plan} update={update} advanced={advanced} today={today} />}
          {current.id === "updates" && <UpdatesStep plan={plan} update={update} advanced={advanced} />}
          {current.id === "review" && (
            <ReviewStep
              plan={plan}
              update={update}
              analysis={analysis}
              fingerprint={fingerprint}
              today={today}
              onJump={(s) => go(STEPS.findIndex((x) => x.id === s))}
              onImport={(p) => {
                setPlan(withRisks({ ...emptyPlan(), ...p }));
                setIsExample(false);
              }}
            />
          )}

          {current.id !== "review" && stepChecks.length > 0 && (
            <div className="step-issues">
              <Fcf redline keyCell="To fix" cells={[`${stepChecks.length} item${stepChecks.length > 1 ? "s" : ""}`]} />
              <ul>
                {stepChecks.map((c) => (
                  <li key={c.id} className={`issue issue-${c.severity}`}>
                    <span className="issue-sev code">{c.severity}</span>
                    <span>
                      <strong>{c.message}.</strong> {c.fix} <span className="code muted">{c.ref}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="step-nav">
            <button type="button" className="btn" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0}>
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={() => go(step + 1)}>
                Next: {STEPS[step + 1].label} →
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setView("document")}>
                Open the document →
              </button>
            )}
          </div>
        </section>
      </div>

      )}

      {view === "document" && (
      <section className="sheet doc-sheet" aria-labelledby="doc-title">
        <div className="sheet-head">
          <div>
            <Fcf keyCell="Live document" cells={[planTitle(plan), fingerprint ? `SHA-256 ${fingerprint.slice(0, 12)}…` : "…"]} />
            <h2 id="doc-title">The plan, as an auditor will read it</h2>
            <p className="muted">Updates as you type. Every gap is marked and appears in the action plan (section 11).</p>
          </div>
          <ExportButtons plan={plan} markdown={markdown} />
        </div>
        <Markdown source={markdown} />
      </section>
      )}
    </div>
  );
}

function exampleWithOwners(): Plan {
  const plan = withRisks(examplePlan());
  return { ...plan, risks: plan.risks.map((r) => ({ ...r, owner: r.requirementId === "incident-reporting" ? "Head of Engineering" : "Firmware lead" })) };
}

function withRisks(plan: Plan): Plan {
  return { ...plan, risks: suggestRisks(plan) };
}

type StepProps = { plan: Plan; update: (fn: (p: Plan) => Plan) => void; advanced: boolean };

function PlanStatus({ analysis }: { analysis: ReturnType<typeof analyzePlan> }) {
  return (
    <dl className="tblock plan-status">
      <div>
        <dt>Completeness</dt>
        <dd className="code">
          {analysis.completeness}% · {analysis.checksPassed}/{analysis.checksTotal} checks
        </dd>
        <div className="gauge">
          <span style={{ width: `${analysis.completeness}%` }} />
        </div>
      </div>
      <div>
        <dt>Blocking items</dt>
        <dd className={`code${analysis.blockers.length ? " text-redline" : ""}`}>{analysis.blockers.length}</dd>
      </div>
      <div>
        <dt>Open actions</dt>
        <dd className="code">{analysis.actions.length}</dd>
      </div>
      <div>
        <dt>Audit-ready</dt>
        <dd>{analysis.auditReady ? <span className="mark mark-done code">YES</span> : <span className="code text-redline">NOT YET</span>}</dd>
      </div>
    </dl>
  );
}

function ProductStep({ plan, update, advanced }: StepProps) {
  const p = plan.product;
  const set = (patch: Partial<Plan["product"]>) => update((x) => ({ ...x, product: { ...x.product, ...patch } }));
  const industry = industryBySlug(p.industry);
  return (
    <div className="form-grid">
      <TextField id="p-name" label="Product name" required value={p.name} onChange={(name) => set({ name })} placeholder="Smart thermostat" />
      <TextField id="p-version" label="Version" value={p.version} onChange={(version) => set({ version })} placeholder="2.4" />
      <div className="span-2">
        <AreaField
          id="p-purpose"
          label="Intended purpose"
          required
          value={p.purpose}
          onChange={(purpose) => set({ purpose })}
          placeholder="What does it do, for whom, and where is it used? Include whether it needs an app or cloud service to work."
          hint="Auditors read this first. Two or three plain sentences are enough."
        />
      </div>
      <SelectField
        id="p-industry"
        label="Sector"
        value={p.industry}
        options={[{ value: "", label: "Choose your sector" }, ...industries.map((i) => ({ value: i.slug, label: i.name }))]}
        onChange={(slug) => update((x) => applyIndustry(x, slug))}
        hint={industry ? industry.classNote : "Sets your CRA product class and suggested standards."}
      />
      <SelectField
        id="p-users"
        label="Who uses it"
        value={p.users}
        options={[
          { value: "consumers", label: "Consumers" },
          { value: "business", label: "Businesses" },
          { value: "both", label: "Both" },
        ]}
        onChange={(users) => set({ users })}
      />
      <fieldset className="span-2 chips">
        <legend className="label">
          What it includes <span className="req">*</span>
        </legend>
        <div className="chips-row">
          {productTypes.map((t) => {
            const on = p.types.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                className={`chip${on ? " is-on" : ""}`}
                onClick={() => set({ types: on ? p.types.filter((x) => x !== t.id) : [...p.types, t.id as ProductType] })}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <TextField id="p-market" label="Planned EU market date" type="date" value={p.marketDate} onChange={(marketDate) => set({ marketDate })} />
      <div className="field-with-action">
        <TextField
          id="p-support"
          label="Security updates until"
          required
          type="date"
          value={p.supportEnd}
          onChange={(supportEnd) => set({ supportEnd })}
          hint="Normally at least five years after placing on the market."
        />
        {p.marketDate && (
          <button type="button" className="btn btn-quiet" onClick={() => set({ supportEnd: addYears(p.marketDate, 5) })}>
            Set to 5 years
          </button>
        )}
      </div>
      <div className="class-callout span-2">
        <Fcf keyCell="CRA class" cells={[craClassInfo[p.craClass].label, `Self-assess: ${craClassInfo[p.craClass].selfAssess}`]} />
        <p>{craClassInfo[p.craClass].route}</p>
      </div>
      {advanced && (
        <>
          <TextField id="p-mfr" label="Manufacturer legal name and address" value={p.manufacturer} onChange={(manufacturer) => set({ manufacturer })} />
          <SelectField<CraClass>
            id="p-class"
            label="Override CRA class"
            value={p.craClass}
            options={(Object.keys(craClassInfo) as CraClass[]).map((k) => ({ value: k, label: craClassInfo[k].label }))}
            onChange={(craClass) => set({ craClass })}
            hint="Check Annex III and IV and Implementing Regulation (EU) 2025/2392."
          />
          <Toggle id="p-radio" label="Contains a radio (Wi-Fi, Bluetooth, cellular…)" checked={p.radio} onChange={(radio) => set({ radio })} hint="RED delegated act and EN 18031 apply today." />
          <div className="span-2">
            <AreaField
              id="p-justify"
              label="Support period rationale"
              rows={3}
              value={p.supportJustification}
              onChange={(supportJustification) => set({ supportJustification })}
              placeholder="Why this support period matches how long people use the product."
            />
          </div>
        </>
      )}
    </div>
  );
}

function ArchitectureStep({ plan, update, advanced }: StepProps) {
  const setComp = (id: string, patch: Partial<Component>) =>
    update((x) => ({ ...x, components: x.components.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const addTypical = () =>
    update((x) => {
      const typical: Record<ProductType, Omit<Component, "id">> = {
        firmware: { name: "Device firmware", kind: "firmware", version: "", supplier: "In-house", internetFacing: true },
        hardware: { name: "Main board and SoC", kind: "hardware", version: "", supplier: "", internetFacing: false },
        software: { name: "Companion app", kind: "software", version: "", supplier: "In-house", internetFacing: true },
        cloud: { name: "Cloud backend", kind: "cloud", version: "", supplier: "In-house", internetFacing: true },
      };
      const have = new Set(x.components.map((c) => c.kind));
      const add = x.product.types.filter((t) => !have.has(t)).map((t) => ({ ...typical[t], id: newId("c") }));
      return { ...x, components: [...x.components, ...add] };
    });
  return (
    <div className="stack-sm">
      <div className="components">
        <div className="row-between">
          <p className="label">Components *</p>
          <div className="row">
            <button type="button" className="btn btn-quiet" onClick={addTypical}>
              Add typical components
            </button>
            <button
              type="button"
              className="btn"
              onClick={() =>
                update((x) => ({ ...x, components: [...x.components, { id: newId("c"), name: "", kind: "third-party", version: "", supplier: "", internetFacing: false }] }))
              }
            >
              + Add component
            </button>
          </div>
        </div>
        {plan.components.length === 0 && <p className="muted">No components yet. “Add typical components” fills a starting list from what the product includes.</p>}
        <ul className="comp-list">
          {plan.components.map((c, i) => (
            <li key={c.id} className="comp-row">
              <Balloon>{i + 1}</Balloon>
              <TextField id={`c-name-${c.id}`} label="Name" value={c.name} onChange={(name) => setComp(c.id, { name })} placeholder="e.g. Wi-Fi stack" />
              <SelectField<Component["kind"]>
                id={`c-kind-${c.id}`}
                label="Type"
                value={c.kind}
                options={[
                  { value: "firmware", label: "Firmware" },
                  { value: "software", label: "Software" },
                  { value: "cloud", label: "Cloud" },
                  { value: "hardware", label: "Hardware" },
                  { value: "third-party", label: "Third-party / open source" },
                ]}
                onChange={(kind) => setComp(c.id, { kind })}
              />
              {(advanced || c.kind === "third-party") && (
                <TextField id={`c-sup-${c.id}`} label="Supplier" value={c.supplier} onChange={(supplier) => setComp(c.id, { supplier })} />
              )}
              {advanced && (
                <>
                  <TextField id={`c-ver-${c.id}`} label="Version" value={c.version} onChange={(version) => setComp(c.id, { version })} />
                  <Toggle id={`c-net-${c.id}`} label="Internet-facing" checked={c.internetFacing} onChange={(internetFacing) => setComp(c.id, { internetFacing })} />
                </>
              )}
              <button
                type="button"
                className="btn btn-quiet comp-remove"
                aria-label={`Remove ${c.name || "component"}`}
                onClick={() => update((x) => ({ ...x, components: x.components.filter((y) => y.id !== c.id) }))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Chips label="External interfaces (select all)" options={interfaceOptions} selected={plan.interfaces} onChange={(interfaces) => update((x) => ({ ...x, interfaces }))} />
      <Chips label="Data the product handles" options={dataOptions} selected={plan.data} onChange={(data) => update((x) => ({ ...x, data }))} />
      <p className="muted">Your selections generate the risk assessment in the next step.</p>
    </div>
  );
}

function RisksStep({ plan, update, advanced }: StepProps) {
  const setRisk = (id: string, patch: Partial<Risk>) => update((x) => ({ ...x, risks: x.risks.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const level = (r: Risk) => riskLevel(riskScore(r));
  return (
    <div className="stack-sm">
      <p className="muted">
        {plan.risks.length} risks suggested from your interfaces and data. Keep the ones that apply and choose how you treat
        each. {advanced ? "Scores are likelihood × impact (1–3 each)." : "Switch to Advanced to change scores and owners."}
      </p>
      <ol className="risk-list">
        {plan.risks.map((r, i) => (
          <li key={r.id} className={`risk-row${r.include ? "" : " is-excluded"}`}>
            <div className="risk-main">
              <Toggle id={`r-inc-${r.id}`} label={`R${i + 1}. ${r.threat}`} checked={r.include} onChange={(include) => setRisk(r.id, { include })} hint={`Asset: ${r.asset}. Control: ${r.control}`} />
              <span className={`risk-level risk-${level(r)} code`}>{level(r)}</span>
            </div>
            {r.include && (
              <div className="risk-fields">
                <SelectField<Risk["treatment"]>
                  id={`r-tr-${r.id}`}
                  label="Treatment"
                  value={r.treatment}
                  options={[
                    { value: "mitigate", label: "Mitigate" },
                    { value: "accept", label: "Accept" },
                    { value: "transfer", label: "Transfer" },
                    { value: "avoid", label: "Avoid (remove feature)" },
                  ]}
                  onChange={(treatment) => setRisk(r.id, { treatment })}
                />
                {advanced && (
                  <>
                    <SelectField
                      id={`r-l-${r.id}`}
                      label="Likelihood"
                      value={String(r.likelihood) as "1" | "2" | "3"}
                      options={[
                        { value: "1", label: "1 Low" },
                        { value: "2", label: "2 Medium" },
                        { value: "3", label: "3 High" },
                      ]}
                      onChange={(v) => setRisk(r.id, { likelihood: Number(v) as 1 | 2 | 3 })}
                    />
                    <SelectField
                      id={`r-i-${r.id}`}
                      label="Impact"
                      value={String(r.impact) as "1" | "2" | "3"}
                      options={[
                        { value: "1", label: "1 Low" },
                        { value: "2", label: "2 Medium" },
                        { value: "3", label: "3 High" },
                      ]}
                      onChange={(v) => setRisk(r.id, { impact: Number(v) as 1 | 2 | 3 })}
                    />
                    <TextField id={`r-o-${r.id}`} label="Owner" value={r.owner} onChange={(owner) => setRisk(r.id, { owner })} />
                  </>
                )}
                {r.treatment === "accept" && (
                  <>
                    <TextField id={`r-a-${r.id}`} label="Accepted by" required value={r.acceptedBy} onChange={(acceptedBy) => setRisk(r.id, { acceptedBy })} />
                    <TextField id={`r-rv-${r.id}`} label="Review by" type="date" value={r.reviewBy} onChange={(reviewBy) => setRisk(r.id, { reviewBy })} />
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      {advanced && (
        <button
          type="button"
          className="btn"
          onClick={() =>
            update((x) => ({
              ...x,
              risks: [
                ...x.risks,
                {
                  id: newId("r-custom"),
                  threat: "New risk: describe the threat",
                  asset: "Asset",
                  likelihood: 2,
                  impact: 2,
                  treatment: "mitigate",
                  control: "Planned control",
                  owner: "",
                  acceptedBy: "",
                  reviewBy: "",
                  include: true,
                  custom: true,
                },
              ],
            }))
          }
        >
          + Add custom risk
        </button>
      )}
    </div>
  );
}

function ControlsStep({ plan, update, advanced, reqs }: StepProps & { reqs: ReturnType<typeof analyzePlan>["reqs"] }) {
  const [imported, setImported] = useState<string | null>(null);
  const setCtl = (id: string, patch: Partial<Plan["controls"][string]>) =>
    update((x) => ({ ...x, controls: { ...x.controls, [id]: { ...(x.controls[id] ?? { how: "", evidence: "" }), ...patch } } }));
  const importAssessment = () => {
    try {
      const raw = localStorage.getItem(ASSESSMENT_KEY);
      const saved = raw ? (JSON.parse(raw) as { answers: Record<string, AnswerStatus> }) : null;
      const answers = saved?.answers ?? {};
      const count = Object.keys(answers).length;
      if (!count) {
        setImported("No readiness check answers found in this browser.");
        return;
      }
      update((x) => {
        const controls = { ...x.controls };
        for (const [id, status] of Object.entries(answers)) controls[id] = { ...(controls[id] ?? { how: "", evidence: "" }), status };
        return { ...x, controls };
      });
      setImported(`Imported ${count} answers from your readiness check.`);
    } catch {
      setImported("Could not read readiness check answers in this browser.");
    }
  };
  return (
    <div className="stack-sm">
      <div className="row-between">
        <p className="muted">{reqs.length} requirements apply to what your product includes.</p>
        <div className="row">
          <button type="button" className="btn btn-quiet" onClick={importAssessment}>
            Import readiness check answers
          </button>
          <a className="btn btn-quiet" href={paths.assessment}>
            Open readiness check
          </a>
        </div>
      </div>
      {imported && <p className="note-line">{imported}</p>}
      {categories.map((cat) => {
        const inCat = reqs.filter((r) => r.category === cat.id);
        if (!inCat.length) return null;
        return (
          <div key={cat.id} className="ctl-group">
            <p className="label">{cat.label}</p>
            <ul>
              {inCat.map((r) => {
                const e = plan.controls[r.id];
                return (
                  <li key={r.id} className="ctl-row">
                    <div className="ctl-head">
                      <p id={`ctl-${r.id}`}>
                        <strong>{r.title}</strong> <span className={`prio prio-${r.priority}`}>{r.priority}</span>
                      </p>
                      <div className="seg" role="radiogroup" aria-labelledby={`ctl-${r.id}`}>
                        {STATUS_OPTIONS.map((o) => (
                          <button key={o.value} type="button" role="radio" data-status={o.value} aria-checked={e?.status === o.value} onClick={() => setCtl(r.id, { status: o.value })}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(advanced || e?.status === "na") && (
                      <div className="ctl-fields">
                        <AreaField
                          id={`how-${r.id}`}
                          rows={2}
                          label={e?.status === "na" ? "Why it does not apply" : "How we meet it"}
                          value={e?.how ?? ""}
                          onChange={(how) => setCtl(r.id, { how })}
                          placeholder={r.guidance}
                        />
                        {advanced && (
                          <TextField
                            id={`ev-${r.id}`}
                            label="Evidence (link or document ID)"
                            value={e?.evidence ?? ""}
                            onChange={(evidence) => setCtl(r.id, { evidence })}
                            placeholder="e.g. TEST-042 pen test report, Jira SEC-118"
                          />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function DevelopmentStep({ plan, update, advanced }: StepProps) {
  const set = (patch: Partial<Plan["sdlc"]>) => update((x) => ({ ...x, sdlc: { ...x.sdlc, ...patch } }));
  return (
    <div className="stack-sm">
      <Chips label="Practices in place today" options={practiceOptions} selected={plan.sdlc.practices} onChange={(practices) => set({ practices })} />
      <div className="form-grid">
        <SelectField<Plan["sdlc"]["sbomFormat"]>
          id="d-sbom"
          label="SBOM format *"
          value={plan.sdlc.sbomFormat}
          options={[
            { value: "none", label: "None yet" },
            { value: "CycloneDX", label: "CycloneDX" },
            { value: "SPDX", label: "SPDX" },
          ]}
          onChange={(sbomFormat) => set({ sbomFormat })}
          hint="Machine-readable, covering at least top-level dependencies."
        />
        <SelectField<Plan["sdlc"]["penTestCadence"]>
          id="d-pentest"
          label="Penetration testing"
          value={plan.sdlc.penTestCadence}
          options={[
            { value: "none", label: "Not planned" },
            { value: "major-release", label: "Each new product and major release" },
            { value: "annual", label: "Annually" },
          ]}
          onChange={(penTestCadence) => set({ penTestCadence })}
        />
        <Toggle
          id="d-gate"
          label="We decide testing per release with a release gate"
          checked={plan.sdlc.releaseGate}
          onChange={(releaseGate) => set({ releaseGate })}
          hint="Use the free release gate and keep each record as evidence."
        />
        {advanced && (
          <>
            <TextField id="d-sbomloc" label="Where SBOMs are stored" value={plan.sdlc.sbomLocation} onChange={(sbomLocation) => set({ sbomLocation })} placeholder="CI artifact store, per release" />
            <TextField id="d-last" label="Last penetration test" type="date" value={plan.sdlc.lastPenTest} onChange={(lastPenTest) => set({ lastPenTest })} />
          </>
        )}
      </div>
      <a className="btn btn-quiet" href={paths.releaseGate}>
        Open the release gate →
      </a>
    </div>
  );
}

function VulnStep({ plan, update, advanced, today }: StepProps & { today: string }) {
  const set = (patch: Partial<Plan["vulns"]>) => update((x) => ({ ...x, vulns: { ...x.vulns, ...patch } }));
  const sla = plan.vulns.slaDays;
  return (
    <div className="stack-sm">
      <div className="form-grid">
        <TextField id="v-contact" label="Security contact email" required type="email" value={plan.vulns.contact} onChange={(contact) => set({ contact })} placeholder="security@yourcompany.com" />
        <TextField id="v-policy" label="Disclosure policy URL" type="url" value={plan.vulns.policyUrl} onChange={(policyUrl) => set({ policyUrl })} placeholder="https://yourcompany.com/security" />
        <TextField id="v-adv" label="Where advisories are published" value={plan.vulns.advisoryChannel} onChange={(advisoryChannel) => set({ advisoryChannel })} placeholder="https://yourcompany.com/security/advisories" />
        <Toggle id="v-txt" label="security.txt is published" checked={plan.vulns.securityTxt} onChange={(securityTxt) => set({ securityTxt })} hint="/.well-known/security.txt on your website" />
      </div>
      {advanced && (
        <>
          <fieldset className="sla">
            <legend className="label">Fix targets in days</legend>
            <div className="sla-row">
              {(["critical", "high", "medium", "low"] as const).map((k) => (
                <TextField key={k} id={`sla-${k}`} label={k} type="number" value={String(sla[k])} onChange={(val) => set({ slaDays: { ...sla, [k]: Math.max(0, Number(val) || 0) } })} />
              ))}
            </div>
          </fieldset>
          <div className="templates">
            <TemplateBlock title="security.txt" text={securityTxt(plan, today)} />
            <TemplateBlock title="Disclosure policy" text={disclosurePolicy(plan)} />
          </div>
        </>
      )}
      {!advanced && <p className="muted">Advanced mode generates a ready-to-publish security.txt and disclosure policy from these answers.</p>}
    </div>
  );
}

function UpdatesStep({ plan, update, advanced }: StepProps) {
  const set = (patch: Partial<Plan["updates"]>) => update((x) => ({ ...x, updates: { ...x.updates, ...patch } }));
  return (
    <div className="stack-sm">
      <div className="form-grid">
        <div className="span-2">
          <AreaField id="u-mech" label="How updates reach users" required rows={2} value={plan.updates.mechanism} onChange={(mechanism) => set({ mechanism })} placeholder="e.g. Signed over-the-air images from our cloud, A/B partitions, automatic by default" />
        </div>
        <Toggle id="u-signed" label="Updates are signed and verified before install" checked={plan.updates.signed} onChange={(signed) => set({ signed })} />
        <Toggle id="u-auto" label="Automatic security updates are on by default" checked={plan.updates.autoUpdateDefault} onChange={(autoUpdateDefault) => set({ autoUpdateDefault })} hint="With a clear way for users to opt out." />
        <Toggle id="u-sep" label="Security fixes can ship without a feature release" checked={plan.updates.separateSecurityUpdates} onChange={(separateSecurityUpdates) => set({ separateSecurityUpdates })} />
      </div>
      <div className="reporting-box">
        <Fcf redline keyCell="In force" cells={["Art. 14", "since 11 Sep 2026"]} />
        <p>Actively exploited vulnerabilities and severe incidents must be reported to ENISA's Single Reporting Platform: early warning within 24 hours, notification within 72 hours.</p>
        <div className="form-grid">
          <TextField id="u-owner" label="Reporting owner" required value={plan.updates.reportingOwner} onChange={(reportingOwner) => set({ reportingOwner })} placeholder="Name or role" />
          <TextField id="u-backup" label="Backup reporter" value={plan.updates.reportingBackup} onChange={(reportingBackup) => set({ reportingBackup })} placeholder="Name or role" />
          <SelectField
            id="u-csirt"
            label="Member state of your main EU establishment"
            value={plan.updates.csirtCountry}
            options={[{ value: "", label: "Choose…" }, ...euMemberStates.map((m) => ({ value: m, label: m })), { value: "No EU establishment", label: "No EU establishment" }]}
            onChange={(csirtCountry) => set({ csirtCountry })}
            hint="Without one: your authorised representative's, then importer's, then distributor's member state."
          />
          <TextField id="u-notify" label="How you will inform users" value={plan.updates.userNotification} onChange={(userNotification) => set({ userNotification })} placeholder="In-app notice, email, website" />
          <Toggle id="u-srp" label="Registered on ENISA's Single Reporting Platform" checked={plan.updates.srpRegistered} onChange={(srpRegistered) => set({ srpRegistered })} />
        </div>
        <a className="ext-link" href="https://www.enisa.europa.eu/topics/product-security-and-certification/single-reporting-platform-srp" target="_blank" rel="noreferrer">
          ENISA Single Reporting Platform ↗
        </a>
      </div>
      {advanced && <TemplateBlock title="Reporting runbook" text={reportingRunbook(plan)} />}
    </div>
  );
}

function ReviewStep({
  plan,
  update,
  analysis,
  fingerprint,
  today,
  onJump,
  onImport,
}: {
  plan: Plan;
  update: (fn: (p: Plan) => Plan) => void;
  analysis: ReturnType<typeof analyzePlan>;
  fingerprint: string;
  today: string;
  onJump: (s: Step) => void;
  onImport: (p: Plan) => void;
}) {
  const [summary, setSummary] = useState("");
  const [approver, setApprover] = useState(plan.roles.productOwner);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const setRole = (patch: Partial<Plan["roles"]>) => update((x) => ({ ...x, roles: { ...x.roles, ...patch } }));
  const latest = plan.revisions[plan.revisions.length - 1];
  const changed = latest && latest.hash !== fingerprint;
  const failing = analysis.checks.filter((c) => !c.passed).sort((a, b) => ["blocker", "gap", "advice"].indexOf(a.severity) - ["blocker", "gap", "advice"].indexOf(b.severity));

  const issue = async () => {
    const hash = await fingerprintPlan(plan);
    update((x) => ({
      ...x,
      revisions: [...x.revisions, { rev: nextRevisionLetter(x.revisions), date: today, summary: summary.trim() || "Revision issued", hash, approver: approver.trim() }],
    }));
    setSummary("");
  };

  const doImport = (text: string) => {
    try {
      const parsed = JSON.parse(text) as Plan;
      if (parsed.schema !== 1 || !parsed.product) throw new Error("Not a plan file");
      onImport(parsed);
      setImportMsg("Plan imported.");
    } catch {
      setImportMsg("That is not a valid plan backup (JSON exported from this tool).");
    }
  };

  return (
    <div className="stack-sm">
      <div className="form-grid">
        <TextField id="role-sec" label="Security lead" value={plan.roles.securityLead} onChange={(securityLead) => setRole({ securityLead })} />
        <TextField id="role-eng" label="Engineering lead" value={plan.roles.engineeringLead} onChange={(engineeringLead) => setRole({ engineeringLead })} />
        <TextField id="role-po" label="Product owner (approver)" value={plan.roles.productOwner} onChange={(productOwner) => setRole({ productOwner })} />
        <TextField id="role-legal" label="Legal / compliance contact" value={plan.roles.legalContact} onChange={(legalContact) => setRole({ legalContact })} />
      </div>

      <div className="review-checks">
        <Fcf redline={failing.some((c) => c.severity === "blocker")} keyCell="Quality gate" cells={[`${analysis.checksPassed}/${analysis.checksTotal} passed`, `${analysis.blockers.length} blocking`]} />
        {failing.length === 0 ? (
          <p>All checks pass.</p>
        ) : (
          <ul>
            {failing.map((c) => (
              <li key={c.id} className={`issue issue-${c.severity}`}>
                <span className="issue-sev code">{c.severity}</span>
                <span>
                  <strong>{c.message}.</strong> {c.fix}{" "}
                  <button type="button" className="link-btn" onClick={() => onJump(c.step)}>
                    Go to {STEPS.find((s) => s.id === c.step)?.label}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="issue-rev">
        <Fcf keyCell="Issue revision" cells={[nextRevisionLetter(plan.revisions), changed ? "Edited since last issue" : latest ? `Matches Rev ${latest.rev}` : "First issue"]} />
        <p className="muted">
          Issuing a revision records the date, approver and a SHA-256 fingerprint of the plan's content. Any later edit changes the
          fingerprint, so an auditor can tell whether the document matches what was approved.
        </p>
        <div className="form-grid">
          <TextField id="rev-summary" label="What changed" value={summary} onChange={setSummary} placeholder="First issue for market launch" />
          <TextField id="rev-approver" label="Approved by" value={approver} onChange={setApprover} />
        </div>
        <button type="button" className="btn btn-primary" onClick={issue} disabled={!approver.trim()}>
          Issue revision {nextRevisionLetter(plan.revisions)}
        </button>
        {analysis.blockers.length > 0 && <p className="note-line">You can issue a draft revision now; it will record {analysis.blockers.length} blocking item(s) as open.</p>}
      </div>

      <div className="backup">
        <p className="label">Back up or move this plan</p>
        <div className="row">
          <CopyButton label="Copy plan backup (JSON)" getText={() => JSON.stringify(plan, null, 2)} />
          <label className="btn btn-quiet file-btn" htmlFor="plan-import-file">
            Import backup file
            <input
              id="plan-import-file"
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) f.text().then(doImport);
              }}
            />
          </label>
        </div>
        <AreaField id="plan-import-text" label="Or paste a backup" rows={2} value={importText} onChange={setImportText} placeholder='{"schema":1,…}' />
        <div className="row">
          <button type="button" className="btn" disabled={!importText.trim()} onClick={() => doImport(importText)}>
            Import pasted backup
          </button>
          <ConfirmButton label="Clear plan" confirmLabel="Clear everything" onConfirm={() => onImport(emptyPlan())} />
        </div>
        {importMsg && <p className="note-line">{importMsg}</p>}
      </div>
      <p className="muted">Switch to the Document view to read the full plan and copy it as Markdown{canDownload ? " or download it" : ""}.</p>
    </div>
  );
}

function TemplateBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="template">
      <div className="row-between">
        <p className="label">{title}</p>
        <CopyButton label="Copy" getText={() => text} />
      </div>
      <pre className="code">{text}</pre>
    </div>
  );
}

function ExportButtons({ plan, markdown }: { plan: Plan; markdown: string }) {
  const file = (planTitle(plan) || "security-plan").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const download = (content: string, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="row export-row">
      <CopyButton label="Copy as Markdown" getText={() => markdown} />
      {canDownload && (
        <>
          <button type="button" className="btn" onClick={() => download(markdown, `${file}-security-plan.md`, "text/markdown")}>
            Download .md
          </button>
          <button type="button" className="btn" onClick={() => download(JSON.stringify(plan, null, 2), `${file}-plan-backup.json`, "application/json")}>
            Download backup
          </button>
        </>
      )}
    </div>
  );
}
