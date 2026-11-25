import { describe, expect, it } from "vitest";
import { readinessBand, scoreAssessment, type Answers } from "@/lib/assessment-score";
import { requirements, requirementsFor } from "@/lib/cra-requirements";

describe("requirementsFor", () => {
  it("returns nothing when no product type is selected", () => {
    expect(requirementsFor([])).toEqual([]);
  });

  it("includes hardware-only items only for hardware", () => {
    expect(requirementsFor(["software"]).some((r) => r.id === "tamper")).toBe(false);
    expect(requirementsFor(["hardware"]).some((r) => r.id === "tamper")).toBe(true);
  });

  it("has unique ids", () => {
    expect(new Set(requirements.map((r) => r.id)).size).toBe(requirements.length);
  });
});

describe("scoreAssessment", () => {
  const reqs = requirementsFor(["software"]);

  it("scores done as 1, partial as 0.5 and excludes n/a", () => {
    const [a, b, c] = reqs;
    const answers: Answers = { [a.id]: "done", [b.id]: "partial", [c.id]: "na" };
    const result = scoreAssessment([a, b, c], answers);
    expect(result.percent).toBe(75);
    expect(result.complete).toBe(true);
    expect(result.gaps.map((g) => g.id)).toEqual([b.id]);
  });

  it("orders gaps by priority, then missing before partial", () => {
    const answers: Answers = Object.fromEntries(reqs.map((r) => [r.id, "partial"]));
    const standard = reqs.find((r) => r.priority === "standard")!;
    const critical = reqs.filter((r) => r.priority === "critical");
    answers[standard.id] = "missing";
    answers[critical[1].id] = "missing";
    const { gaps } = scoreAssessment(reqs, answers);
    expect(gaps[0].id).toBe(critical[1].id);
    expect(gaps.findIndex((g) => g.id === standard.id)).toBeGreaterThan(critical.length);
  });

  it("reports 0% when nothing is answered", () => {
    expect(scoreAssessment(reqs, {}).percent).toBe(0);
  });
});

describe("readinessBand", () => {
  it("maps percentages to bands", () => {
    expect(readinessBand(90).tone).toBe("good");
    expect(readinessBand(60).tone).toBe("ok");
    expect(readinessBand(30).tone).toBe("warn");
    expect(readinessBand(10).tone).toBe("bad");
  });
});
