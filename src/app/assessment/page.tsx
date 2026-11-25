import type { Metadata } from "next";
import { Assessment } from "@/components/Assessment";

export const metadata: Metadata = {
  title: "CRA readiness check",
  description: "A free, private self-assessment against the EU Cyber Resilience Act's essential requirements, with a prioritised action plan.",
};

export default function AssessmentPage() {
  return <Assessment />;
}
