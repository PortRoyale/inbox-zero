import type { Metadata } from "next";
import { countries } from "@/content/countries";
import { guides } from "@/content/guides";
import { industries } from "@/content/industries";
import { SiteHeader } from "@/components/SiteHeader";
import { SheetTabs } from "@/components/SheetTabs";
import { BriefExplorer } from "@/components/seo/BriefExplorer";
import { CountryIndex, GuideRegister, SectorTable } from "@/components/seo/Indexes";

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
        <div className="wrap stack stack-tight" data-tool="briefs">
          <SheetTabs
            label="Browse all briefs"
            items={[
              {
                id: "sectors",
                label: "All sectors",
                content: <SectorTable title="By sector" industries={industries} hrefFor={(i) => `/cra/${i.slug}/`} />,
              },
              {
                id: "countries",
                label: "All countries",
                content: <CountryIndex title="By country" countries={countries} hrefFor={(c) => `/cra/countries/${c.slug}/`} />,
              },
              { id: "guides", label: "All guides", content: <GuideRegister title="Guides" guides={guides} /> },
            ]}
          />
        </div>
      </main>
    </>
  );
}
