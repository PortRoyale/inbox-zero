import { PageHero } from "@/components/PageHero";
import { SheetTabs, type SheetTab } from "@/components/SheetTabs";
import { SpecTable } from "@/components/structure";
import { SourceTable } from "@/components/seo/Indexes";
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
          <SpecTable
            className="brief-plan"
            rows={brief.steps}
            rowKey={(st) => st.title}
            rowClass={(st) => (st.now ? "is-now" : undefined)}
            cols={[
              { key: "when", label: "When", width: "9rem", code: true, render: (st) => <span className={`when${st.now ? " is-now" : ""}`}>{st.when}</span> },
              {
                key: "action",
                label: "Action",
                head: true,
                render: (st) => (
                  <>
                    <span className="cell-title">{st.title}</span>
                    <span className="cell-body">{st.body}</span>
                  </>
                ),
              },
              { key: "basis", label: "Basis", width: "9.5rem", code: true, render: (st) => st.ref },
            ]}
          />
        </>
      ),
    },
    ...(industry
      ? [
          {
            id: "sector",
            label: "Sector specifics",
            content: (
              <>
                <h2>What is different for {industry.name.toLowerCase()}</h2>
                <SpecTable
                  rows={[
                    { topic: "Classification", detail: industry.classNote },
                    ...industry.pitfalls.map((p, i) => ({ topic: i === 0 ? "Watch out for" : "", detail: p })),
                    ...(industry.alsoRegulatedBy.length ? [{ topic: "Also check", detail: `${industry.alsoRegulatedBy.join("; ")}.` }] : []),
                  ]}
                  rowKey={(r) => r.detail.slice(0, 40)}
                  cols={[
                    { key: "topic", label: "Topic", width: "10rem", code: true, render: (r) => r.topic },
                    { key: "detail", label: "Detail", render: (r) => r.detail },
                  ]}
                />
                <h3>Risks auditors will expect you to address</h3>
                <SpecTable
                  numbered
                  rows={industry.topRisks}
                  rowKey={(r) => r}
                  cols={[
                    { key: "risk", label: "Risk", head: true, render: (r) => r },
                  ]}
                />
                <h3>Standards to look at</h3>
                <SpecTable
                  rows={industry.standards}
                  rowKey={(st) => st.name}
                  cols={[
                    { key: "std", label: "Standard", width: "13rem", code: true, render: (st) => st.name },
                    { key: "note", label: "What it covers", render: (st) => st.note },
                  ]}
                />
              </>
            ),
          },
        ]
      : []),
    ...(country
      ? [
          {
            id: "country",
            label: country.inEU ? `Selling in ${country.name}` : "Exporting to the EU",
            content: (
              <>
                <h2>{country.inEU ? `Selling in ${country.name}` : `Exporting from ${country.name} to the EU`}</h2>
                <SpecTable
                  rows={[
                    ...(country.inEU ? [{ topic: "User information", detail: <>Official languages: {country.languages.join(", ")}.</> }] : []),
                    ...(country.authority
                      ? [
                          {
                            topic: "Authority",
                            detail: (
                              <a href={country.authority.url} target="_blank" rel="noreferrer">
                                {country.authority.name}
                              </a>
                            ),
                          },
                        ]
                      : []),
                    ...[...(country.exporterNotes ?? []), ...country.localContext].map((x, i) => ({ topic: i === 0 ? "Notes" : "", detail: <>{x}</> })),
                  ]}
                  rowKey={(_r, i) => String(i)}
                  cols={[
                    { key: "topic", label: "Topic", width: "10rem", code: true, render: (r) => r.topic },
                    { key: "detail", label: "Detail", render: (r) => r.detail },
                  ]}
                />
              </>
            ),
          },
        ]
      : []),
    ...extraTabs,
    {
      id: "requirements",
      label: "First requirements",
      content: (
        <>
          <h2>Critical requirements to cover first</h2>
          <SpecTable
            numbered
            rows={brief.checklist}
            rowKey={(r) => r.id}
            cols={[
              { key: "req", label: "Requirement", head: true, render: (r) => r.title },
              { key: "basis", label: "Basis", width: "14rem", code: true, render: (r) => r.craRef },
            ]}
          />
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
    {
      id: "sources",
      label: "Sources",
      content: (
        <SourceTable sources={dedupeSources([...(industry?.sources ?? []), ...(country?.sources ?? [])])} />
      ),
    },
  ];

  const cta = (
    <div className="brief-cta">
      <p className="label">Free</p>
      <p className="cta-title">Build the security plan for this product</p>
      <p>Eight steps, preset for {industry ? industry.name.toLowerCase() : "your sector"}.</p>
      <StartPlanButton industry={industry?.slug} label="Start my plan" />
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
          tool="briefs"
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
