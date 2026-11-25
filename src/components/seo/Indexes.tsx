import { craClassInfo } from "@/content/industries";
import type { Country, Guide, Industry } from "@/content/types";
import { SpecTable } from "@/components/structure";

const CLASS_SHORT: Record<Industry["craClass"], string> = { default: "Default", "important-1": "Class I", "important-2": "Class II", critical: "Critical" };
const SELF_SHORT: Record<string, string> = { Yes: "Yes", No: "No", "Only with harmonised standards": "With standards" };

// Structured indexes for the SEO pages. Every list of links is a register with column headers,
// never a free grid of names.

export function GuideRegister({ title, guides }: { title: string; guides: Guide[] }) {
  return (
    <section className="stack-sm">
      <h2 className="grid-title">{title}</h2>
      <SpecTable
        numbered
        rows={guides}
        rowKey={(g) => g.slug}
        cols={[
          { key: "guide", label: "Guide", head: true, width: "38%", render: (g) => <a href={`/guides/${g.slug}/`}>{g.title}</a> },
          { key: "answers", label: "What it answers", render: (g) => g.metaDescription },
          { key: "basis", label: "Basis", width: "9rem", code: true, render: (g) => g.craRefs.slice(0, 2).join("; ") },
        ]}
      />
    </section>
  );
}

export function SectorTable({ title, industries, hrefFor }: { title: string; industries: Industry[]; hrefFor: (i: Industry) => string }) {
  return (
    <section className="stack-sm">
      <h2 className="grid-title">{title}</h2>
      <SpecTable
        rows={industries}
        rowKey={(i) => i.slug}
        cols={[
          { key: "sector", label: "Sector", head: true, width: "30%", render: (i) => <a href={hrefFor(i)}>{i.name}</a> },
          { key: "examples", label: "Examples", render: (i) => i.examples.slice(0, 3).join(", ") },
          {
            key: "class",
            label: "CRA class",
            width: "9.5rem",
            render: (i) => <span className={`class-tag is-${i.craClass}`}>{CLASS_SHORT[i.craClass]}</span>,
          },
          { key: "self", label: "Self-assess", width: "9rem", code: true, render: (i) => SELF_SHORT[craClassInfo[i.craClass].selfAssess] ?? craClassInfo[i.craClass].selfAssess },
        ]}
      />
    </section>
  );
}

/** Countries grouped as EU member states and exporters, in equal cells under a group label. */
export function CountryIndex({ title, countries, hrefFor }: { title: string; countries: Country[]; hrefFor: (c: Country) => string }) {
  const groups = [
    { label: "EU member states", note: "Report via the CSIRT of your main establishment", items: countries.filter((c) => c.inEU) },
    { label: "Exporting to the EU", note: "Your EU representative or importer carries duties too", items: countries.filter((c) => !c.inEU) },
  ].filter((g) => g.items.length);
  return (
    <section className="stack-sm">
      <h2 className="grid-title">{title}</h2>
      <div className="link-index">
        {groups.map((g) => (
          <div key={g.label} className="link-index-group">
            <div className="link-index-label">
              <p className="code">{g.label}</p>
              <p className="link-index-count code">{g.items.length}</p>
              <p className="link-index-note">{g.note}</p>
            </div>
            <ul className="link-index-cells">
              {g.items.map((c) => (
                <li key={c.slug}>
                  <a href={hrefFor(c)}>
                    <span className="link-index-code code">{c.isoCode}</span>
                    <span>{c.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

const publisher = (url: string) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.endsWith("europa.eu")) return host.startsWith("eur-lex") ? "EUR-Lex" : host.startsWith("enisa") ? "ENISA" : "European Commission";
    if (host.endsWith("gov.uk") || host.endsWith("legislation.gov.uk")) return "UK Government";
    return host;
  } catch {
    return "";
  }
};

export function SourceTable({ title = "Sources", sources }: { title?: string; sources: { label: string; url: string }[] }) {
  return (
    <section className="stack-sm">
      <h2 className="grid-title">{title}</h2>
      <SpecTable
        rows={sources}
        rowKey={(s) => s.url}
        cols={[
          { key: "ref", label: "Ref", width: "4.5rem", code: true, render: (_s, i) => `S${i + 1}` },
          {
            key: "doc",
            label: "Source",
            head: true,
            render: (s) => (
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            ),
          },
          { key: "pub", label: "Publisher", width: "11rem", code: true, render: (s) => publisher(s.url) },
        ]}
      />
    </section>
  );
}
