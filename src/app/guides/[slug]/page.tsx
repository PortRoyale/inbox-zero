import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guides } from "@/content/guides";
import { SiteHeader } from "@/components/SiteHeader";
import { GuideView } from "@/components/seo/GuideView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbs, faqPage } from "@/lib/seo/jsonld";
import { revisions, site } from "@/lib/site";

type Params = { slug: string };

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.metaDescription,
    keywords: guide.keywords,
    alternates: { canonical: `/guides/${guide.slug}/` },
    openGraph: { type: "article", title: guide.title, description: guide.metaDescription },
  };
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) notFound();
  const related = guide.related.map((s) => guides.find((g) => g.slug === s)).filter((g): g is NonNullable<typeof g> => !!g);
  const crumbs = [
    { name: "Guides", path: "/guides/" },
    { name: guide.title, path: `/guides/${guide.slug}/` },
  ];
  const modified = revisions[revisions.length - 1].date;
  return (
    <>
      <SiteHeader />
      <main>
        <div className="wrap stack" data-tool="briefs">
          <GuideView guide={guide} related={related} crumbs={crumbs} />
        </div>
        <JsonLd data={breadcrumbs(crumbs)} />
        <JsonLd data={faqPage(guide.faqs)} />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.title,
            description: guide.metaDescription,
            dateModified: modified,
            author: { "@type": "Organization", name: site.name },
            mainEntityOfPage: `${site.url}/guides/${guide.slug}/`,
          }}
        />
      </main>
    </>
  );
}
