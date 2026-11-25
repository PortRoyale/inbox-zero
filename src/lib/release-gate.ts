export type YesNo = "yes" | "no";

export const baselineQuestions = [
  { id: "scanningInPipeline", text: "Do static analysis (SAST) and open-source composition analysis (SCA) run in this product's build pipeline?" },
  { id: "noOpenCriticalHigh", text: "Are the latest SAST/SCA results free of unapproved critical or high findings?" },
  { id: "fixesReportedVuln", text: "Does this release fix a reported security vulnerability?" },
] as const;

export const surfaceTriggers = [
  { id: "T1", text: "New or changed network ports, services or protocols" },
  { id: "T2", text: "New or changed APIs or web interfaces, including local or service UIs" },
  { id: "T3", text: "Changes to authentication, authorisation, roles or remote management access" },
  { id: "T4", text: "Changes to cryptography, TLS configuration, certificates or key handling" },
  { id: "T5", text: "Changes to payment or cardholder data flows" },
  { id: "T6", text: "Changes to the update mechanism or secure boot" },
  { id: "T7", text: "OS, kernel, base image or runtime component update (e.g. web server, OpenSSL)" },
  { id: "T8", text: "Composition analysis flagged a new or upgraded network-facing component" },
  { id: "T9", text: "Static analysis findings that need runtime verification (e.g. possible injection points)" },
  { id: "T10", text: "Changes to default configuration, hardening, or logging and audit functions" },
  { id: "T11", text: "New types of data collected, stored or transmitted" },
] as const;

export const pentestTriggers = [
  { id: "A1", text: "Introduces a new architecture, a new platform, or is a new product" },
  { id: "A2", text: "No full penetration test on this product line in the last 12 months" },
] as const;

type BaselineId = (typeof baselineQuestions)[number]["id"];
type TriggerId = (typeof surfaceTriggers)[number]["id"] | (typeof pentestTriggers)[number]["id"];
export type GateAnswers = Partial<Record<BaselineId | TriggerId, YesNo>>;

export type Outcome = "pass" | "blocked" | "required" | "not-required" | "n/a" | "incomplete";

export type GateResult = {
  id: string;
  title: string;
  description: string;
  outcome: Outcome;
  reason: string;
};

export function evaluateReleaseGate(answers: GateAnswers): {
  complete: boolean;
  surfaceYesCount: number;
  results: GateResult[];
} {
  const allIds = [...baselineQuestions, ...surfaceTriggers, ...pentestTriggers].map((q) => q.id);
  const complete = allIds.every((id) => answers[id] !== undefined);

  const surfaceYes = surfaceTriggers.filter((t) => answers[t.id] === "yes").map((t) => t.id);
  const pentestYes = pentestTriggers.filter((t) => answers[t.id] === "yes").map((t) => t.id);
  const scanning = answers.scanningInPipeline;
  const clean = answers.noOpenCriticalHigh;

  const pending = (r: Omit<GateResult, "outcome" | "reason">): GateResult => ({
    ...r,
    outcome: "incomplete",
    reason: "Answer every question to see the result.",
  });

  const gate = { id: "gate", title: "Release gate: code-level scans", description: "SAST and SCA must run and show no unapproved critical or high findings." };
  const l1 = { id: "level1", title: "Level 1: automated security scan", description: "Vulnerability, configuration, TLS and web/API scanning of the deployed product." };
  const l2 = { id: "level2", title: "Level 2: targeted attack-surface testing", description: "White-box testing focused on what changed, with access to code and design." };
  const l3 = { id: "level3", title: "Level 3: full penetration test", description: "Independent black-box test of the whole product from an attacker's view." };
  const retest = { id: "retest", title: "Fix verification retest", description: "Confirm the vulnerability is no longer exploitable and the fix caused no regressions." };

  if (!complete) {
    return { complete, surfaceYesCount: surfaceYes.length, results: [gate, l1, l2, l3, retest].map(pending) };
  }

  const gateResult: GateResult =
    scanning === "no"
      ? { ...gate, outcome: "blocked", reason: "Scanning isn't in the pipeline yet. Run Level 1 on every release and set a date for pipeline coverage." }
      : clean === "no"
        ? { ...gate, outcome: "blocked", reason: "Fix the critical/high findings or get a documented, approved exception before shipping." }
        : { ...gate, outcome: "pass", reason: "Scans run and no unapproved critical or high findings remain." };

  const l1Reasons = [
    surfaceYes.length > 0 && `${surfaceYes.length} attack-surface trigger(s)`,
    pentestYes.length > 0 && "full penetration test trigger",
    scanning === "no" && "no pipeline scanning",
  ].filter(Boolean);

  const l1Result: GateResult =
    l1Reasons.length > 0
      ? { ...l1, outcome: "required", reason: `Required because of: ${l1Reasons.join(", ")}.` }
      : { ...l1, outcome: "not-required", reason: "No triggers. The quarterly baseline scan still applies." };

  const l2Result: GateResult =
    surfaceYes.length > 0
      ? { ...l2, outcome: "required", reason: `Focus testing on: ${surfaceYes.join(", ")}.` }
      : { ...l2, outcome: "not-required", reason: "The attack surface did not change." };

  const l3Result: GateResult =
    pentestYes.length > 0
      ? { ...l3, outcome: "required", reason: `Triggered by: ${pentestYes.join(", ")}.` }
      : { ...l3, outcome: "not-required", reason: "No new architecture and a penetration test is within 12 months." };

  const retestResult: GateResult =
    answers.fixesReportedVuln === "yes"
      ? { ...retest, outcome: "required", reason: "Retest the fix against the running product before release." }
      : { ...retest, outcome: "n/a", reason: "No security fix in this release." };

  return {
    complete,
    surfaceYesCount: surfaceYes.length,
    results: [gateResult, l1Result, l2Result, l3Result, retestResult],
  };
}
