import type { Metadata } from "next";
import { countries } from "@/content/countries";
import { guides } from "@/content/guides";
import { craClassInfo, industries } from "@/content/industries";
import { SiteHeader } from "@/components/SiteHeader";
import { BriefExplorer } from "@/components/seo/BriefExplorer";
import { LinkGrid } from "@/components/seo/LinkGrid";

export const metadata: Metadata = {
  title: "CRA compliance by sector and country",
  description: "Cyber Resilience Act requirements, deadlines and reporting for your sector and country. Generate a dated action plan and start your security plan free.",
  alternates: { canonical: "/cra/" },
};

export default function CraHub() {
  return (
    <>
      <SiteHeader current="brief" />
      <main>
        <BriefExplorer />
        <div className="wrap stack">
          <section className="sheet stack-sm">
            <LinkGrid title="By sector" links={industries.map((i) => ({ href: `/cra/${i.slug}/`, label: i.name, meta: craClassInfo[i.craClass].label.replace("Important product, ", "") }))} />
            <LinkGrid title="By country" links={countries.map((c) => ({ href: `/cra/countries/${c.slug}/`, label: c.name, meta: c.inEU ? "EU" : "Exporter" }))} />
            <LinkGrid title="Guides" links={guides.map((g) => ({ href: `/guides/${g.slug}/`, label: g.title }))} />
          </section>
        </div>
      </main>
    </>
  );
}
