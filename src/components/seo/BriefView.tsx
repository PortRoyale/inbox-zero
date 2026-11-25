import { Balloon, Fcf } from "@/components/primitives";
import { StartPlanButton } from "@/components/seo/StartPlanButton";
import type { Brief } from "@/lib/seo/brief";
import { paths } from "@/lib/paths";
import { regulation } from "@/lib/site";

export function BriefView({ brief, headingLevel = 1 }: { brief: Brief; headingLevel?: 1 | 2 }) {
  const { industry, country, cls } = brief;
  const H = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="brief">
      <div className="sheet-head">
        <div>
          <Fcf keyCell="Compliance brief" cells={[regulation, country ? country.isoCode : "EU", industry ? industry.slug.replace(/-/g, " ") : "all sectors"]} />
          <H className="page-title">{brief.title}</H>
          <p className="lead">{brief.summary}</p>
        </div>
      </div>

      <div className="brief-grid">
        <div className="brief-main">
          <section>
            <h3>Your dated action plan</h3>
            <ol className="brief-steps">
              {brief.steps.map((s) => (
                <li key={s.title}>
                  <span className={`when${s.now ? " is-now" : ""}`}>{s.when}</span>
                  <div>
                    <p>
                      <strong>{s.title}.</strong> {s.body}
                    </p>
                    <p className="code muted">{s.ref}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {industry && (
            <section>
              <h3>What is different for {industry.name.toLowerCase()}</h3>
              <ul className="bullets">
                <li>{industry.classNote}</li>
                {industry.pitfalls.map((p) => (
                  <li key={p}>{p}</li>
                ))}
                {industry.alsoRegulatedBy.length > 0 && <li>Also check: {industry.alsoRegulatedBy.join("; ")}.</li>}
              </ul>
            </section>
          )}

          {industry && (
            <section>
              <h3>Risks auditors will expect you to address</h3>
              <ul className="bullets">
                {industry.topRisks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {country && (
            <section>
              <h3>{country.inEU ? `Selling in ${country.name}` : `Exporting from ${country.name} to the EU`}</h3>
              <ul className="bullets">
                {[...(country.exporterNotes ?? []), ...country.localContext].map((x) => (
                  <li key={x}>{x}</li>
                ))}
                {country.inEU && <li>Official languages for user information: {country.languages.join(", ")}.</li>}
                {country.authority && (
                  <li>
                    National cybersecurity authority:{" "}
                    <a href={country.authority.url} target="_blank" rel="noreferrer">
                      {country.authority.name}
                    </a>
                    .
                  </li>
                )}
              </ul>
            </section>
          )}

          <section>
            <h3>Critical requirements to cover first</h3>
            <ol className="link-list">
              {brief.checklist.map((r, i) => (
                <li key={r.id} className="row">
                  <Balloon>{i + 1}</Balloon>
                  <span>
                    <strong>{r.title}</strong> <span className="code muted">{r.craRef}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="faq-list">
            <h3>Questions</h3>
            {brief.faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        </div>

        <aside className="brief-aside">
          {cls && (
            <dl className="tblock">
              <div>
                <dt>Product category</dt>
                <dd>{cls.label}</dd>
              </div>
              <div>
                <dt>Self-assessment</dt>
                <dd>{cls.selfAssess}</dd>
              </div>
              <div>
                <dt>Reporting</dt>
                <dd>24 h · 72 h · final report</dd>
              </div>
              <div>
                <dt>Full application</dt>
                <dd>11 Dec 2027</dd>
              </div>
            </dl>
          )}
          {industry && (
            <div className="tblock-list">
              <p className="label">Standards to look at</p>
              <ul className="bullets">
                {industry.standards.map((s) => (
                  <li key={s.name}>
                    <strong>{s.name}</strong>: {s.note}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="brief-cta">
            <p className="label">Free</p>
            <h3>Build the security plan for this product</h3>
            <p>Eight steps, preset for {industry ? industry.name.toLowerCase() : "your sector"}. Produces the risk assessment, requirement evidence and a dated action plan.</p>
            <StartPlanButton industry={industry?.slug} />
            <a href={paths.assessment} className="muted-link">
              Or take the 10-minute readiness check
            </a>
          </div>
          {(industry?.sources.length || country?.sources.length) && (
            <div className="sources">
              <p className="label">Sources</p>
              <ul>
                {dedupeSources([...(industry?.sources ?? []), ...(country?.sources ?? [])]).map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function dedupeSources(sources: { label: string; url: string }[]) {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = s.url.includes("2024/2847") || s.label.includes("2024/2847") ? "cra-text" : s.url.replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
