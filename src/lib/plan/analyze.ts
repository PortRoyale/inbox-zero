import { craClassInfo } from "@/content/industries";
import { scoreAssessment, type Answers } from "@/lib/assessment-score";
import { requirementsFor, type Priority, type Requirement } from "@/lib/cra-requirements";
import { addYears, type Plan } from "@/lib/plan/model";
import { riskLevel, riskScore } from "@/lib/plan/risks";
import { craDates } from "@/lib/site";

export type Severity = "blocker" | "gap" | "advice";
export type Step = "product" | "architecture" | "risks" | "controls" | "development" | "vulnerabilities" | "updates" | "review";

export type Check = {
  id: string;
  step: Step;
  severity: Severity;
  passed: boolean;
  message: string;
  fix: string;
  ref: string;
};

export type Action = {
  id: string;
  title: string;
  detail: string;
  owner: string;
  due: string;
  priority: Priority;
  ref: string;
};

export type RegisterRow = { ref: string; obligation: string; section: string; evidence: string; status: "met" | "partial" | "gap" | "n/a" };

// When a specific check already raises an action for the same obligation, skip the generic requirement action.
const CHECK_COVERS_REQUIREMENT: Record<string, string> = {
  "vuln-policy": "cvd-policy",
  "vuln-contact": "cvd-policy",
  "vuln-advisories": "advisories",
  "dev-sbom": "sbom",
  "upd-signed": "secure-updates",
};

const SEVERITY_WEIGHT: Record<Severity, number> = { blocker: 3, gap: 1, advice: 0 };

export function analyzePlan(plan: Plan, today: string) {
  const reqs = requirementsFor(plan.product.types);
  const checks = buildChecks(plan, reqs);
  const failing = checks.filter((c) => !c.passed);
  const totalWeight = checks.reduce((s, c) => s + SEVERITY_WEIGHT[c.severity], 0);
  const failingWeight = failing.reduce((s, c) => s + SEVERITY_WEIGHT[c.severity], 0);
  const answers: Answers = Object.fromEntries(Object.entries(plan.controls).map(([k, v]) => [k, v.status]));
  const controlScore = scoreAssessment(reqs, answers);
  const blockers = failing.filter((c) => c.severity === "blocker");

  return {
    reqs,
    checks,
    blockers,
    gaps: failing.filter((c) => c.severity === "gap"),
    advice: failing.filter((c) => c.severity === "advice"),
    completeness: totalWeight ? Math.round(((totalWeight - failingWeight) / totalWeight) * 100) : 0,
    checksPassed: checks.filter((c) => c.passed && c.severity !== "advice").length,
    checksTotal: checks.filter((c) => c.severity !== "advice").length,
    auditReady: blockers.length === 0 && failing.every((c) => c.severity !== "gap") && controlScore.complete,
    controlScore,
    actions: buildActions(plan, reqs, failing, today),
    register: buildRegister(plan, reqs),
    stepStatus: stepStatus(checks),
  };
}

export type PlanAnalysis = ReturnType<typeof analyzePlan>;

// Conditional checks are only added when they apply, so an empty plan never scores points for having nothing to check.
function buildChecks(plan: Plan, reqs: Requirement[]): Check[] {
  const p = plan.product;
  const c: Check[] = [];
  const add = (id: string, step: Step, severity: Severity, passed: boolean, message: string, fix: string, ref: string) =>
    c.push({ id, step, severity, passed, message, fix, ref });

  add("product-name", "product", "blocker", !!p.name.trim(), "Product name is missing", "Name the product and version this plan covers.", "Annex VII 1");
  add("product-purpose", "product", "blocker", p.purpose.trim().length >= 40, "Intended purpose is missing or too short", "Describe what the product does, for whom, and where it is used (at least a couple of sentences).", "Annex VII 1(a)");
  add("product-types", "product", "blocker", p.types.length > 0, "Product composition is not set", "Select what the product includes: software, firmware, hardware, cloud backend.", "Art. 3(1)");
  add("product-manufacturer", "product", "gap", !!p.manufacturer.trim(), "Manufacturer legal name is missing", "Add the legal name and address that will appear on the product and declaration.", "Annex II(1)");
  add("product-support-end", "product", "blocker", !!p.supportEnd, "Support period end date is missing", "Set the date until which you will provide security updates.", "Art. 13(8)");
  const fiveYears = p.marketDate ? addYears(p.marketDate, 5) : "";
  const shortSupport = !!(p.supportEnd && fiveYears && p.supportEnd < fiveYears);
  if (shortSupport) add(
    "product-support-length",
    "product",
    "gap",
    !shortSupport || p.supportJustification.trim().length > 20,
    "Support period is under five years without a justification",
    "Extend support to at least five years from placing on the market, or document why the expected use time is shorter.",
    "Art. 13(8)",
  );
  add("product-market-date", "product", "advice", !!p.marketDate, "Planned EU market date is not set", "Add the date you plan to place this version on the EU market.", "Art. 71");
  add(
    "product-class",
    "product",
    "advice",
    p.craClass === "default",
    `${craClassInfo[p.craClass].label}: plan your conformity route now`,
    craClassInfo[p.craClass].route,
    "Art. 32",
  );

  if (p.radio)
    add(
      "red-assessed",
      "product",
      "gap",
      !!p.redAssessed,
      "Radio cybersecurity assessment not confirmed",
      "Radio products must already meet EN 18031 under the RED delegated act, which has applied since 1 August 2025.",
      "Reg. (EU) 2022/30",
    );
  if (p.soldInUk)
    add(
      "psti-statement",
      "product",
      "gap",
      !!p.pstiStatement,
      "No UK PSTI statement of compliance",
      "UK sales need no default passwords, a published way to report vulnerabilities, a published minimum update period and a statement of compliance with the product.",
      "UK PSTI Act 2022",
    );

  add("arch-components", "architecture", "blocker", plan.components.length > 0, "No components listed", "List the firmware, software, cloud and third-party components that make up the product.", "Annex VII 2(a)");
  const unsourced = plan.components.filter((x) => x.kind === "third-party" && !x.supplier.trim());
  if (plan.components.some((x) => x.kind === "third-party")) add("arch-suppliers", "architecture", "gap", unsourced.length === 0, `${unsourced.length} third-party component(s) have no supplier`, "Record the supplier of every third-party component for due diligence.", "Art. 13(5)");
  add("arch-interfaces", "architecture", "gap", plan.interfaces.length > 0, "External interfaces are not listed", "Select every interface the product exposes, including debug ports.", "Annex I Pt I(2)(j)");

  const included = plan.risks.filter((r) => r.include);
  add("risk-present", "risks", "blocker", included.length > 0, "No risks in the risk assessment", "Accept the suggested risks or add your own.", "Art. 13(2)");
  const acceptedHigh = included.filter((r) => r.treatment === "accept" && riskLevel(riskScore(r)) === "high" && !r.acceptedBy.trim());
  if (included.some((r) => r.treatment === "accept")) add("risk-acceptance", "risks", "blocker", acceptedHigh.length === 0, `${acceptedHigh.length} high risk(s) accepted without a named approver`, "Name who accepted each high risk.", "Art. 13(3)");
  const noReview = included.filter((r) => r.treatment === "accept" && !r.reviewBy);
  if (included.some((r) => r.treatment === "accept")) add("risk-review", "risks", "gap", noReview.length === 0, `${noReview.length} accepted risk(s) have no review date`, "Set a date to review each accepted risk.", "Art. 13(2)");
  const unowned = included.filter((r) => riskLevel(riskScore(r)) === "high" && !r.owner.trim());
  if (included.length) add("risk-owners", "risks", "gap", unowned.length === 0, `${unowned.length} high risk(s) have no owner`, "Assign an owner to every high risk.", "Art. 13(2)");

  const unanswered = reqs.filter((r) => !plan.controls[r.id]?.status);
  add("controls-answered", "controls", "blocker", reqs.length > 0 && unanswered.length === 0, `${unanswered.length} essential requirement(s) not assessed`, "Record a status for every requirement.", "Annex I");
  const naWithoutReason = reqs.filter((r) => plan.controls[r.id]?.status === "na" && !plan.controls[r.id]?.how.trim());
  if (reqs.some((r) => plan.controls[r.id]?.status === "na")) add("controls-na-reason", "controls", "gap", naWithoutReason.length === 0, `${naWithoutReason.length} requirement(s) marked N/A without a reason`, "Explain why each N/A requirement does not apply. Auditors ask.", "Annex VII 3");
  const doneNoEvidence = reqs.filter((r) => r.priority === "critical" && plan.controls[r.id]?.status === "done" && !plan.controls[r.id]?.evidence.trim());
  if (reqs.some((r) => r.priority === "critical" && plan.controls[r.id]?.status === "done")) add("controls-evidence", "controls", "gap", doneNoEvidence.length === 0, `${doneNoEvidence.length} critical requirement(s) met but without evidence`, "Link evidence (document, ticket, test report) for each critical requirement.", "Annex VII 6");

  add("dev-sbom", "development", "blocker", plan.sdlc.sbomFormat !== "none", "No SBOM format chosen", "Generate a CycloneDX or SPDX SBOM in your build for every release.", "Annex I Pt II(1)");
  const scanning = plan.sdlc.practices.includes("Static analysis (SAST) in CI") && plan.sdlc.practices.includes("Dependency scanning (SCA) in CI");
  add("dev-scanning", "development", "gap", scanning, "SAST and SCA are not both in CI", "Add static analysis and dependency scanning to the pipeline.", "Annex I Pt I(2)(a)");
  add("dev-gate", "development", "gap", plan.sdlc.releaseGate, "No release security gate", "Use the release gate to decide testing per release and keep the record.", "Annex I Pt II(3)");
  add("dev-pentest", "development", "gap", plan.sdlc.penTestCadence !== "none", "No penetration test cadence", "Commit to a penetration test for new products and on a recurring cadence.", "Annex I Pt II(3)");

  add("vuln-contact", "vulnerabilities", "blocker", /\S+@\S+\.\S+/.test(plan.vulns.contact), "No security contact address", "Publish a monitored address for vulnerability reports.", "Annex I Pt II(6); Annex II(2)");
  add("vuln-policy", "vulnerabilities", "gap", !!plan.vulns.policyUrl.trim(), "No published disclosure policy", "Publish a coordinated vulnerability disclosure policy and link it here.", "Annex I Pt II(5)");
  add("vuln-advisories", "vulnerabilities", "gap", !!plan.vulns.advisoryChannel.trim(), "No channel for security advisories", "Decide where advisories are published (web page, RSS, CSAF feed).", "Annex I Pt II(4)");
  add("vuln-securitytxt", "vulnerabilities", "advice", plan.vulns.securityTxt, "No security.txt file", "Publish /.well-known/security.txt pointing to your contact and policy.", "Annex I Pt II(6)");
  add("vuln-sla", "vulnerabilities", "advice", plan.vulns.slaDays.critical <= 14, "Critical fix target is longer than 14 days", "Shorten the fix target for critical vulnerabilities; exploited ones need action without delay.", "Annex I Pt II(2)");

  add("upd-mechanism", "updates", "blocker", !!plan.updates.mechanism.trim(), "Update mechanism is not described", "Describe how updates reach devices and users.", "Annex I Pt II(7)");
  add("upd-signed", "updates", "blocker", plan.updates.signed, "Updates are not signed and verified", "Sign every update and verify it before install.", "Annex I Pt I(2)(c), (f)");
  add("upd-auto", "updates", "gap", plan.updates.autoUpdateDefault, "Automatic security updates are not on by default", "Enable automatic security updates by default, with a clear opt-out.", "Annex I Pt I(2)(c)");
  add("upd-separate", "updates", "advice", plan.updates.separateSecurityUpdates, "Security fixes ship only with feature releases", "Keep a path to ship security fixes separately where feasible.", "Annex I Pt II(2)");
  add("rep-owner", "updates", "blocker", !!plan.updates.reportingOwner.trim(), "No owner for 24-hour reporting", "Name who submits early warnings to ENISA's Single Reporting Platform.", "Art. 14");
  add("rep-backup", "updates", "gap", !!plan.updates.reportingBackup.trim(), "No backup reporter", "Name a backup so the 24-hour clock is covered during absences.", "Art. 14");
  add("rep-csirt", "updates", "gap", !!plan.updates.csirtCountry, "Coordinating CSIRT member state not identified", "Identify the member state of your main establishment (or representative, importer, distributor).", "Art. 14(7)");
  add("rep-srp", "updates", "gap", plan.updates.srpRegistered, "Not registered on ENISA's Single Reporting Platform", "Register now; reporting has applied since 11 September 2026.", "Art. 14; Art. 16");
  add("rep-users", "updates", "gap", !!plan.updates.userNotification.trim(), "No channel to inform users of incidents", "Decide how you will inform affected users and what mitigations you will share.", "Art. 14(8)");

  add("role-security", "review", "gap", !!plan.roles.securityLead.trim(), "No security lead named", "Name the person accountable for product security.", "Art. 13");
  add("role-product", "review", "gap", !!plan.roles.productOwner.trim(), "No product owner named", "Name the person who signs off this plan.", "Annex VII");
  add("rev-issued", "review", "advice", plan.revisions.length > 0, "No revision issued yet", "Issue revision A to fingerprint and date this plan.", "Annex VII; Art. 31");

  return c;
}

function buildActions(plan: Plan, reqs: Requirement[], failing: Check[], today: string): Action[] {
  const owner = (step: Step | Requirement["category"]) => {
    const r = plan.roles;
    const map: Record<string, string> = {
      product: r.productOwner,
      architecture: r.engineeringLead,
      risks: r.securityLead,
      controls: r.securityLead,
      development: r.engineeringLead,
      vulnerabilities: r.securityLead,
      updates: r.engineeringLead,
      review: r.productOwner,
      design: r.securityLead,
      access: r.engineeringLead,
      hardening: r.engineeringLead,
      vulns: r.securityLead,
      docs: r.productOwner,
    };
    return map[step]?.trim() || "Unassigned";
  };

  const actions: Action[] = failing
    .filter((c) => c.severity !== "advice" && c.id !== "controls-answered")
    .map((c) => ({
      id: `a-${c.id}`,
      title: c.fix,
      detail: c.message,
      owner: c.id.startsWith("rep-") ? plan.updates.reportingOwner.trim() || owner(c.step) : owner(c.step),
      due: dueDate(c.id.startsWith("rep-") ? "urgent" : c.severity === "blocker" ? "critical" : "high", today),
      priority: c.severity === "blocker" ? "critical" : "high",
      ref: c.ref,
    }));

  const coveredByCheck = new Set(failing.map((c) => CHECK_COVERS_REQUIREMENT[c.id]).filter(Boolean));
  for (const r of reqs) {
    const status = plan.controls[r.id]?.status;
    if (status !== "missing" && status !== "partial") continue;
    if (coveredByCheck.has(r.id)) continue;
    actions.push({
      id: `a-req-${r.id}`,
      title: `${status === "partial" ? "Complete" : "Implement"}: ${r.title}`,
      detail: r.guidance,
      owner: owner(r.category),
      due: dueDate(r.id === "incident-reporting" ? "urgent" : r.priority, today),
      priority: r.priority,
      ref: r.craRef,
    });
  }

  for (const risk of plan.risks.filter((x) => x.include && x.treatment === "mitigate" && riskLevel(riskScore(x)) === "high")) {
    const status = risk.requirementId ? plan.controls[risk.requirementId]?.status : undefined;
    if (status === "done" || actions.some((a) => a.id === `a-req-${risk.requirementId}`)) continue;
    actions.push({
      id: `a-risk-${risk.id}`,
      title: `Mitigate: ${risk.threat}`,
      detail: `Planned control: ${risk.control}`,
      owner: risk.owner.trim() || owner("risks"),
      due: dueDate("high", today),
      priority: "high",
      ref: "Art. 13(2)",
    });
  }

  const rank: Record<Priority, number> = { critical: 0, high: 1, standard: 2 };
  return actions.sort((a, b) => a.due.localeCompare(b.due) || rank[a.priority] - rank[b.priority]);
}

function dueDate(level: Priority | "urgent", today: string) {
  const days = { urgent: 7, critical: 30, high: 90, standard: 180 }[level];
  const target = new Date(`${today}T00:00:00Z`);
  target.setUTCDate(target.getUTCDate() + days);
  const latest = new Date(`${craDates.fullApplication}T00:00:00Z`);
  latest.setUTCDate(latest.getUTCDate() - 30);
  const due = level !== "urgent" && target > latest && new Date(`${today}T00:00:00Z`) < latest ? latest : target;
  return due.toISOString().slice(0, 10);
}

function buildRegister(plan: Plan, reqs: Requirement[]): RegisterRow[] {
  const statusMap = { done: "met", partial: "partial", missing: "gap", na: "n/a" } as const;
  const rows: RegisterRow[] = reqs.map((r) => {
    const entry = plan.controls[r.id];
    return {
      ref: r.craRef,
      obligation: r.title,
      section: "5",
      evidence: entry?.evidence.trim() || entry?.how.trim() || "",
      status: entry?.status ? statusMap[entry.status] : "gap",
    };
  });
  const doc = (ref: string, obligation: string, section: string, ok: boolean, evidence: string): RegisterRow => ({
    ref,
    obligation,
    section,
    evidence: ok ? evidence : "",
    status: ok ? "met" : "gap",
  });
  rows.unshift(
    doc("Annex VII 1", "General description and intended purpose", "2", plan.product.purpose.trim().length >= 40, "Section 2 of this plan"),
    doc("Annex VII 2", "Design, development and vulnerability handling", "3, 6, 7", plan.components.length > 0 && plan.sdlc.sbomFormat !== "none", `Component list; ${plan.sdlc.sbomFormat} SBOM`),
    doc("Annex VII 3; Art. 13(2)", "Cybersecurity risk assessment", "4", plan.risks.some((r) => r.include), `${plan.risks.filter((r) => r.include).length} risks assessed`),
    doc("Annex VII 4; Art. 13(8)", "Support period determination", "8", !!plan.product.supportEnd, `Support until ${plan.product.supportEnd}`),
    doc("Art. 14", "Vulnerability and incident reporting readiness", "8", !!plan.updates.reportingOwner.trim() && plan.updates.srpRegistered, `Owner: ${plan.updates.reportingOwner}; SRP registered`),
  );
  return rows;
}

function stepStatus(checks: Check[]) {
  const steps: Step[] = ["product", "architecture", "risks", "controls", "development", "vulnerabilities", "updates", "review"];
  return Object.fromEntries(
    steps.map((s) => {
      const inStep = checks.filter((c) => c.step === s && c.severity !== "advice");
      const failing = inStep.filter((c) => !c.passed);
      return [s, { total: inStep.length, failing: failing.length, blockers: failing.filter((c) => c.severity === "blocker").length }];
    }),
  ) as Record<Step, { total: number; failing: number; blockers: number }>;
}
