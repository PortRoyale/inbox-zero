// Draft text for CRA Article 14 reports and the Article 14(8) user notice.

import { formatUtc, type IncidentKind } from "./clock";

export type DraftData = {
  productName: string;
  productVersion?: string;
  manufacturer?: string;
  memberState?: string;
  marketStates?: string[];
  summary?: string;
  exploitNature?: string;
  severity?: string;
  impact?: string;
  maliciousActor?: string;
  suspectedMalicious?: boolean;
  rootCause?: string;
  measuresTaken?: string;
  userMeasures?: string;
  correctiveMeasure?: string;
  sensitivity?: "low" | "medium" | "high";
  contact?: string;
  awareAt: number;
};

export type DraftStage = "early-warning" | "notification" | "final-report" | "users";
export type DraftField = { label: string; value: string; required: boolean };
export type ReportDraft = { title: string; fields: DraftField[]; text: string };

type Row = DraftField & { inText: boolean };

const clean = (v: string | null | undefined): string => (typeof v === "string" ? v.trim() : "");

// Missing required values become a visible placeholder.
function req(label: string, value: string, hint: string): Row {
  return { label, value: value || `[to complete: ${hint}]`, required: true, inText: true };
}

// Missing optional values are left out of the text unless a fallback is worth saying.
function opt(label: string, value: string, fallback?: string): Row {
  if (value) return { label, value, required: false, inText: true };
  return { label, value: fallback ?? "Not provided", required: false, inText: fallback !== undefined };
}

const SENSITIVITY = { low: "Low", medium: "Medium", high: "High" } as const;

function basisFor(kind: IncidentKind, stage: Exclude<DraftStage, "users">): string {
  const para = kind === "vulnerability" ? "14(2)" : "14(4)";
  const point = stage === "early-warning" ? "a" : stage === "notification" ? "b" : "c";
  return `Article ${para}(${point})`;
}

function titleFor(kind: IncidentKind, stage: DraftStage, product: string): string {
  const subject = kind === "vulnerability" ? `actively exploited vulnerability in ${product}` : `severe incident affecting ${product}`;
  if (stage === "early-warning") return `Early warning: ${subject}`;
  if (stage === "notification") return kind === "vulnerability" ? `Vulnerability notification: ${product}` : `Incident notification: ${product}`;
  if (stage === "final-report") return `Final report: ${subject}`;
  return `Security notice: ${product}`;
}

export function reportDraft(kind: IncidentKind, stage: DraftStage, d: DraftData): ReportDraft {
  const vuln = kind === "vulnerability";
  const name = clean(d.productName);
  const version = clean(d.productVersion);
  const product = name ? (version ? `${name}, version ${version}` : name) : "";
  const productRow = req("Product", product, "product name and version");
  const title = titleFor(kind, stage, productRow.value);

  const summary = clean(d.summary);
  const states = (d.marketStates ?? []).map(clean).filter(Boolean).join(", ");
  const malicious =
    d.suspectedMalicious === true
      ? "Yes, suspected to be caused by unlawful or malicious acts"
      : d.suspectedMalicious === false
        ? "No, not suspected at this stage"
        : "";
  const sensitivity = d.sensitivity ? SENSITIVITY[d.sensitivity] : "";
  const measuresTaken = clean(d.measuresTaken);
  const userMeasures = clean(d.userMeasures);
  const corrective = clean(d.correctiveMeasure);
  const contact = clean(d.contact);
  const manufacturer = clean(d.manufacturer);

  if (stage === "users") {
    const done = [measuresTaken, corrective].filter(Boolean).join(" ");
    const rows: Row[] = [
      productRow,
      req("What happened", summary, "plain description of the problem"),
      opt("What this means for you", clean(d.impact)),
      req("What you should do", userMeasures, "steps users should take, or say that no action is needed"),
      opt("What we have done", done),
      req("Contact", contact, "how users can reach you"),
      req("From", manufacturer, "manufacturer name"),
    ];
    return { title, fields: strip(rows), text: userNotice(vuln, title, rows) };
  }

  const states14 = "Member States where the product is made available";
  const rows: Row[] = [
    req("Manufacturer", manufacturer, "manufacturer name"),
    productRow,
    req("Member State of main establishment", clean(d.memberState), "Member State of your main EU establishment, which sets the coordinating CSIRT"),
    req("Became aware", Number.isFinite(d.awareAt) ? formatUtc(d.awareAt) : "", "date and time you became aware"),
  ];

  if (stage === "early-warning") {
    rows.push(req("Summary", summary, vuln ? "short description of the vulnerability" : "short description of the incident"));
    if (!vuln) rows.push(req("Suspected unlawful or malicious act", malicious, "whether you suspect unlawful or malicious acts"));
    rows.push(req(states14, states, "Member States where the product is made available"));
  } else if (stage === "notification") {
    if (vuln) {
      rows.push(
        req("Summary", summary, "general description of the vulnerability"),
        req("Nature of the exploit and vulnerability", clean(d.exploitNature), "general nature of the exploit and of the vulnerability"),
      );
    } else {
      const assessment = [clean(d.severity) && `Severity: ${clean(d.severity)}`, clean(d.impact) && `Impact: ${clean(d.impact)}`]
        .filter(Boolean)
        .join(". ");
      rows.push(
        req("Nature of the incident", summary, "general information about the nature of the incident"),
        req("Initial assessment", assessment, "initial assessment of the incident, such as severity and impact"),
        opt("Suspected unlawful or malicious act", malicious),
      );
    }
    rows.push(
      req("Corrective or mitigating measures taken", measuresTaken, "corrective or mitigating measures you have taken"),
      req("Measures users can take", userMeasures, "corrective or mitigating measures users can take"),
      req("Sensitivity of this information", sensitivity, "how sensitive you consider this information (low, medium or high)"),
      opt(states14, states),
    );
  } else {
    rows.push(
      req(vuln ? "Description of the vulnerability" : "Detailed description of the incident", summary, vuln ? "description of the vulnerability" : "detailed description of the incident"),
      req("Severity", clean(d.severity), "severity"),
      req("Impact", clean(d.impact), "impact"),
    );
    if (vuln) {
      rows.push(
        opt("Malicious actor", clean(d.maliciousActor), "No information available"),
        req("Security update or other corrective measures", corrective, "details of the security update or other corrective measures made available"),
      );
    } else {
      rows.push(
        req("Type of threat or root cause", clean(d.rootCause), "type of threat or root cause likely to have triggered the incident"),
        req("Applied and ongoing mitigation measures", measuresTaken, "applied and ongoing mitigation measures"),
        opt("Security update or corrective measure", corrective),
      );
    }
  }
  rows.push(opt("Contact", contact));

  const lines = [
    title,
    `Regulation (EU) 2024/2847, ${basisFor(kind, stage)}. Submit through the ENISA Single Reporting Platform to the CSIRT designated as coordinator (Article 14(7) and Article 16).`,
    "",
    ...rows.filter((r) => r.inText).map((r) => `${r.label}: ${r.value}`),
  ];
  return { title, fields: strip(rows), text: lines.join("\n") };
}

function strip(rows: Row[]): DraftField[] {
  return rows.map(({ label, value, required }) => ({ label, value, required }));
}

function userNotice(vuln: boolean, title: string, rows: Row[]): string {
  const get = (label: string) => rows.find((r) => r.label === label) as Row;
  const product = get("Product").value;
  const intro = vuln
    ? `We have found a security weakness in ${product} that attackers are actively using. We are telling you so you can protect yourself.`
    : `A security incident has affected ${product}. We are telling you so you can protect yourself.`;
  const section = (heading: string, label: string) => {
    const r = get(label);
    return r.inText ? [heading, r.value, ""] : [];
  };
  return [
    title,
    "",
    intro,
    "",
    ...section("What happened", "What happened"),
    ...section("What this means for you", "What this means for you"),
    ...section("What you should do", "What you should do"),
    ...section("What we have done", "What we have done"),
    "Questions",
    `Contact us: ${get("Contact").value}`,
    "",
    get("From").value,
  ].join("\n");
}
