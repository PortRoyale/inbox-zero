import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countries } from "@/content/countries";
import { industryBySlug } from "@/content/industries";
import { SiteHeader } from "@/components/SiteHeader";
import { BriefView } from "@/components/seo/BriefView";
import { JsonLd } from "@/components/seo/JsonLd";
import { allCombos, buildBrief } from "@/lib/seo/brief";
import { indexedCombos } from "@/lib/seo/indexing";
import { breadcrumbs } from "@/lib/seo/jsonld";

type Params = { industry: string; country: string };

export function generateStaticParams() {
  return allCombos();
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = await params;
  const industry = industryBySlug(p.industry);
  const country = countries.find((c) => c.slug === p.country);
  if (!industry || !country) return {};
  const brief = buildBrief(industry, country);
  const indexed = indexedCombos.has(`${p.industry}/${p.country}`);
  return {
    title: brief.shortTitle,
    description: brief.metaDescription,
    alternates: { canonical: `/cra/${industry.slug}/${country.slug}/` },
    robots: indexed ? undefined : { index: false, follow: true },
  };
}

export default async function ComboPage({ params }: { params: Promise<Params> }) {
  const p = await params;
  const industry = industryBySlug(p.industry);
  const country = countries.find((c) => c.slug === p.country);
  if (!industry || !country) notFound();
  const crumbs = [
    { name: "CRA", path: "/cra/" },
    { name: industry.name, path: `/cra/${industry.slug}/` },
    { name: country.name, path: `/cra/${industry.slug}/${country.slug}/` },
  ];
  return (
    <>
      <SiteHeader current="brief" />
      <main>
        <div className="wrap stack">
          <BriefView brief={buildBrief(industry, country)} crumbs={crumbs} />
        </div>
        <JsonLd data={breadcrumbs(crumbs)} />
      </main>
    </>
  );
}
