import type { Metadata } from "next";
import { PlanBuilder } from "@/components/plan/PlanBuilder";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { softwareApp } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "CRA security plan builder",
  description:
    "Build your Cyber Resilience Act technical documentation in eight steps: risk assessment, essential requirements, vulnerability handling, 24-hour reporting and an action plan.",
  alternates: { canonical: "/plan/" },
};

export default function PlanPage() {
  return (
    <>
      <SiteHeader current="plan" />
      <main>
        <PlanBuilder />
        <JsonLd data={softwareApp()} />
      </main>
    </>
  );
}
