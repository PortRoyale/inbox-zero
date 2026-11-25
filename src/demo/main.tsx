import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Assessment } from "@/components/Assessment";
import { Home } from "@/components/Home";
import { ReleaseGate } from "@/components/ReleaseGate";
import { Pricing } from "@/components/sales/Pricing";
import { PlanBuilder } from "@/components/plan/PlanBuilder";
import { BriefExplorer } from "@/components/seo/BriefExplorer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LegalPage, ToolsHub, TrustCentre } from "@/components/InfoPages";
import { IncidentClockTool, SbomCheck } from "@/components/tools/Tools";
import type { View } from "@/lib/paths";

const VIEWS: View[] = ["assessment", "release-gate", "plan", "brief", "pricing", "tools", "sbom-check", "incident-clock", "security", "terms", "privacy"];

function viewFromHash(): View {
  const hash = location.hash.slice(1);
  return VIEWS.includes(hash as View) ? (hash as View) : "home";
}

function App() {
  const [view, setView] = useState<View>(viewFromHash);

  useEffect(() => {
    const onHash = () => {
      const next = viewFromHash();
      setView(next);
      const anchor = location.hash.slice(1);
      requestAnimationFrame(() => {
        const target = next === "home" && anchor ? document.getElementById(anchor) : null;
        if (target) target.scrollIntoView();
        else window.scrollTo(0, 0);
      });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <SiteHeader current={view} />
      <main id="top">
        {view === "assessment" && <Assessment />}
        {view === "release-gate" && <ReleaseGate />}
        {view === "plan" && <PlanBuilder />}
        {view === "brief" && <BriefExplorer />}
        {view === "pricing" && <Pricing />}
        {view === "tools" && <ToolsHub />}
        {view === "sbom-check" && <SbomCheck />}
        {view === "incident-clock" && <IncidentClockTool />}
        {view === "security" && <TrustCentre />}
        {view === "terms" && <LegalPage kind="terms" />}
        {view === "privacy" && <LegalPage kind="privacy" />}
        {view === "home" && <Home />}
      </main>
      <SiteFooter />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
