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
