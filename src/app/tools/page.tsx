import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { ToolsHub } from "@/components/InfoPages";

export const metadata: Metadata = {
  title: "Free CRA tools",
  description: "Free Cyber Resilience Act tools: readiness check, release gate, SBOM check, incident reporting clock, security plan builder and sector briefs.",
  alternates: { canonical: "/tools/" },
};

export default function Page() {
  return (
    <>
      <SiteHeader current="tools" />
      <main>
        <ToolsHub />
      </main>
    </>
  );
}
