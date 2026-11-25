import type { RunChoice } from "@/components/walkthrough/Walkthrough";
import type { AnswerStatus } from "@/lib/assessment-score";

// Answers for essential-requirement questions, shared by the readiness check and the plan builder.
export const readinessChoices: RunChoice<AnswerStatus>[] = [
  { value: "done", label: "Yes", hint: "We do this and can show evidence.", keys: ["1", "y"], tone: "good" },
  { value: "partial", label: "Partly", hint: "Some of it, or not everywhere yet.", keys: ["2", "p"], tone: "partial" },
  { value: "missing", label: "No", hint: "Not yet. It becomes a fix with guidance.", keys: ["3", "n"], tone: "bad" },
  { value: "na", label: "N/A", hint: "Does not apply to this product.", keys: ["4", "a"], tone: "neutral" },
];

export function readinessFeedback(title: string, priority: string, value: AnswerStatus) {
  if (value === "done") return "Logged as met. Keep the evidence: an auditor will ask for it.";
  if (value === "partial") return `Partly met. ${title} joins your fix list at ${priority} priority.`;
  if (value === "missing") return `Gap logged at ${priority} priority. Your report explains how to close it.`;
  return "Marked not applicable. Record why in your technical file.";
}
