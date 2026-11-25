import type { scoreAssessment } from "@/lib/assessment-score";
import type { evaluateReleaseGate } from "@/lib/release-gate";
import { regulation, site } from "@/lib/site";

const OUTCOME_TEXT = {
  pass: "PASS",
  blocked: "BLOCKED",
  required: "REQUIRED",
  "not-required": "NOT REQUIRED",
  "n/a": "N/A",
  incomplete: "INCOMPLETE",
} as const;

export function assessmentReportText({
  productName,
  productTypes,
  date,
  score,
  itemIds,
}: {
  productName: string;
  productTypes: string[];
  date: string;
  score: ReturnType<typeof scoreAssessment>;
  itemIds: Record<string, string>;
}) {
  const lines = [
    `CRA READINESS REPORT: ${productName || "Unnamed product"}`,
    `${productTypes.join(", ")} | ${date} | ${regulation}`,
    "",
    `Readiness score: ${score.percent}%`,
    `Answered: ${score.answeredCount}/${score.total}`,
    `Open gaps: ${score.gaps.length} (${score.criticalGaps} critical)`,
    "",
    "BY AREA",
    ...score.byCategory.map((c) => `- ${c.label}: ${c.percent}%`),
    "",
    "REDLINE LIST (highest priority first)",
    ...(score.gaps.length === 0
      ? ["- None among answered items"]
      : score.gaps.map((g, i) => `${i + 1}. [${itemIds[g.id]}] ${g.title} (${g.priority}, ${g.craRef})\n   ${g.guidance}`)),
    "",
    `Self-assessment made with ${site.name}. Guidance only; not legal advice or a conformity assessment.`,
  ];
  return lines.join("\n");
}

export function releaseRecordText({
  release,
  date,
  result,
  yesTriggers,
}: {
  release: { product: string; version: string; ticket: string };
  date: string;
  result: ReturnType<typeof evaluateReleaseGate>;
  yesTriggers: { id: string; text: string; note?: string }[];
}) {
  const lines = [
    `RELEASE SECURITY RECORD: ${release.product || "Unnamed product"} ${release.version}`.trim(),
    `Change: ${release.ticket || "n/a"} | ${date}`,
    "",
    "CHANGED ATTACK SURFACE",
    ...(yesTriggers.length === 0
      ? ["- None"]
      : yesTriggers.map((t) => `- ${t.id} ${t.text}${t.note ? `: ${t.note}` : ""}`)),
    "",
    "REQUIRED TESTING",
    ...result.results.map((r) => `- ${r.title}: ${OUTCOME_TEXT[r.outcome]}. ${r.reason}`),
    "",
    `Generated with ${site.name}.`,
  ];
  return lines.join("\n");
}
