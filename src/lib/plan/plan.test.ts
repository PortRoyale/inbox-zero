import { describe, expect, it } from "vitest";
import { analyzePlan } from "@/lib/plan/analyze";
import { planToMarkdown } from "@/lib/plan/document";
import { canonicalJson, fingerprintPlan, nextRevisionLetter } from "@/lib/plan/hash";
import { applyIndustry, emptyPlan, examplePlan } from "@/lib/plan/model";
import { suggestRisks } from "@/lib/plan/risks";

const TODAY = "2026-11-25";

describe("analyzePlan", () => {
  it("blocks an empty plan and lists blockers", () => {
    const a = analyzePlan(emptyPlan(), TODAY);
    expect(a.auditReady).toBe(false);
    expect(a.blockers.map((b) => b.id)).toEqual(expect.arrayContaining(["product-name", "product-support-end", "vuln-contact", "rep-owner"]));
    expect(a.completeness).toBe(0);
  });

  it("turns every non-advice failure into a dated, owned action", () => {
    const plan = examplePlan();
    plan.risks = suggestRisks(plan);
    const a = analyzePlan(plan, TODAY);
    const advice = a.checks.filter((c) => !c.passed && c.severity === "advice").map((c) => `a-${c.id}`);
    for (const x of a.actions) {
      expect(x.due >= TODAY).toBe(true);
      expect(x.owner.length).toBeGreaterThan(0);
      expect(advice).not.toContain(x.id);
    }
    const srp = a.actions.find((x) => x.id === "a-rep-srp");
    expect(srp?.due).toBe("2026-12-02");
    expect(srp?.owner).toBe("Head of Engineering");
  });

  it("caps non-urgent due dates one month before full application", () => {
    const plan = emptyPlan();
    plan.product.types = ["software"];
    plan.controls = {
      "secure-defaults": { status: "missing", how: "", evidence: "" },
      "data-minimisation": { status: "missing", how: "", evidence: "" },
    };
    const a = analyzePlan(plan, "2027-09-01");
    expect(a.actions.find((x) => x.id === "a-req-secure-defaults")?.due).toBe("2027-10-01");
    expect(a.actions.find((x) => x.id === "a-req-data-minimisation")?.due).toBe("2027-11-11");
  });

  it("flags a high accepted risk with no approver as a blocker", () => {
    const plan = examplePlan();
    plan.risks = suggestRisks(plan).map((r) => (r.id === "r-default-credentials" ? { ...r, treatment: "accept" as const } : r));
    expect(analyzePlan(plan, TODAY).blockers.some((b) => b.id === "risk-acceptance")).toBe(true);
  });

  it("requires a justification for support under five years", () => {
    const plan = examplePlan();
    plan.product.supportEnd = "2029-09-01";
    expect(analyzePlan(plan, TODAY).gaps.some((g) => g.id === "product-support-length")).toBe(true);
    plan.product.supportJustification = "Expected use time is three years based on battery life data.";
    expect(analyzePlan(plan, TODAY).gaps.some((g) => g.id === "product-support-length")).toBe(false);
  });
});

describe("suggestRisks", () => {
  it("adds radio and cloud risks from interfaces and keeps user edits", () => {
    const plan = examplePlan();
    const first = suggestRisks(plan);
    expect(first.map((r) => r.id)).toEqual(expect.arrayContaining(["r-radio-pairing", "r-cloud-takeover", "r-debug-port"]));
    plan.risks = first.map((r) => (r.id === "r-dos" ? { ...r, likelihood: 1 as const } : r));
    expect(suggestRisks(plan).find((r) => r.id === "r-dos")?.likelihood).toBe(1);
  });
});

describe("fingerprint", () => {
  it("is stable across key order and ignores revisions, but changes with content", async () => {
    const a = examplePlan();
    const b = JSON.parse(canonicalJson(a));
    expect(await fingerprintPlan(a)).toBe(await fingerprintPlan(b));
    const withRev = { ...a, revisions: [{ rev: "A", date: TODAY, summary: "x", hash: "h", approver: "y" }] };
    expect(await fingerprintPlan(withRev)).toBe(await fingerprintPlan(a));
    expect(await fingerprintPlan({ ...a, product: { ...a.product, version: "2.5" } })).not.toBe(await fingerprintPlan(a));
  });

  it("letters revisions A..Z then AA", () => {
    expect(nextRevisionLetter([])).toBe("A");
    expect(nextRevisionLetter(Array(26).fill({ rev: "" }))).toBe("AA");
  });
});

describe("planToMarkdown", () => {
  it("always renders all 12 sections and marks gaps", async () => {
    const plan = applyIndustry(emptyPlan(), "smart-home-security");
    const md = planToMarkdown(plan, analyzePlan(plan, TODAY), await fingerprintPlan(plan), TODAY);
    for (let i = 1; i <= 12; i++) expect(md).toContain(`## ${i}. `);
    expect(md).toContain("[GAP: intended purpose]");
    expect(md).toContain("Important product, Class I");
  });
});

describe("risk suggestions", () => {
  it("are not added before the product is described", () => {
    expect(suggestRisks(emptyPlan())).toEqual([]);
  });
});

describe("action de-duplication", () => {
  it("does not raise both a check action and a requirement action for the same obligation", () => {
    const plan = examplePlan();
    plan.risks = suggestRisks(plan);
    const ids = analyzePlan(plan, TODAY).actions.map((a) => a.id);
    expect(ids).toContain("a-vuln-policy");
    expect(ids).not.toContain("a-req-cvd-policy");
    expect(ids).not.toContain("a-req-advisories");
  });
});

describe("other regimes and generators", () => {
  it("flags RED and UK PSTI gaps only when they apply", async () => {
    const { fundingOutline, supplierQuestionnaire } = await import("@/lib/plan/templates");
    const plan = examplePlan();
    plan.risks = suggestRisks(plan);
    const ids = analyzePlan(plan, TODAY).gaps.map((g) => g.id);
    expect(ids).toContain("psti-statement");
    expect(ids).not.toContain("red-assessed");
    plan.product.soldInUk = false;
    expect(analyzePlan(plan, TODAY).checks.some((c) => c.id === "psti-statement")).toBe(false);

    const q = supplierQuestionnaire(plan);
    expect(q).toContain("RTOS and Wi-Fi stack");
    expect(q).toContain("Article 13(5)");

    const out = fundingOutline(plan, analyzePlan(plan, TODAY), { consultingDays: 15, dayRate: 1200, penTest: 12000, platform: 1788, guided: 6000 });
    expect(out).toContain("Total: €37,788");
    expect(out).toContain("Co-funding requested at 50%, capped at €30,000: €18,894");
  });
});
