import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countries } from "@/content/countries";
import { guides } from "@/content/guides";
import { industries, industryBySlug } from "@/content/industries";
import { SiteHeader } from "@/components/SiteHeader";
import { BriefView } from "@/components/seo/BriefView";
import { JsonLd } from "@/components/seo/JsonLd";
import { CountryIndex, GuideRegister } from "@/components/seo/Indexes";
import { buildBrief } from "@/lib/seo/brief";
import { breadcrumbs, faqPage } from "@/lib/seo/jsonld";

type Params = { industry: string };

export function generateStaticParams() {
  return industries.map((i) => ({ industry: i.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const industry = industryBySlug((await params).industry);
  if (!industry) return {};
  const brief = buildBrief(industry);
  return { title: brief.shortTitle, description: brief.metaDescription, alternates: { canonical: `/cra/${industry.slug}/` } };
}

export default async function IndustryPage({ params }: { params: Promise<Params> }) {
  const industry = industryBySlug((await params).industry);
  if (!industry) notFound();
  const brief = buildBrief(industry);
  const crumbs = [
    { name: "CRA", path: "/cra/" },
    { name: industry.name, path: `/cra/${industry.slug}/` },
  ];
  return (
    <>
      <SiteHeader current="brief" />
      <main>
        <div className="wrap stack" data-tool="briefs">
          <BriefView
            brief={brief}
            crumbs={crumbs}
            extraTabs={[
              {
                id: "countries",
                label: "Your country",
                content: <CountryIndex title={`${industry.name}: pick your country`} countries={countries} hrefFor={(c) => `/cra/${industry.slug}/${c.slug}/`} />,
              },
              { id: "guides", label: "Guides", content: <GuideRegister title="Guides" guides={guides} /> },
            ]}
          />
        </div>
        <JsonLd data={breadcrumbs(crumbs)} />
        <JsonLd data={faqPage(brief.faqs)} />
      </main>
    </>
  );
}
