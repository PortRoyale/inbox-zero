import type { Metadata } from "next";
import { guides } from "@/content/guides";
import { SiteHeader } from "@/components/SiteHeader";
import { Fcf } from "@/components/primitives";
import { LinkGrid } from "@/components/seo/LinkGrid";

export const metadata: Metadata = {
  title: "Cyber Resilience Act guides",
  description: "Plain-English guides to the EU Cyber Resilience Act: deadlines, 24-hour reporting, SBOMs, technical documentation, CE marking, fines and funding.",
  alternates: { canonical: "/guides/" },
};

export default function GuidesIndex() {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="wrap stack">
          <section className="sheet stack-sm">
            <Fcf keyCell="Guides" cells={[`${guides.length} topics`]} />
            <h1 className="page-title">Cyber Resilience Act guides</h1>
            <p className="lead">Plain answers to what product teams search for, each with sources and a next step.</p>
            <LinkGrid title="All guides" links={guides.map((g) => ({ href: `/guides/${g.slug}/`, label: g.title }))} />
          </section>
        </div>
      </main>
    </>
  );
}
