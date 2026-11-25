import type { Metadata } from "next";
import { guides } from "@/content/guides";
import { SiteHeader } from "@/components/SiteHeader";
import { PageHero } from "@/components/PageHero";
import { GuideRegister } from "@/components/seo/Indexes";

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
        <div className="wrap stack" data-tool="briefs">
          <PageHero
            id="guides-title"
            tool="briefs"
            motif="document"
            seed={5}
            label="Guides"
            cells={[`${guides.length} topics`]}
            title="Cyber Resilience Act guides"
            lead="Plain answers to what product teams search for, each with sources and a next step."
          />
          <section className="sheet">
            <GuideRegister title="All guides" guides={guides} />
          </section>
        </div>
      </main>
    </>
  );
}
