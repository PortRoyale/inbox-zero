import { categories, type CategoryId, type Priority, type Requirement } from "@/lib/cra-requirements";

export type AnswerStatus = "done" | "partial" | "missing" | "na";
export type Answers = Record<string, AnswerStatus | undefined>;

const STATUS_POINTS: Record<Exclude<AnswerStatus, "na">, number> = {
  done: 1,
  partial: 0.5,
  missing: 0,
};

const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, standard: 2 };

export function scoreAssessment(reqs: Requirement[], answers: Answers) {
  const answered = reqs.filter((r) => answers[r.id] !== undefined);
  const scored = answered.filter((r) => answers[r.id] !== "na");

  const byCategory = categories
    .map((c) => {
      const inCat = scored.filter((r) => r.category === c.id);
      return { id: c.id as CategoryId, label: c.label, percent: percentOf(inCat, answers), count: inCat.length };
    })
    .filter((c) => c.count > 0);

  const gaps = scored
    .filter((r) => answers[r.id] !== "done")
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        STATUS_POINTS[answers[a.id] as "partial" | "missing"] -
          STATUS_POINTS[answers[b.id] as "partial" | "missing"],
    );

  return {
    total: reqs.length,
    answeredCount: answered.length,
    complete: reqs.length > 0 && answered.length === reqs.length,
    percent: percentOf(scored, answers),
    byCategory,
    gaps,
    criticalGaps: gaps.filter((r) => r.priority === "critical").length,
  };
}

export function readinessBand(percent: number) {
  if (percent >= 85) return { label: "Nearly ready", tone: "good" } as const;
  if (percent >= 60) return { label: "Making progress", tone: "ok" } as const;
  if (percent >= 30) return { label: "Significant gaps", tone: "warn" } as const;
  return { label: "Early stage", tone: "bad" } as const;
}

function percentOf(reqs: Requirement[], answers: Answers) {
  if (reqs.length === 0) return 0;
  const points = reqs.reduce((sum, r) => sum + STATUS_POINTS[answers[r.id] as Exclude<AnswerStatus, "na">], 0);
  return Math.round((points / reqs.length) * 100);
}
