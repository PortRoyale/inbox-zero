import { describe, expect, it } from "vitest";
import { evaluateReleaseGate, pentestTriggers, surfaceTriggers, type GateAnswers } from "@/lib/release-gate";

function answersWith(overrides: GateAnswers): GateAnswers {
  const base: GateAnswers = { scanningInPipeline: "yes", noOpenCriticalHigh: "yes", fixesReportedVuln: "no" };
  for (const t of [...surfaceTriggers, ...pentestTriggers]) base[t.id] = "no";
  return { ...base, ...overrides };
}

const outcomeOf = (answers: GateAnswers, id: string) =>
  evaluateReleaseGate(answers).results.find((r) => r.id === id)?.outcome;

describe("evaluateReleaseGate", () => {
  it("is incomplete until every question is answered", () => {
    const result = evaluateReleaseGate({ T1: "yes" });
    expect(result.complete).toBe(false);
    expect(result.results.every((r) => r.outcome === "incomplete")).toBe(true);
  });

  it("requires nothing beyond the gate for a release with no triggers", () => {
    const answers = answersWith({});
    expect(outcomeOf(answers, "gate")).toBe("pass");
    expect(outcomeOf(answers, "level1")).toBe("not-required");
    expect(outcomeOf(answers, "level2")).toBe("not-required");
    expect(outcomeOf(answers, "level3")).toBe("not-required");
    expect(outcomeOf(answers, "retest")).toBe("n/a");
  });

  it("requires Level 1 and 2 but not a pen test when the attack surface changes", () => {
    const answers = answersWith({ T2: "yes", T4: "yes", T7: "yes", T8: "yes" });
    expect(evaluateReleaseGate(answers).surfaceYesCount).toBe(4);
    expect(outcomeOf(answers, "level1")).toBe("required");
    expect(outcomeOf(answers, "level2")).toBe("required");
    expect(outcomeOf(answers, "level3")).toBe("not-required");
  });

  it("requires a full pen test for a new product", () => {
    const answers = answersWith({ A1: "yes" });
    expect(outcomeOf(answers, "level3")).toBe("required");
    expect(outcomeOf(answers, "level1")).toBe("required");
    expect(outcomeOf(answers, "level2")).toBe("not-required");
  });

  it("blocks the gate and requires Level 1 when scanning is not in the pipeline", () => {
    const answers = answersWith({ scanningInPipeline: "no" });
    expect(outcomeOf(answers, "gate")).toBe("blocked");
    expect(outcomeOf(answers, "level1")).toBe("required");
  });

  it("blocks the gate on open critical/high findings", () => {
    expect(outcomeOf(answersWith({ noOpenCriticalHigh: "no" }), "gate")).toBe("blocked");
  });

  it("requires a retest when the release fixes a vulnerability", () => {
    expect(outcomeOf(answersWith({ fixesReportedVuln: "yes" }), "retest")).toBe("required");
  });
});
