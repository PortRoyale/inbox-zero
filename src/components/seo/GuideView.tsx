import type { Guide } from "@/content/types";
import { PageHero } from "@/components/PageHero";
import { SheetTabs } from "@/components/SheetTabs";
import { Crumbs } from "@/components/seo/Crumbs";
import { StartPlanButton } from "@/components/seo/StartPlanButton";
import { GuideRegister, SourceTable } from "@/components/seo/Indexes";
import { paths } from "@/lib/paths";

export function GuideView({ guide, related, crumbs }: { guide: Guide; related: Guide[]; crumbs: { name: string; path: string }[] }) {
  return (
    <>
      <PageHero
        id="guide-title"
        tool="briefs"
        motif="document"
        seed={guide.slug.length * 13}
        label="Guide"
        cells={guide.craRefs.slice(0, 2)}
        above={<Crumbs items={crumbs} />}
        title={guide.title}
        lead={guide.summary}
      />
      <SheetTabs
        label="Guide sections"
        wizard
        items={[
          ...guide.sections.map((s, i) => ({
            id: `s${i + 1}`,
            label: s.heading,
            content: (
              <article className="guide-part">
                <h2 className="guide-h2">{s.heading}</h2>
                {s.body.map((p) => (
                  <p key={p.slice(0, 40)} className="guide-p">
                    {p}
                  </p>
                ))}
              </article>
            ),
          })),
          {
            id: "faq",
            label: "Questions",
            content: (
              <div className="faq-list">
                <h2 className="guide-h2">Questions</h2>
                {guide.faqs.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            ),
          },
          {
            id: "sources",
            label: "Sources and related",
            content: (
              <div className="stack-sm">
                <SourceTable sources={guide.sources} />
                {related.length > 0 && <GuideRegister title="Related guides" guides={related} />}
              </div>
            ),
          },
        ]}
        side={
          <div className="brief-cta">
            <p className="label">Free</p>
            <p className="cta-title">Turn this into your technical documentation</p>
            <p>Eight steps. Every gap becomes a dated action.</p>
            <StartPlanButton label="Start my plan" />
            <a href={paths.assessment} className="muted-link">
              Or take the 10-minute readiness check
            </a>
          </div>
        }
      />
    </>
  );
}
