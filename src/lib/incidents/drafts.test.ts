import { describe, expect, it } from "vitest";
import { reportDraft, type DraftData, type DraftStage, type IncidentKind } from "@/lib/incidents";

const AWARE = Date.UTC(2026, 9, 1, 8, 30);

const full: DraftData = {
  productName: "Acme Gateway",
  productVersion: "2.4.1",
  manufacturer: "Acme Devices GmbH",
  memberState: "Germany",
  marketStates: ["Germany", "Austria", " France "],
  summary: "Remote code execution in the web admin interface.",
  exploitNature: "Unauthenticated HTTP request to the admin API.",
  severity: "Critical (CVSS 9.8)",
  impact: "Full device takeover.",
  maliciousActor: "Botnet operator, unattributed.",
  suspectedMalicious: true,
  rootCause: "Missing input validation.",
  measuresTaken: "Admin API disabled by remote configuration.",
  userMeasures: "Install firmware 2.4.2 or block port 8443.",
  correctiveMeasure: "Firmware 2.4.2 released on 5 October 2026.",
  sensitivity: "high",
  contact: "security@acme.example",
  awareAt: AWARE,
};
const bare: DraftData = { productName: "Acme Gateway", awareAt: AWARE };

const field = (kind: IncidentKind, stage: DraftStage, d: DraftData, label: string) =>
  reportDraft(kind, stage, d).fields.find((f) => f.label === label);
const placeholders = (kind: IncidentKind, stage: DraftStage, d: DraftData) =>
  reportDraft(kind, stage, d)
    .fields.filter((f) => f.value.startsWith("[to complete:"))
    .map((f) => f.label);

const KINDS = ["vulnerability", "incident"] as const;
const STAGES = ["early-warning", "notification", "final-report", "users"] as const;

describe("reportDraft", () => {
  it("leaves no placeholders when everything is filled in", () => {
    for (const kind of KINDS) for (const stage of STAGES) expect(placeholders(kind, stage, full)).toEqual([]);
  });

  it("marks only required fields with placeholders", () => {
    for (const kind of KINDS) {
      for (const stage of STAGES) {
        const { fields } = reportDraft(kind, stage, bare);
        for (const f of fields) {
          if (f.value.startsWith("[to complete:")) expect(f.required).toBe(true);
          if (!f.required) expect(f.value.startsWith("[to complete:")).toBe(false);
        }
      }
    }
  });

  it("builds a vulnerability early warning with Member States and the platform route", () => {
    const draft = reportDraft("vulnerability", "early-warning", full);
    expect(draft.title).toBe("Early warning: actively exploited vulnerability in Acme Gateway, version 2.4.1");
    expect(field("vulnerability", "early-warning", full, "Member States where the product is made available")?.value).toBe("Germany, Austria, France");
    expect(field("vulnerability", "early-warning", full, "Became aware")?.value).toBe("2026-10-01 08:30 UTC");
    expect(draft.text).toContain("Article 14(2)(a)");
    expect(draft.text).toContain("ENISA Single Reporting Platform");
    expect(draft.text).toContain("Contact: security@acme.example");
  });

  it("asks an incident early warning whether malicious acts are suspected", () => {
    expect(field("incident", "early-warning", full, "Suspected unlawful or malicious act")?.value).toMatch(/^Yes/);
    expect(field("incident", "early-warning", { ...full, suspectedMalicious: false }, "Suspected unlawful or malicious act")?.value).toMatch(/^No/);
    const missing = field("incident", "early-warning", bare, "Suspected unlawful or malicious act");
    expect(missing).toMatchObject({ required: true });
    expect(missing?.value).toContain("[to complete:");
    expect(reportDraft("incident", "early-warning", full).text).toContain("Article 14(4)(a)");
    expect(field("vulnerability", "early-warning", full, "Suspected unlawful or malicious act")).toBeUndefined();
  });

  it("lists the gaps in a bare vulnerability notification", () => {
    expect(placeholders("vulnerability", "notification", bare)).toEqual([
      "Manufacturer",
      "Member State of main establishment",
      "Summary",
      "Nature of the exploit and vulnerability",
      "Corrective or mitigating measures taken",
      "Measures users can take",
      "Sensitivity of this information",
    ]);
    const text = reportDraft("vulnerability", "notification", bare).text;
    expect(text).toContain("Product: Acme Gateway");
    expect(text).toContain("Sensitivity of this information: [to complete:");
    expect(text).not.toContain("Contact:");
  });

  it("gives an incident notification an initial assessment and sensitivity", () => {
    expect(field("incident", "notification", full, "Initial assessment")?.value).toBe("Severity: Critical (CVSS 9.8). Impact: Full device takeover.");
    expect(field("incident", "notification", { ...bare, impact: "Data loss" }, "Initial assessment")?.value).toBe("Impact: Data loss");
    expect(field("incident", "notification", bare, "Initial assessment")?.value).toContain("[to complete:");
    expect(field("incident", "notification", full, "Sensitivity of this information")?.value).toBe("High");
    expect(reportDraft("incident", "notification", full).title).toBe("Incident notification: Acme Gateway, version 2.4.1");
  });

  it("covers the vulnerability final report contents", () => {
    expect(placeholders("vulnerability", "final-report", bare)).toEqual([
      "Manufacturer",
      "Member State of main establishment",
      "Description of the vulnerability",
      "Severity",
      "Impact",
      "Security update or other corrective measures",
    ]);
    const actor = field("vulnerability", "final-report", bare, "Malicious actor");
    expect(actor).toEqual({ label: "Malicious actor", value: "No information available", required: false });
    expect(reportDraft("vulnerability", "final-report", bare).text).toContain("Malicious actor: No information available");
    expect(reportDraft("vulnerability", "final-report", full).text).toContain("Article 14(2)(c)");
  });

  it("covers the incident final report contents", () => {
    expect(placeholders("incident", "final-report", bare)).toEqual([
      "Manufacturer",
      "Member State of main establishment",
      "Detailed description of the incident",
      "Severity",
      "Impact",
      "Type of threat or root cause",
      "Applied and ongoing mitigation measures",
    ]);
    expect(field("incident", "final-report", full, "Type of threat or root cause")?.value).toBe("Missing input validation.");
    expect(reportDraft("incident", "final-report", full).text).toContain("Article 14(4)(c)");
  });

  it("writes a plain user notice without regulatory jargon", () => {
    const draft = reportDraft("vulnerability", "users", full);
    expect(draft.title).toBe("Security notice: Acme Gateway, version 2.4.1");
    expect(draft.text).toContain("What you should do\nInstall firmware 2.4.2 or block port 8443.");
    expect(draft.text).toContain("What we have done\nAdmin API disabled by remote configuration. Firmware 2.4.2 released on 5 October 2026.");
    expect(draft.text).toContain("Contact us: security@acme.example");
    expect(draft.text).not.toMatch(/CSIRT|ENISA|Article|Regulation/);
  });

  it("shows gaps in a bare user notice and skips empty optional sections", () => {
    expect(placeholders("incident", "users", bare)).toEqual(["What happened", "What you should do", "Contact", "From"]);
    const text = reportDraft("incident", "users", bare).text;
    expect(text).toContain("A security incident has affected Acme Gateway.");
    expect(text).not.toContain("What this means for you");
    expect(text).not.toContain("What we have done");
  });

  it("treats blank strings as missing", () => {
    const blank = { ...bare, productName: "  ", manufacturer: " ", marketStates: [" "] };
    expect(placeholders("vulnerability", "early-warning", blank)).toContain("Product");
    expect(placeholders("vulnerability", "early-warning", blank)).toContain("Member States where the product is made available");
    expect(reportDraft("vulnerability", "early-warning", blank).title).toContain("[to complete:");
  });

  it("never uses an em dash", () => {
    const EM_DASH = String.fromCharCode(0x2014);
    for (const kind of KINDS) {
      for (const stage of STAGES) {
        for (const d of [full, bare]) {
          const draft = reportDraft(kind, stage, d);
          expect(draft.text.includes(EM_DASH)).toBe(false);
          expect(draft.title.includes(EM_DASH)).toBe(false);
        }
      }
    }
  });
});
