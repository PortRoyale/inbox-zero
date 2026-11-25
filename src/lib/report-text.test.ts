import { describe, expect, it } from "vitest";
import { scoreAssessment } from "@/lib/assessment-score";
import { requirementsFor } from "@/lib/cra-requirements";
import { evaluateReleaseGate, pentestTriggers, surfaceTriggers, type GateAnswers } from "@/lib/release-gate";
import { assessmentReportText, releaseRecordText } from "@/lib/report-text";

describe("assessmentReportText", () => {
  it("lists gaps with their item ids in priority order", () => {
    const reqs = requirementsFor(["hardware"]);
    const answers = Object.fromEntries(reqs.map((r) => [r.id, "done" as const]));
    answers.tamper = "missing" as never;
    answers["risk-assessment"] = "partial" as never;
    const text = assessmentReportText({
      productName: "Thermostat",
      productTypes: ["Hardware device"],
      date: "25 Nov 2026",
      score: scoreAssessment(reqs, answers),
      itemIds: { tamper: "C.5", "risk-assessment": "A.1" },
    });
    expect(text).toContain("CRA READINESS REPORT: Thermostat");
    expect(text.indexOf("[A.1]")).toBeLessThan(text.indexOf("[C.5]"));
    expect(text).toContain("Open gaps: 2 (1 critical)");
  });
});

describe("releaseRecordText", () => {
  it("includes changed triggers with notes and every outcome", () => {
    const answers: GateAnswers = { scanningInPipeline: "yes", noOpenCriticalHigh: "yes", fixesReportedVuln: "no" };
    for (const t of [...surfaceTriggers, ...pentestTriggers]) answers[t.id] = t.id === "T2" ? "yes" : "no";
    const text = releaseRecordText({
      release: { product: "Gateway", version: "4.12.0", ticket: "CHG-1" },
      date: "25 Nov 2026",
      result: evaluateReleaseGate(answers),
      yesTriggers: [{ id: "T2", text: "New API", note: "diagnostics endpoint" }],
    });
    expect(text).toContain("- T2 New API: diagnostics endpoint");
    expect(text).toContain("Level 2: targeted attack-surface testing: REQUIRED.");
    expect(text).toContain("Level 3: full penetration test: NOT REQUIRED.");
  });
});
