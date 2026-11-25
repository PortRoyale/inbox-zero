import { PageHero } from "@/components/PageHero";
import { Balloon } from "@/components/primitives";
import { SheetTabs, type SheetTab } from "@/components/SheetTabs";
import { Crumbs } from "@/components/seo/Crumbs";
import { StartPlanButton } from "@/components/seo/StartPlanButton";
import type { Brief } from "@/lib/seo/brief";
import { paths } from "@/lib/paths";
import { regulation } from "@/lib/site";

export function BriefView({
  brief,
  crumbs,
  extraTabs = [],
  embedded = false,
}: {
  brief: Brief;
  crumbs?: { name: string; path: string }[];
  extraTabs?: SheetTab[];
  embedded?: boolean;
}) {
  const { industry, country, cls } = brief;
  const facts = cls && (
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
        <dt>Full application</dt>
        <dd>11 Dec 2027</dd>
      </div>
    </dl>
  );

  const tabs: SheetTab[] = [
    {
      id: "plan",
      label: "Dated action plan",
      content: (
        <>
          {embedded ? (
            <>
              <h2>{brief.title}</h2>
              <p className="lead">{brief.summary}</p>
            </>
          ) : (
            <h2>Your dated action plan</h2>
          )}
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
        </>
      ),
    },
    ...(industry
      ? [
          {
            id: "sector",
            label: industry.name,
            content: (
              <>
                <h2>What is different for {industry.name.toLowerCase()}</h2>
                <ul className="bullets">
                  <li>{industry.classNote}</li>
                  {industry.pitfalls.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                  {industry.alsoRegulatedBy.length > 0 && <li>Also check: {industry.alsoRegulatedBy.join("; ")}.</li>}
                </ul>
                <h3>Risks auditors will expect you to address</h3>
                <ul className="bullets">
                  {industry.topRisks.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <h3>Standards to look at</h3>
                <ul className="bullets">
                  {industry.standards.map((s) => (
                    <li key={s.name}>
                      <strong>{s.name}</strong>: {s.note}
                    </li>
                  ))}
                </ul>
              </>
            ),
          },
        ]
      : []),
    ...(country
      ? [
          {
            id: "country",
            label: country.inEU ? `Selling in ${country.name}` : `Exporting from ${country.name}`,
            content: (
              <>
                <h2>{country.inEU ? `Selling in ${country.name}` : `Exporting from ${country.name} to the EU`}</h2>
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
              </>
            ),
          },
        ]
      : []),
    {
      id: "requirements",
      label: "First requirements",
      content: (
        <>
          <h2>Critical requirements to cover first</h2>
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
        </>
      ),
    },
    {
      id: "faq",
      label: "Questions",
      content: (
        <div className="faq-list">
          <h2>Questions</h2>
          {brief.faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      ),
    },
    ...extraTabs,
    {
      id: "sources",
      label: "Sources",
      content: (
        <div className="sources">
          <h2>Sources</h2>
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
      ),
    },
  ];

  const cta = (
    <div className="brief-cta">
      <p className="label">Free</p>
      <h3>Build the security plan for this product</h3>
      <p>Eight steps, preset for {industry ? industry.name.toLowerCase() : "your sector"}.</p>
      <StartPlanButton industry={industry?.slug} />
      <a href={paths.assessment} className="muted-link">
        Or take the 10-minute readiness check
      </a>
    </div>
  );

  return (
    <>
      {!embedded && (
        <PageHero
          id="brief-title"
          motif={country && !industry ? "globe" : "device"}
          seed={seedFrom(`${industry?.slug ?? ""}${country?.slug ?? ""}`)}
          label="Compliance brief"
          cells={[regulation, country ? country.isoCode : "EU"]}
          above={crumbs && <Crumbs items={crumbs} />}
          title={brief.title}
          lead={brief.summary}
          aside={facts}
        />
      )}
      <SheetTabs
        label="Brief sections"
        items={tabs}
        side={
          <>
            {embedded && facts}
            {cta}
          </>
        }
      />
    </>
  );
}

function seedFrom(text: string) {
  return [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
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
