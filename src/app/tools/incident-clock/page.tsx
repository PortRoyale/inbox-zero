import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { IncidentClockTool } from "@/components/tools/Tools";

export const metadata: Metadata = {
  title: "CRA incident reporting clock: 24 h, 72 h and final report",
  description: "Every Cyber Resilience Act Article 14 deadline from the moment you became aware, with draft early warning, notification, final report and user notice.",
  alternates: { canonical: "/tools/incident-clock/" },
};

export default function Page() {
  return (
    <>
      <SiteHeader current="tools" />
      <main>
        <IncidentClockTool />
      </main>
    </>
  );
}
