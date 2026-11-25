import { addYears, type Plan } from "@/lib/plan/model";

export function securityTxt(plan: Plan, today: string) {
  const lines = [
    `Contact: mailto:${plan.vulns.contact || "security@example.com"}`,
    `Expires: ${addYears(today, 1)}T00:00:00.000Z`,
    plan.vulns.policyUrl ? `Policy: ${plan.vulns.policyUrl}` : "# Policy: https://your-site/security/policy",
    "Preferred-Languages: en",
  ];
  if (plan.vulns.advisoryChannel.startsWith("http")) lines.push(`# Advisories: ${plan.vulns.advisoryChannel}`);
  return lines.join("\n");
}

export function disclosurePolicy(plan: Plan) {
  const name = plan.product.manufacturer || "We";
  const sla = plan.vulns.slaDays;
  return [
    `# Vulnerability disclosure policy`,
    ``,
    `${name} welcomes reports of security vulnerabilities in ${plan.product.name || "our products"}.`,
    ``,
    `## How to report`,
    `Email ${plan.vulns.contact || "security@example.com"} with a description, affected version, and steps to reproduce. Encrypt sensitive details if you can.`,
    ``,
    `## What we commit to`,
    `- Acknowledge your report within 3 working days.`,
    `- Give you a triage decision within 10 working days.`,
    `- Aim to fix critical issues within ${sla.critical} days, high within ${sla.high} days, medium within ${sla.medium} days and low within ${sla.low} days.`,
    `- Credit you in the advisory if you wish.`,
    `- Publish an advisory once a fix is available${plan.vulns.advisoryChannel ? ` at ${plan.vulns.advisoryChannel}` : ""}.`,
    ``,
    `## Safe harbour`,
    `We will not pursue legal action against good-faith research that follows this policy, avoids privacy violations and service disruption, and gives us reasonable time to fix before disclosure.`,
    ``,
    `## Regulatory reporting`,
    `Actively exploited vulnerabilities are reported to the authorities as required by the EU Cyber Resilience Act.`,
  ].join("\n");
}

export function reportingRunbook(plan: Plan) {
  const owner = plan.updates.reportingOwner || "[reporting owner]";
  const backup = plan.updates.reportingBackup || "[backup reporter]";
  return [
    `# CRA reporting runbook: ${plan.product.name || "product"}`,
    ``,
    `Applies to actively exploited vulnerabilities and severe incidents affecting the product's security.`,
    ``,
    `Owner: ${owner}. Backup: ${backup}. Coordinating CSIRT member state: ${plan.updates.csirtCountry || "[member state]"}.`,
    ``,
    `1. T+0: Become aware. Record the time. Open an incident ticket. Notify ${owner} and ${backup}.`,
    `2. Before T+24h: Submit the early warning on ENISA's Single Reporting Platform. Include affected member states if known.`,
    `3. Before T+72h: Submit the notification: product, nature of the exploit or incident, corrective or mitigating measures taken, measures users can take, and sensitivity of the information.`,
    `4. Inform affected users without undue delay through: ${plan.updates.userNotification || "[user notification channel]"}. Share mitigations they can apply.`,
    `5. Final report: within 14 days after a corrective measure is available (vulnerabilities), or within one month of the notification (severe incidents). Include root cause and fixes.`,
    `6. Publish the security advisory once a fix is available.`,
    `7. Review: hold a post-incident review within two weeks and update the risk assessment and this plan.`,
  ].join("\n");
}

export function supplierQuestionnaire(plan: Plan) {
  const suppliers = plan.components.filter((c) => c.kind === "third-party");
  const list = suppliers.length ? suppliers.map((c) => `- ${c.name}${c.version ? ` ${c.version}` : ""} (supplier: ${c.supplier || "unknown"})`) : ["- [component and version]"];
  return [
    `# Supplier security questionnaire`,
    ``,
    `${plan.product.manufacturer || "We"} integrate${plan.product.manufacturer ? "s" : ""} the following component(s) in ${plan.product.name || "our product"}, sold in the EU under the Cyber Resilience Act (Regulation (EU) 2024/2847). Article 13(5) requires us to exercise due diligence on third-party components. Please answer for each component:`,
    ``,
    ...list,
    ``,
    `1. Can you provide a machine-readable SBOM (SPDX or CycloneDX) for each release?`,
    `2. How do we report a vulnerability to you, and what response time do you commit to?`,
    `3. Until what date will you provide security updates for this version?`,
    `4. How are updates signed, and how do we verify them?`,
    `5. Do you notify customers of actively exploited vulnerabilities, and how quickly?`,
    `6. Which secure development practices do you follow (code review, static analysis, dependency scanning)?`,
    `7. Have you had an independent security assessment or penetration test in the last 12 months?`,
    `8. Are there known unpatched vulnerabilities in the current version?`,
    ``,
    `Please reply by [date]. Thank you.`,
  ].join("\n");
}

export function fundingOutline(plan: Plan, a: { actions: { title: string; priority: string; due: string }[]; completeness: number }, budget: { consultingDays: number; dayRate: number; penTest: number; platform: number; guided: number }) {
  const total = budget.consultingDays * budget.dayRate + budget.penTest + budget.platform + budget.guided;
  const requested = Math.min(total * 0.5, 30000);
  const eur = (n: number) => `€${Math.round(n).toLocaleString("en-GB")}`;
  const critical = a.actions.filter((x) => x.priority === "critical");
  return [
    `# Project outline: CRA compliance for ${plan.product.name || "[product]"}`,
    ``,
    `Draft for an SME co-funding application (for example the SECURE open call). Check the call guidelines for eligibility, eligible costs and format before submitting.`,
    ``,
    `## Applicant`,
    `${plan.product.manufacturer || "[legal name]"}, manufacturer of ${plan.product.name || "[product]"} (${plan.product.types.join(", ") || "[product type]"}).`,
    ``,
    `## Objective`,
    `Bring ${plan.product.name || "the product"} into conformity with the Cyber Resilience Act before 11 December 2027 and operate the vulnerability and incident reporting process that has applied since 11 September 2026. Current documentation completeness: ${a.completeness}%.`,
    ``,
    `## Work packages`,
    `1. Risk assessment and technical documentation (Annex VII).`,
    `2. Close essential-requirement gaps: ${critical.length} critical and ${a.actions.length - critical.length} other open actions.`,
    `3. Vulnerability handling: SBOM per release, disclosure policy, advisories, 24/72-hour reporting.`,
    `4. Independent security testing and fix verification.`,
    `5. Conformity assessment, EU declaration of conformity and CE marking.`,
    ``,
    `## Indicative budget`,
    `- Additional external expertise: ${budget.consultingDays} days × ${eur(budget.dayRate)} = ${eur(budget.consultingDays * budget.dayRate)}`,
    `- Penetration test: ${eur(budget.penTest)}`,
    `- Compliance platform (12 months): ${eur(budget.platform)}`,
    `- Guided readiness package: ${eur(budget.guided)}`,
    `- Total: ${eur(total)}`,
    `- Co-funding requested at 50%, capped at €30,000: ${eur(requested)}`,
    ``,
    `## Milestones`,
    ...a.actions.slice(0, 8).map((x) => `- ${x.due}: ${x.title}`),
  ].join("\n");
}
