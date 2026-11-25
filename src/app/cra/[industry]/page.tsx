import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countries } from "@/content/countries";
import { guides } from "@/content/guides";
import { industries, industryBySlug } from "@/content/industries";
import { SiteHeader } from "@/components/SiteHeader";
import { BriefView } from "@/components/seo/BriefView";
import { Crumbs } from "@/components/seo/Crumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { LinkGrid } from "@/components/seo/LinkGrid";
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
        <div className="wrap stack">
          <section className="sheet">
            <Crumbs items={crumbs} />
            <BriefView brief={brief} />
          </section>
          <section className="sheet stack-sm">
            <LinkGrid
              title={`${industry.name}: your country`}
              links={countries.map((c) => ({ href: `/cra/${industry.slug}/${c.slug}/`, label: c.name, meta: c.inEU ? "EU" : "Exporter" }))}
            />
            <LinkGrid title="Guides" links={guides.slice(0, 6).map((g) => ({ href: `/guides/${g.slug}/`, label: g.title }))} />
          </section>
        </div>
        <JsonLd data={breadcrumbs(crumbs)} />
        <JsonLd data={faqPage(brief.faqs)} />
      </main>
    </>
  );
}
