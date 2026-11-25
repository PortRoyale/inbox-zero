import type { Guide } from "@/content/types";
import { Fcf } from "@/components/primitives";
import { StartPlanButton } from "@/components/seo/StartPlanButton";
import { paths } from "@/lib/paths";

export function GuideView({ guide, related }: { guide: Guide; related: Guide[] }) {
  return (
    <article className="brief">
      <div className="sheet-head">
        <div>
          <Fcf keyCell="Guide" cells={guide.craRefs.slice(0, 3)} />
          <h1 className="page-title">{guide.title}</h1>
          <p className="lead">{guide.summary}</p>
        </div>
      </div>
      <div className="brief-grid">
        <div className="brief-main">
          {guide.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="guide-h2">{s.heading}</h2>
              {s.body.map((p) => (
                <p key={p.slice(0, 40)} className="guide-p">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <section className="faq-list">
            <h2 className="guide-h2">Questions</h2>
            {guide.faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        </div>
        <aside className="brief-aside">
          <div className="brief-cta">
            <p className="label">Free</p>
            <h3>Turn this into your technical documentation</h3>
            <p>The plan builder walks you through it in eight steps and keeps every gap visible as a dated action.</p>
            <StartPlanButton />
            <a href={paths.assessment} className="muted-link">
              Or take the 10-minute readiness check
            </a>
          </div>
          {related.length > 0 && (
            <div className="stack-sm">
              <p className="label">Related guides</p>
              <ul className="bullets">
                {related.map((r) => (
                  <li key={r.slug}>
                    <a href={`/guides/${r.slug}/`}>{r.title}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="sources">
            <p className="label">Sources</p>
            <ul>
              {guide.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </article>
  );
}
