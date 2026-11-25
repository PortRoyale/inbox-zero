import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countries } from "@/content/countries";
import { industries } from "@/content/industries";
import { SiteHeader } from "@/components/SiteHeader";
import { BriefView } from "@/components/seo/BriefView";
import { JsonLd } from "@/components/seo/JsonLd";
import { SectorTable } from "@/components/seo/Indexes";
import { buildBrief } from "@/lib/seo/brief";
import { breadcrumbs, faqPage } from "@/lib/seo/jsonld";

type Params = { country: string };

export function generateStaticParams() {
  return countries.map((c) => ({ country: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const slug = (await params).country;
  const country = countries.find((c) => c.slug === slug);
  if (!country) return {};
  const brief = buildBrief(undefined, country);
  return { title: brief.shortTitle, description: brief.metaDescription, alternates: { canonical: `/cra/countries/${country.slug}/` } };
}

export default async function CountryPage({ params }: { params: Promise<Params> }) {
  const slug = (await params).country;
  const country = countries.find((c) => c.slug === slug);
  if (!country) notFound();
  const brief = buildBrief(undefined, country);
  const crumbs = [
    { name: "CRA", path: "/cra/" },
    { name: country.name, path: `/cra/countries/${country.slug}/` },
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
                id: "sectors",
                label: "Your sector",
                content: <SectorTable title={`By sector in ${country.name}`} industries={industries} hrefFor={(i) => `/cra/${i.slug}/${country.slug}/`} />,
              },
            ]}
          />
        </div>
        <JsonLd data={breadcrumbs(crumbs)} />
        <JsonLd data={faqPage(brief.faqs)} />
      </main>
    </>
  );
}
