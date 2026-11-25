"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { craClassInfo, industries, industryBySlug } from "@/content/industries";
import type { CraClass } from "@/content/types";
import { AreaField, SelectField, TextField, Toggle } from "@/components/plan/fields";
import { Markdown } from "@/components/plan/Markdown";
import { PageHero } from "@/components/PageHero";
import { SheetTabs } from "@/components/SheetTabs";
import { Balloon, ConfirmButton, CopyButton, Fcf } from "@/components/primitives";
import { CheckList, OptionGrid, SpecTable } from "@/components/structure";
import { readinessChoices, readinessFeedback } from "@/components/walkthrough/choices";
import { Walkthrough } from "@/components/walkthrough/Walkthrough";
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
  dataGroups,
  emptyPlan,
  euMemberStates,
  examplePlan,
  interfaceGroups,
  newId,
  practiceGroups,
  practiceHints,
  type Component,
  type Plan,
  type Risk,
} from "@/lib/plan/model";
import { riskLevel, riskScore, suggestRisks } from "@/lib/plan/risks";
import { PLAN_FROM_ASSESSMENT_KEY, PLAN_PRESET_KEY, PLAN_STORAGE_KEY } from "@/lib/plan/storage";
import { disclosurePolicy, fundingOutline, reportingRunbook, securityTxt, supplierQuestionnaire } from "@/lib/plan/templates";
import { DAYS_BY_CLASS, GUIDED, STARTER_YEAR } from "@/lib/costs";
import { api, type ApiError } from "@/lib/client/api";

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

// Cloud mode: the plan belongs to a product in a team workspace. It is loaded from and saved to the
// server (optimistic versioning), and revisions are fingerprinted and signed by the server.
export type CloudPlan = {
  productId: string;
  initialPlan: Plan;
  initialVersion: number;
  canEdit: boolean;
  canApprove: boolean;
};

type SaveState = { kind: "saved" | "saving" | "dirty" | "error" | "conflict"; message?: string };

export function PlanBuilder({ cloud }: { cloud?: CloudPlan } = {}) {
  const todayMs = useToday();
  const today = new Date(todayMs).toISOString().slice(0, 10);
  const [plan, setPlan] = useState<Plan>(() => (cloud ? cloud.initialPlan : exampleWithOwners()));
  const [isExample, setIsExample] = useState(!cloud);
  const [version, setVersion] = useState(cloud?.initialVersion ?? 0);
  const [save, setSave] = useState<SaveState>({ kind: "saved" });
  const dirty = useRef(false);
  const [step, setStep] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [view, setView] = useState<"build" | "document">("build");
  const [importedNote, setImportedNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [fingerprint, setFingerprint] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cloud) {
      setLoaded(true);
      return;
    }
    try {
      const preset = localStorage.getItem(PLAN_PRESET_KEY);
      const saved = localStorage.getItem(PLAN_STORAGE_KEY);
      const fromAssessment = localStorage.getItem(PLAN_FROM_ASSESSMENT_KEY);
      if (fromAssessment) {
        localStorage.removeItem(PLAN_FROM_ASSESSMENT_KEY);
        const a = JSON.parse(fromAssessment) as { productName: string; types: ProductType[]; answers: Record<string, AnswerStatus | undefined> };
        const base = emptyPlan();
        const controls: Plan["controls"] = {};
        for (const [id, status] of Object.entries(a.answers)) if (status) controls[id] = { status, how: "", evidence: "" };
        setPlan(withRisks({ ...base, product: { ...base.product, name: a.productName, types: a.types }, controls }));
        setIsExample(false);
        setImportedNote(`Started from your readiness check: ${Object.keys(controls).length} requirement answers carried over.`);
      } else if (preset) {
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
    if (!loaded || cloud) return;
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

  // Cloud autosave: debounced, versioned; a conflicting save never overwrites someone else's work.
  useEffect(() => {
    if (!cloud || !cloud.canEdit || !dirty.current || save.kind === "conflict") return;
    setSave({ kind: "dirty" });
    const t = setTimeout(async () => {
      setSave({ kind: "saving" });
      try {
        const res = await api<{ version: number }>("PUT", `/products/${cloud.productId}/plan`, { plan, version });
        dirty.current = false;
        setVersion(res.version);
        setSave({ kind: "saved" });
      } catch (e) {
        const err = e as ApiError;
        setSave(err.status === 409 ? { kind: "conflict", message: err.message } : { kind: "error", message: err.message });
      }
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const reloadLatest = async () => {
    if (!cloud) return;
    const res = await api<{ plan: Plan; version: number }>("GET", `/products/${cloud.productId}/plan`);
    dirty.current = false;
    setPlan(res.plan);
    setVersion(res.version);
    setSave({ kind: "saved" });
  };

  const issueCloudRevision = async (summary: string) => {
    if (!cloud) throw new Error("Not in cloud mode");
    if (dirty.current) {
      const saved = await api<{ version: number }>("PUT", `/products/${cloud.productId}/plan`, { plan, version });
      dirty.current = false;
      setVersion(saved.version);
    }
    const res = await api<{ rev: string; fingerprint: string; statement: Record<string, unknown>; signature: Record<string, unknown>; version: number }>(
      "POST",
      `/products/${cloud.productId}/revisions`,
      { summary },
    );
    setPlan((p) => ({
      ...p,
      revisions: [...p.revisions, { rev: res.rev, date: String(res.statement.issuedAt).slice(0, 10), summary, hash: res.fingerprint, approver: String(res.statement.approver) }],
    }));
    setVersion(res.version);
    setSave({ kind: "saved" });
    return res;
  };

  const analysis = useMemo(() => analyzePlan(plan, today), [plan, today]);
  const markdown = useMemo(() => planToMarkdown(plan, analysis, fingerprint || "pending", formatDate(todayMs)), [plan, analysis, fingerprint, todayMs]);

  const update = (fn: (p: Plan) => Plan) => {
    if (cloud && !cloud.canEdit) return;
    setIsExample(false);
    dirty.current = true;
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

  const saveLabel =
    !cloud?.canEdit
      ? "Your role can read this plan"
      : save.kind === "saving"
        ? "Saving…"
        : save.kind === "dirty"
          ? "Unsaved changes"
          : save.kind === "error"
            ? `Not saved: ${save.message}`
            : save.kind === "conflict"
              ? "Changed elsewhere"
              : "All changes saved";

  const strip = (
    <div className="plan-toolbar control-strip">
      <div className="cs-cell cs-wide">
        <p className="cs-head">
          <span className="label">Plan</span>
          <span className="cs-note">
            {cloud ? (
              saveLabel
            ) : isExample ? (
              <>
                <strong>Example</strong> for a fictional thermostat
              </>
            ) : (
              importedNote || "Yours, saved in this browser"
            )}
          </span>
        </p>
        {cloud ? (
          <div className="cs-control cs-start">
            <p className="cs-plan-name">{plan.product.name || "Untitled plan"}</p>
            <span className={`save-tag is-${cloud.canEdit ? save.kind : "view"}`}>{cloud.canEdit ? `v${version}` : "View only"}</span>
          </div>
        ) : isExample ? (
          <div className="cs-control cs-start">
            <select
              id="start-industry"
              aria-label="Start your own plan for a sector"
              value=""
              onChange={(e) => {
                setPlan(withRisks(applyIndustry(emptyPlan(), e.target.value)));
                setIsExample(false);
                go(0);
              }}
            >
              <option value="">Start yours: choose your sector…</option>
              {industries.map((i) => (
                <option key={i.slug} value={i.slug}>
                  {i.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn" onClick={startBlank}>
              Start blank
            </button>
          </div>
        ) : (
          <div className="cs-control cs-start">
            <p className="cs-plan-name">{plan.product.name || "Untitled plan"}</p>
            <ConfirmButton label="New plan" confirmLabel="Clear this plan" onConfirm={startBlank} />
          </div>
        )}
      </div>
      <div className="cs-cell">
        <p className="cs-head">
          <span className="label">View</span>
        </p>
        <div className="cs-control seg" role="radiogroup" aria-label="View">
          <button type="button" role="radio" aria-checked={view === "build"} onClick={() => setView("build")}>
            Build
          </button>
          <button type="button" role="radio" aria-checked={view === "document"} onClick={() => setView("document")}>
            Document
          </button>
        </div>
      </div>
      <div className="cs-cell">
        <p className="cs-head">
          <span className="label">Detail</span>
        </p>
        <div className="cs-control seg" role="radiogroup" aria-label="Detail level">
          <button type="button" role="radio" aria-checked={!advanced} onClick={() => setAdvanced(false)}>
            Simple
          </button>
          <button type="button" role="radio" aria-checked={advanced} onClick={() => setAdvanced(true)}>
            Advanced
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cloud ? "stack" : "wrap stack"} data-tool="plan">
      {cloud ? (
        <section className="sheet plan-cloud-bar" aria-label="Plan status">
          {strip}
          {save.kind === "conflict" && (
            <div className="conflict-banner" role="alert">
              <p>
                <strong>Someone else saved this plan.</strong> {save.message} Your recent edits here are not saved.
              </p>
              <button type="button" className="btn btn-primary" onClick={reloadLatest}>
                Load the latest version
              </button>
            </div>
          )}
          {save.kind === "error" && (
            <p className="note-line" role="alert">
              {save.message} Changes will retry on your next edit.
            </p>
          )}
        </section>
      ) : (
      <PageHero
        id="plan-title"
        tool="plan"
        motif="document"
        seed={11}
        label="Plan builder"
        cells={["Annex VII", "Technical documentation"]}
        title="Product security plan"
        lead="Eight short steps produce the technical documentation the CRA asks for. Gaps are never hidden; they become actions with owners and dates."
        aside={<PlanStatus analysis={analysis} />}
      >
        {strip}
      </PageHero>
      )}

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
                    <span className="step-state code">{state === "done" ? "✓" : `${st.failing} open`}</span>
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
              cloud={cloud ? { canApprove: cloud.canApprove, issue: issueCloudRevision } : undefined}
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
                      <strong>{c.message}.</strong> {c.fix}
                    </span>
                    <span className="issue-ref code">{c.ref}</span>
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
        <SheetTabs
          label="Plan sections"
          items={splitSections(markdown).map((sec, i) => ({
            id: `doc-${i}`,
            label: sec.title,
            state: sec.body.includes("[GAP:") ? ("open" as const) : undefined,
            badge: sec.body.includes("[GAP:") ? plural((sec.body.match(/\[GAP:/g) ?? []).length, "gap") : undefined,
            content: <Markdown source={sec.body} />,
          }))}
          side={
            <div className="sheet doc-side">
              <p className="label">Content fingerprint</p>
              <p className="code fingerprint">{fingerprint ? `${fingerprint.slice(0, 16)}…` : "Calculating…"}</p>
              <p className="muted">Updates as you type. Gaps are marked in red and listed in the action plan.</p>
              <ExportButtons plan={plan} markdown={markdown} />
            </div>
          }
        />
      )}
    </div>
  );
}

const SECTION_SHORT: Record<number, string> = {
  1: "1. Document control",
  2: "2. Product and purpose",
  3: "3. Architecture and SBOM",
  4: "4. Risk assessment",
  5: "5. Essential requirements",
  6: "6. Development and testing",
  7: "7. Vulnerability handling",
  8: "8. Updates and reporting",
  9: "9. Conformity route",
  10: "10. Evidence register",
  11: "11. Action plan",
  12: "12. Sign-off",
};

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function splitSections(md: string) {
  const parts = md.split(/\n(?=## )/);
  return parts.map((part, i) => {
    const heading = /^## (.*)$/m.exec(part);
    const num = heading ? Number(heading[1].split(".")[0]) : 0;
    const title = i === 0 ? "Cover" : (SECTION_SHORT[num] ?? heading?.[1] ?? `Part ${i}`);
    return { title, body: part };
  });
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
  const status = analysis.blockers.length
    ? { text: `${analysis.blockers.length} blocking`, cls: "text-redline" }
    : analysis.gaps.length
      ? { text: `${analysis.gaps.length} gaps open`, cls: "" }
      : { text: "Audit-ready", cls: "mark mark-done" };
  return (
    <dl className="tblock plan-status">
      <div>
        <dt>Completeness</dt>
        <dd className="code">
          {analysis.completeness}% · {analysis.checksPassed}/{analysis.checksTotal} checks
        </dd>
        <dd className="gauge" aria-hidden="true">
          <span style={{ width: `${analysis.completeness}%`, ["--pct" as string]: analysis.completeness }} />
        </dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd className={`code ${status.cls}`}>{status.text}</dd>
      </div>
      <div>
        <dt>Actions</dt>
        <dd className="code">{analysis.actions.length}</dd>
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
      <div className="span-2">
        <OptionGrid
          id="p-type"
          legend="What it includes"
          required
          options={productTypes.map((t) => ({ value: t.id as ProductType, label: t.label, hint: t.hint }))}
          selected={p.types}
          onChange={(types) => set({ types })}
        />
      </div>
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
        {p.marketDate && p.supportEnd !== addYears(p.marketDate, 5) && (
          <button type="button" className="link-btn" onClick={() => set({ supportEnd: addYears(p.marketDate, 5) })}>
            Set to {addYears(p.marketDate, 5)} (5 years after market date)
          </button>
        )}
      </div>
      <div className="span-2 regimes">
        <SpecTable
          caption="Other rules that apply today"
          rows={[
            {
              id: "red",
              rule: "Radio equipment cybersecurity (RED delegated act, EN 18031)",
              since: "1 Aug 2025",
              applies: { id: "p-radio", label: "It has a radio", checked: p.radio, on: (radio: boolean) => set({ radio }) },
              ready: { id: "p-red", label: "EN 18031 assessment done", checked: p.redAssessed, on: (redAssessed: boolean) => set({ redAssessed }) },
            },
            {
              id: "psti",
              rule: "UK Product Security and Telecommunications Infrastructure Act",
              since: "29 Apr 2024",
              applies: { id: "p-uk", label: "We sell it in the UK", checked: p.soldInUk, on: (soldInUk: boolean) => set({ soldInUk }) },
              ready: { id: "p-psti", label: "Statement of compliance ready", checked: p.pstiStatement, on: (pstiStatement: boolean) => set({ pstiStatement }) },
            },
          ]}
          rowKey={(r) => r.id}
          cols={[
            { key: "rule", label: "Rule", head: true, render: (r) => r.rule },
            { key: "since", label: "In force", width: "7.5rem", code: true, render: (r) => r.since },
            {
              key: "applies",
              label: "Applies",
              width: "11rem",
              render: (r) => (
                <label className="cell-check" htmlFor={r.applies.id}>
                  <input id={r.applies.id} type="checkbox" checked={r.applies.checked} onChange={(e) => r.applies.on(e.target.checked)} />
                  <span>{r.applies.label}</span>
                </label>
              ),
            },
            {
              key: "ready",
              label: "Ready",
              width: "12rem",
              render: (r) =>
                r.applies.checked ? (
                  <label className="cell-check" htmlFor={r.ready.id}>
                    <input id={r.ready.id} type="checkbox" checked={r.ready.checked} onChange={(e) => r.ready.on(e.target.checked)} />
                    <span>{r.ready.label}</span>
                  </label>
                ) : (
                  <span className="muted">Not applicable</span>
                ),
            },
          ]}
        />
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
                  { value: "third-party", label: "Third-party" },
                ]}
                onChange={(kind) => setComp(c.id, { kind })}
              />
              <TextField id={`c-sup-${c.id}`} label="Supplier" value={c.supplier} onChange={(supplier) => setComp(c.id, { supplier })} placeholder="In-house" />
              <button
                type="button"
                className="btn btn-quiet comp-remove"
                aria-label={`Remove ${c.name || "component"}`}
                onClick={() => update((x) => ({ ...x, components: x.components.filter((y) => y.id !== c.id) }))}
              >
                Remove
              </button>
              {advanced && (
                <div className="comp-extra">
                  <TextField id={`c-ver-${c.id}`} label="Version" value={c.version} onChange={(version) => setComp(c.id, { version })} />
                  <Toggle id={`c-net-${c.id}`} label="Internet-facing" checked={c.internetFacing} onChange={(internetFacing) => setComp(c.id, { internetFacing })} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <OptionGrid
        id="a-if"
        legend="External interfaces"
        groups={interfaceGroups.map((g) => ({ label: g.label, options: g.options.map((o) => ({ value: o, label: o })) }))}
        selected={plan.interfaces}
        onChange={(interfaces) => update((x) => ({ ...x, interfaces }))}
      />
      <OptionGrid
        id="a-data"
        legend="Data the product handles"
        groups={dataGroups.map((g) => ({ label: g.label, options: g.options.map((o) => ({ value: o, label: o })) }))}
        selected={plan.data}
        onChange={(data) => update((x) => ({ ...x, data }))}
      />
      {plan.components.some((c) => c.kind === "third-party") && <TemplateBlock title="Supplier security questionnaire" text={supplierQuestionnaire(plan)} />}
      <p className="muted">Your selections generate the risk assessment in the next step.</p>
    </div>
  );
}

function RisksStep({ plan, update, advanced }: StepProps) {
  const setRisk = (id: string, patch: Partial<Risk>) => update((x) => ({ ...x, risks: x.risks.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const level = (r: Risk) => riskLevel(riskScore(r));
  const kept = plan.risks.filter((r) => r.include).length;
  const scale = (id: string, label: string, value: number, onChange: (v: 1 | 2 | 3) => void) => (
    <select id={id} aria-label={label} value={String(value)} onChange={(e) => onChange(Number(e.target.value) as 1 | 2 | 3)}>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>
  );
  if (plan.risks.length === 0) {
    return <p className="note-line">Describe what the product includes in step 1 and its interfaces in step 2. Risks are suggested from those answers.</p>;
  }
  return (
    <div className="stack-sm">
      <p className="muted">
        {plan.risks.length} risks suggested from your interfaces and data; {kept} kept. Untick any that don't apply and pick a treatment.{" "}
        {advanced ? "L is likelihood and I is impact, each from 1 (low) to 3 (high)." : "Advanced adds scores, owners and your own risks."}
      </p>
      <div className="table-scroll">
        <table className="drawing risk-table">
          <thead>
            <tr>
              <th scope="col">Keep</th>
              <th scope="col">Risk and planned control</th>
              <th scope="col">Level</th>
              <th scope="col">Treatment</th>
              {advanced && (
                <>
                  <th scope="col" title="Likelihood, 1 low to 3 high">L</th>
                  <th scope="col" title="Impact, 1 low to 3 high">I</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {plan.risks.map((r, i) => (
              <tr key={r.id} className={r.include ? undefined : "is-excluded"}>
                <td>
                  <input type="checkbox" className="risk-check" aria-label={`Keep R${i + 1}`} checked={r.include} onChange={(e) => setRisk(r.id, { include: e.target.checked })} />
                </td>
                <td className="risk-cell">
                  {advanced && r.custom ? (
                    <>
                      <input aria-label={`R${i + 1} threat`} value={r.threat} onChange={(e) => setRisk(r.id, { threat: e.target.value })} />
                      <input aria-label={`R${i + 1} control`} value={r.control} onChange={(e) => setRisk(r.id, { control: e.target.value })} />
                    </>
                  ) : (
                    <>
                      <strong>
                        R{i + 1}. {r.threat}
                      </strong>
                      <span className="risk-sub">{r.control}</span>
                    </>
                  )}
                  {advanced && r.include && (
                    <input className="owner-input" aria-label={`Owner for R${i + 1}`} value={r.owner} placeholder="Owner" onChange={(e) => setRisk(r.id, { owner: e.target.value })} />
                  )}
                  {r.include && r.treatment === "accept" && (
                    <span className="accept-fields">
                      <input aria-label={`R${i + 1} accepted by`} placeholder="Accepted by (name)" value={r.acceptedBy} onChange={(e) => setRisk(r.id, { acceptedBy: e.target.value })} />
                      <input aria-label={`R${i + 1} review date`} type="date" value={r.reviewBy} onChange={(e) => setRisk(r.id, { reviewBy: e.target.value })} />
                    </span>
                  )}
                </td>
                <td>
                  <span className={`risk-level risk-${level(r)} code`}>{level(r)}</span>
                </td>
                <td>
                  <select aria-label={`Treatment for R${i + 1}`} value={r.treatment} disabled={!r.include} onChange={(e) => setRisk(r.id, { treatment: e.target.value as Risk["treatment"] })}>
                    <option value="mitigate">Mitigate</option>
                    <option value="accept">Accept</option>
                    <option value="transfer">Transfer</option>
                    <option value="avoid">Avoid</option>
                  </select>
                </td>
                {advanced && (
                  <>
                    <td>{scale(`r-l-${r.id}`, `Likelihood for R${i + 1}`, r.likelihood, (likelihood) => setRisk(r.id, { likelihood }))}</td>
                    <td>{scale(`r-i-${r.id}`, `Impact for R${i + 1}`, r.impact, (impact) => setRisk(r.id, { impact }))}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                  threat: "Describe the threat",
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
          + Add your own risk
        </button>
      )}
    </div>
  );
}

function ControlsStep({ plan, update, advanced, reqs }: StepProps & { reqs: ReturnType<typeof analyzePlan>["reqs"] }) {
  const [imported, setImported] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);
  const letters = "ABCDEF";
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
      setRunKey((k) => k + 1);
    } catch {
      setImported("Could not read readiness check answers in this browser.");
    }
  };
  const byId = Object.fromEntries(reqs.map((r) => [r.id, r]));
  const levels = categories
    .map((cat, ci) => ({
      id: cat.id,
      label: cat.label,
      questions: reqs
        .filter((r) => r.category === cat.id)
        .map((r, i) => ({
          id: r.id,
          ref: `${letters[ci]}.${i + 1}`,
          title: r.title,
          prompt: r.question,
          detail: <p>{r.guidance}</p>,
          basis: `CRA ${r.craRef}`,
          tag: { label: r.priority, tone: r.priority as "critical" | "high" | "standard" },
        })),
    }))
    .filter((l) => l.questions.length > 0);
  const answers = Object.fromEntries(Object.entries(plan.controls).filter(([, c]) => c.status).map(([id, c]) => [id, c.status as AnswerStatus]));
  const answered = reqs.filter((r) => plan.controls[r.id]?.status).length;
  const gaps = reqs.filter((r) => ["missing", "partial"].includes(plan.controls[r.id]?.status ?? "")).length;

  return (
    <div className="stack-sm">
      <div className="ctl-toolbar">
        <p className="muted">
          {reqs.length} requirements apply to what your product includes. {answered} answered.
        </p>
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
      <Walkthrough<AnswerStatus>
        key={runKey}
        id="plan-req-run"
        name="Requirements"
        compact
        levels={levels}
        choices={readinessChoices}
        answers={answers}
        onAnswer={(id, status) => setCtl(id, { status })}
        feedback={(q, v) => readinessFeedback(q.title, byId[q.id]?.priority ?? "standard", v)}
        followUp={(q, v) => {
          const e = plan.controls[q.id];
          if (!advanced && v !== "na") return null;
          return (
            <div className="ctl-fields">
              <AreaField
                id={`how-${q.id}`}
                rows={2}
                label={v === "na" ? "Why it does not apply" : "How we meet it"}
                value={e?.how ?? ""}
                onChange={(how) => setCtl(q.id, { how })}
                placeholder={byId[q.id]?.guidance}
              />
              {advanced && v !== "na" && (
                <TextField
                  id={`ev-${q.id}`}
                  label="Evidence (link or document ID)"
                  value={e?.evidence ?? ""}
                  onChange={(evidence) => setCtl(q.id, { evidence })}
                  placeholder="e.g. TEST-042 pen test report, Jira SEC-118"
                />
              )}
            </div>
          );
        }}
        stats={[
          { label: "Gaps", value: gaps, tone: gaps ? "bad" : undefined },
          { label: "Left", value: reqs.length - answered },
        ]}
        outroLabel="See coverage"
        outro={
          <SpecTable
            caption="Requirement coverage"
            rows={levels}
            rowKey={(l) => l.id}
            cols={[
              { key: "sec", label: "Section", head: true, render: (l) => l.label },
              { key: "n", label: "Requirements", width: "8rem", code: true, render: (l) => l.questions.length },
              { key: "a", label: "Answered", width: "8rem", code: true, render: (l) => l.questions.filter((q) => plan.controls[q.id]?.status).length },
              {
                key: "g",
                label: "Gaps",
                width: "8rem",
                code: true,
                render: (l) => l.questions.filter((q) => ["missing", "partial"].includes(plan.controls[q.id]?.status ?? "")).length,
              },
            ]}
          />
        }
      />
    </div>
  );
}

function DevelopmentStep({ plan, update, advanced }: StepProps) {
  const set = (patch: Partial<Plan["sdlc"]>) => update((x) => ({ ...x, sdlc: { ...x.sdlc, ...patch } }));
  return (
    <div className="stack-sm">
      <OptionGrid
        id="d-prac"
        legend="Practices in place today"
        groups={practiceGroups.map((g) => ({ label: g.label, options: g.options.map((o) => ({ value: o, label: o, hint: practiceHints[o] })) }))}
        selected={plan.sdlc.practices}
        onChange={(practices) => set({ practices })}
      />
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
        {advanced && (
          <>
            <TextField id="d-sbomloc" label="Where SBOMs are stored" value={plan.sdlc.sbomLocation} onChange={(sbomLocation) => set({ sbomLocation })} placeholder="CI artifact store, per release" />
            <TextField id="d-last" label="Last penetration test" type="date" value={plan.sdlc.lastPenTest} onChange={(lastPenTest) => set({ lastPenTest })} />
          </>
        )}
      </div>
      <CheckList
        legend="Release testing"
        rows={[
          {
            id: "d-gate",
            label: "We decide testing per release with a release gate",
            hint: (
              <>
                Keep each release record as evidence. <a href={paths.releaseGate}>Open the free release gate</a>
              </>
            ),
            basis: "Annex I Pt II(3)",
            checked: plan.sdlc.releaseGate,
            onChange: (releaseGate) => set({ releaseGate }),
          },
        ]}
      />
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
      </div>
      <CheckList
        legend="Published"
        rows={[
          {
            id: "v-txt",
            label: "security.txt is published",
            hint: "/.well-known/security.txt on your website, pointing to your contact and policy.",
            basis: "Annex I Pt II(5), (6)",
            checked: plan.vulns.securityTxt,
            onChange: (securityTxt) => set({ securityTxt }),
          },
        ]}
      />
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
      </div>
      <CheckList
        legend="Update delivery"
        rows={[
          { id: "u-signed", label: "Updates are signed and verified before install", basis: "Annex I Pt I(2)(c)", checked: plan.updates.signed, onChange: (signed) => set({ signed }) },
          {
            id: "u-auto",
            label: "Automatic security updates are on by default",
            hint: "With a clear way for users to opt out.",
            basis: "Annex I Pt I(2)(c)",
            checked: plan.updates.autoUpdateDefault,
            onChange: (autoUpdateDefault) => set({ autoUpdateDefault }),
          },
          {
            id: "u-sep",
            label: "Security fixes can ship without a feature release",
            basis: "Annex I Pt II(8)",
            checked: plan.updates.separateSecurityUpdates,
            onChange: (separateSecurityUpdates) => set({ separateSecurityUpdates }),
          },
        ]}
      />
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
        </div>
        <CheckList
          legend="Reporting readiness"
          rows={[
            {
              id: "u-srp",
              label: "Registered on ENISA's Single Reporting Platform",
              hint: "Reports route to the CSIRT of your main EU establishment.",
              basis: "Art. 14; Art. 16",
              checked: plan.updates.srpRegistered,
              onChange: (srpRegistered) => set({ srpRegistered }),
            },
          ]}
        />
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
  cloud,
}: {
  plan: Plan;
  update: (fn: (p: Plan) => Plan) => void;
  analysis: ReturnType<typeof analyzePlan>;
  fingerprint: string;
  today: string;
  onJump: (s: Step) => void;
  onImport: (p: Plan) => void;
  cloud?: { canApprove: boolean; issue: (summary: string) => Promise<{ rev: string; statement: Record<string, unknown>; signature: Record<string, unknown> }> };
}) {
  const [summary, setSummary] = useState("");
  const [signed, setSigned] = useState<{ rev: string; statement: Record<string, unknown>; signature: Record<string, unknown> } | null>(null);
  const [issueError, setIssueError] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [approver, setApprover] = useState(plan.roles.productOwner);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const setRole = (patch: Partial<Plan["roles"]>) => update((x) => ({ ...x, roles: { ...x.roles, ...patch } }));
  const latest = plan.revisions[plan.revisions.length - 1];
  const changed = latest && latest.hash !== fingerprint;
  const failing = analysis.checks.filter((c) => !c.passed).sort((a, b) => ["blocker", "gap", "advice"].indexOf(a.severity) - ["blocker", "gap", "advice"].indexOf(b.severity));

  const issue = async () => {
    if (cloud) {
      setIssuing(true);
      setIssueError("");
      try {
        setSigned(await cloud.issue(summary.trim() || "Revision issued"));
        setSummary("");
      } catch (e) {
        setIssueError((e as Error).message);
      } finally {
        setIssuing(false);
      }
      return;
    }
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
                  <strong>{c.message}.</strong> {c.fix}
                </span>
                <span className="issue-ref">
                  {c.step !== "review" ? (
                    <button type="button" className="link-btn" onClick={() => onJump(c.step)}>
                      Fix in {STEPS.find((s) => s.id === c.step)?.label}
                    </button>
                  ) : (
                    <span className="code muted">{c.ref}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="label">People</p>
      <div className="form-grid">
        <TextField id="role-sec" label="Security lead" value={plan.roles.securityLead} onChange={(securityLead) => setRole({ securityLead })} />
        <TextField id="role-eng" label="Engineering lead" value={plan.roles.engineeringLead} onChange={(engineeringLead) => setRole({ engineeringLead })} />
        <TextField id="role-po" label="Product owner (approver)" value={plan.roles.productOwner} onChange={(productOwner) => setRole({ productOwner })} />
        <TextField id="role-legal" label="Legal / compliance contact" value={plan.roles.legalContact} onChange={(legalContact) => setRole({ legalContact })} />
      </div>
      <div className="issue-rev">
        <Fcf keyCell="Issue revision" cells={[nextRevisionLetter(plan.revisions), changed ? "Edited since last issue" : latest ? `Matches Rev ${latest.rev}` : "First issue"]} />
        {latest && !changed && (
          <p className="stamp" key={latest.hash}>
            Approved · Rev {latest.rev}
            <small>
              {latest.date} · {latest.approver || "Unsigned"}
            </small>
          </p>
        )}
        <p className="muted">
          {cloud
            ? "Issuing a revision records you as approver and has the server sign the plan's SHA-512 fingerprint with Ed25519 and ML-DSA-65 (post-quantum). Anyone can verify the signed statement; any later edit changes the fingerprint."
            : "Issuing a revision records the date, approver and a SHA-512 fingerprint of the plan's content. Any later edit changes the fingerprint, so an auditor can tell whether the document matches what was approved."}
        </p>
        <div className="form-grid">
          <TextField id="rev-summary" label="What changed" value={summary} onChange={setSummary} placeholder="First issue for market launch" />
          {!cloud && <TextField id="rev-approver" label="Approved by" value={approver} onChange={setApprover} />}
        </div>
        {cloud && !cloud.canApprove ? (
          <p className="note-line">Only owners, admins and approvers can issue revisions.</p>
        ) : (
          <button type="button" className="btn btn-primary" onClick={issue} disabled={(!cloud && !approver.trim()) || issuing}>
            {issuing ? "Signing…" : `Issue revision ${nextRevisionLetter(plan.revisions)}`}
          </button>
        )}
        {issueError && (
          <p className="note-line" role="alert">
            {issueError}
          </p>
        )}
        {signed && (
          <div className="signed-box">
            <p>
              <strong>Revision {signed.rev} signed.</strong> Algorithm {String(signed.signature.alg)}, key {String(signed.signature.kid)}.
            </p>
            <div className="row">
              <CopyButton label="Copy signed statement" getText={() => JSON.stringify({ statement: signed.statement, signature: signed.signature }, null, 2)} />
              <a className="btn btn-quiet" href="/verify-signature/">
                How to verify
              </a>
            </div>
          </div>
        )}
        {analysis.blockers.length > 0 && <p className="note-line">You can issue a draft revision now; it will record {analysis.blockers.length} blocking item(s) as open.</p>}
      </div>

      <TemplateBlock
        title="EU co-funding application outline"
        text={fundingOutline(plan, analysis, {
          consultingDays: Math.round(DAYS_BY_CLASS[plan.product.craClass] / 3),
          dayRate: 1200,
          penTest: 12000,
          platform: STARTER_YEAR,
          guided: GUIDED,
        })}
      />
      {!cloud && (
      <details className="backup">
        <summary className="label">Back up, move or clear this plan</summary>
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
      </details>
      )}
      <p className="muted">Switch to the Document view to read the full plan and copy it as Markdown{canDownload ? " or download it" : ""}.</p>
    </div>
  );
}

function TemplateBlock({ title, text }: { title: string; text: string }) {
  return (
    <details className="template">
      <summary>
        <span className="label">{title}</span>
        <span className="muted">Generated from your answers. Open to copy.</span>
      </summary>
      <div className="row-between template-actions">
        <span className="muted">Review before publishing.</span>
        <CopyButton label="Copy" getText={() => text} />
      </div>
      <pre className="code">{text}</pre>
    </details>
  );
}

function ExportButtons({ plan, markdown }: { plan: Plan; markdown: string }) {
  // Checked inline (not via canDownload) so the demo bundler can drop the download code entirely.
  if (process.env.NEXT_PUBLIC_ROUTING === "hash") {
    return (
      <div className="row export-row">
        <CopyButton label="Copy as Markdown" getText={() => markdown} />
      </div>
    );
  }
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
