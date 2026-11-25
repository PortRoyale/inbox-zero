import { craClassInfo, industryBySlug } from "@/content/industries";
import { categories, productTypes } from "@/lib/cra-requirements";
import type { PlanAnalysis } from "@/lib/plan/analyze";
import type { Plan } from "@/lib/plan/model";
import { riskLevel, riskScore } from "@/lib/plan/risks";
import { regulation, site } from "@/lib/site";

const GAP = (what: string) => `[GAP: ${what}]`;
const v = (value: string | undefined, what: string) => (value && value.trim() ? value.trim() : GAP(what));
const yesNo = (b: boolean) => (b ? "Yes" : "No");
const STATUS_TEXT = { done: "Met", partial: "Partly met", missing: "Not met", na: "Not applicable" } as const;

export function planTitle(plan: Plan) {
  return `${plan.product.name || "Untitled product"}${plan.product.version ? ` ${plan.product.version}` : ""}`;
}

export function planToMarkdown(plan: Plan, a: PlanAnalysis, fingerprint: string, generatedOn: string) {
  const p = plan.product;
  const industry = industryBySlug(p.industry);
  const cls = craClassInfo[p.craClass];
  const latest = plan.revisions[plan.revisions.length - 1];
  const changedSinceIssue = latest && latest.hash !== fingerprint;
  const out: string[] = [];
  const h = (n: number, t: string) => out.push("", `${"#".repeat(n)} ${t}`, "");
  const table = (head: string[], rows: string[][]) => {
    out.push(`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`);
    for (const r of rows) out.push(`| ${r.map((c) => c.replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |`);
    out.push("");
  };

  out.push(`# Product Security Plan: ${planTitle(plan)}`);
  out.push("");
  out.push(`Technical documentation under ${regulation} (Cyber Resilience Act), Annex VII.`);
  out.push("");
  table(
    ["Field", "Value"],
    [
      ["Manufacturer", v(p.manufacturer, "manufacturer legal name")],
      ["Current revision", latest ? `${latest.rev} (${latest.date})${changedSinceIssue ? ", edited since issue" : ""}` : "Draft, not yet issued"],
      ["Content fingerprint (SHA-256)", `\`${fingerprint}\``],
      ["Generated", generatedOn],
      ["Plan completeness", `${a.completeness}% (${a.checksPassed}/${a.checksTotal} checks passed)`],
      ["Audit-ready", a.auditReady ? "Yes" : `No: ${a.blockers.length} blocking item(s)`],
    ],
  );

  h(2, "1. Document control");
  if (plan.revisions.length) {
    table(
      ["Rev", "Date", "Summary", "Approved by", "Fingerprint"],
      plan.revisions.map((r) => [r.rev, r.date, r.summary, r.approver || GAP("approver"), `\`${r.hash.slice(0, 16)}…\``]),
    );
  } else {
    out.push("No revision issued yet. Issue revision A to fix the content fingerprint and date.");
  }
  table(
    ["Role", "Name"],
    [
      ["Security lead", v(plan.roles.securityLead, "security lead")],
      ["Engineering lead", v(plan.roles.engineeringLead, "engineering lead")],
      ["Product owner (approver)", v(plan.roles.productOwner, "product owner")],
      ["Legal / compliance contact", v(plan.roles.legalContact, "legal contact")],
    ],
  );

  h(2, "2. Product description and intended purpose (Annex VII 1)");
  table(
    ["Field", "Value"],
    [
      ["Product", v(planTitle(plan), "product name")],
      ["Composition", p.types.length ? productTypes.filter((t) => p.types.includes(t.id)).map((t) => t.label).join(", ") : GAP("composition")],
      ["Sector", industry?.name ?? "Not specified"],
      ["Users", { consumers: "Consumers", business: "Business users", both: "Consumers and business users" }[p.users]],
      ["Radio equipment", yesNo(p.radio)],
      ["Planned EU market date", v(p.marketDate, "market date")],
      ["Support period ends", v(p.supportEnd, "support end date")],
    ],
  );
  out.push(`**Intended purpose.** ${v(p.purpose, "intended purpose")}`);
  if (p.supportJustification.trim()) out.push("", `**Support period rationale.** ${p.supportJustification.trim()}`);

  h(2, "3. Architecture, components and SBOM (Annex VII 2(a))");
  table(
    ["Component", "Type", "Version", "Supplier", "Internet-facing"],
    plan.components.length
      ? plan.components.map((c) => [c.name || GAP("name"), c.kind, c.version || "Not recorded", c.supplier || GAP("supplier"), yesNo(c.internetFacing)])
      : [[GAP("list components"), "", "", "", ""]],
  );
  out.push(`**External interfaces:** ${plan.interfaces.length ? plan.interfaces.join(", ") : GAP("interfaces")}`);
  out.push("", `**Data processed:** ${plan.data.length ? plan.data.join(", ") : "None recorded"}`);
  out.push("", `**SBOM:** ${plan.sdlc.sbomFormat === "none" ? GAP("SBOM format") : plan.sdlc.sbomFormat}; ${v(plan.sdlc.sbomLocation, "where SBOMs are stored")}`);

  h(2, "4. Cybersecurity risk assessment (Art. 13(2); Annex VII 3)");
  out.push("Likelihood and impact are rated 1 (low) to 3 (high); score = likelihood × impact. Scores of 6 or more are high.");
  out.push("");
  const risks = plan.risks.filter((r) => r.include);
  table(
    ["ID", "Threat", "Asset", "L", "I", "Level", "Treatment", "Control", "Owner"],
    risks.length
      ? risks.map((r, i) => [
          `R${i + 1}`,
          r.threat,
          r.asset,
          String(r.likelihood),
          String(r.impact),
          riskLevel(riskScore(r)),
          r.treatment + (r.treatment === "accept" ? ` (by ${r.acceptedBy || GAP("approver")}, review ${r.reviewBy || GAP("date")})` : ""),
          r.control,
          r.owner || "Unassigned",
        ])
      : [[GAP("risk assessment"), "", "", "", "", "", "", "", ""]],
  );

  h(2, "5. Essential requirements: how each is met (Annex I Part I)");
  for (const cat of categories) {
    const inCat = a.reqs.filter((r) => r.category === cat.id);
    if (!inCat.length) continue;
    h(3, cat.label);
    table(
      ["Requirement", "CRA ref.", "Status", "How we meet it", "Evidence"],
      inCat.map((r) => {
        const e = plan.controls[r.id];
        return [r.title, r.craRef, e?.status ? STATUS_TEXT[e.status] : GAP("assess"), e?.how.trim() || "Not described", e?.evidence.trim() || "None linked"];
      }),
    );
  }

  h(2, "6. Secure development and testing (Annex I Part II(3))");
  table(
    ["Practice", "In place"],
    [
      ...plan.sdlc.practices.map((x) => [x, "Yes"]),
      ["Release security gate per release", yesNo(plan.sdlc.releaseGate)],
      ["Penetration testing", { annual: "Annually", "major-release": "Each major release and new product", none: GAP("cadence") }[plan.sdlc.penTestCadence]],
      ["Last penetration test", plan.sdlc.lastPenTest || "Not recorded"],
    ],
  );

  h(2, "7. Vulnerability handling and disclosure (Annex I Part II)");
  const sla = plan.vulns.slaDays;
  table(
    ["Item", "Value"],
    [
      ["Security contact", v(plan.vulns.contact, "security contact")],
      ["Disclosure policy", v(plan.vulns.policyUrl, "policy URL")],
      ["security.txt published", yesNo(plan.vulns.securityTxt)],
      ["Advisory channel", v(plan.vulns.advisoryChannel, "advisory channel")],
      ["Fix targets (days)", `Critical ${sla.critical} · High ${sla.high} · Medium ${sla.medium} · Low ${sla.low}`],
    ],
  );

  h(2, "8. Updates, support period and incident reporting (Art. 13(8); Art. 14)");
  table(
    ["Item", "Value"],
    [
      ["Update mechanism", v(plan.updates.mechanism, "update mechanism")],
      ["Updates signed and verified", yesNo(plan.updates.signed)],
      ["Automatic security updates by default", yesNo(plan.updates.autoUpdateDefault)],
      ["Security fixes shippable separately", yesNo(plan.updates.separateSecurityUpdates)],
      ["Support period ends", v(p.supportEnd, "support end date")],
      ["Reporting owner (24 h / 72 h)", v(plan.updates.reportingOwner, "reporting owner")],
      ["Backup reporter", v(plan.updates.reportingBackup, "backup reporter")],
      ["Coordinating CSIRT member state", v(plan.updates.csirtCountry, "member state")],
      ["Registered on ENISA SRP", yesNo(plan.updates.srpRegistered)],
      ["User notification channel", v(plan.updates.userNotification, "user notification")],
    ],
  );
  out.push("Reporting timeline for actively exploited vulnerabilities: early warning within 24 hours of awareness, notification within 72 hours, final report within 14 days after a corrective measure is available. Severe incidents: 24 hours, 72 hours, final report within one month.");

  h(2, "9. Conformity route and standards (Art. 32; Annex VII 5)");
  out.push(`**Product category:** ${cls.label}. ${cls.route}`);
  if (industry) {
    out.push("", "**Relevant standards and specifications:**", "");
    for (const s of industry.standards) out.push(`- ${s.name}: ${s.note}`);
  }

  h(2, "10. Evidence register");
  table(
    ["CRA ref.", "Obligation", "Plan section", "Evidence", "Status"],
    a.register.map((r) => [r.ref, r.obligation, r.section, r.evidence || "None linked", r.status.toUpperCase()]),
  );

  h(2, "11. Action plan");
  if (a.actions.length) {
    table(
      ["#", "Action", "Why", "Owner", "Due", "Priority", "CRA ref."],
      a.actions.map((x, i) => [String(i + 1), x.title, x.detail, x.owner, x.due, x.priority, x.ref]),
    );
  } else {
    out.push("No open actions.");
  }

  h(2, "12. Sign-off");
  out.push(
    `Approved by: ${latest?.approver || GAP("approver")}  `,
    `Date: ${latest?.date || GAP("date")}  `,
    `Fingerprint: \`${latest?.hash || fingerprint}\``,
  );
  out.push("", `---`, `Generated with ${site.name}. Guidance, not legal advice or a conformity assessment.`);
  return out.join("\n");
}
