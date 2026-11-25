import { countries } from "@/content/countries";
import { craClassInfo, industries } from "@/content/industries";
import type { Country, Industry } from "@/content/types";
import { requirementsFor } from "@/lib/cra-requirements";

export type BriefStep = { when: string; now?: boolean; title: string; body: string; ref: string };

export function buildBrief(industry?: Industry, country?: Country) {
  const who = industry ? industry.searchName : "product makers";
  const where = country ? (country.inEU ? `in ${country.name}` : `exporting from ${country.name}`) : "";
  const title = `EU Cyber Resilience Act for ${who}${where ? ` ${where}` : ""}`;
  const shortTitle =
    industry && country
      ? `CRA for ${industry.name} ${country.inEU ? "in" : "from"} ${country.name}`
      : industry
        ? `CRA Compliance for ${industry.name}: Class, Deadlines, Plan`
        : country
          ? country.inEU
            ? `Cyber Resilience Act in ${country.name}: Deadlines & Reporting`
            : `Exporting to the EU from ${country.name}: CRA Guide`
          : "CRA compliance brief";
  const cls = industry ? craClassInfo[industry.craClass] : undefined;

  const summaryParts = [
    `The Cyber Resilience Act applies to ${industry ? industry.name.toLowerCase() : "connected products and software"} placed on the EU market${country && !country.inEU ? `, including those made in ${country.name}` : ""}.`,
    "Vulnerability and incident reporting has applied since 11 September 2026; all other obligations apply from 11 December 2027.",
  ];

  const steps: BriefStep[] = [
    {
      when: "Now",
      now: true,
      title: "Be ready to report within 24 hours",
      body: `Name a reporting owner and backup, register on ENISA's Single Reporting Platform, and publish a security contact. ${
        country?.inEU
          ? `Reports from a manufacturer established in ${country.name} route to the CSIRT designated as coordinator there.`
          : country
            ? "Without an EU establishment, reports route to the coordinating CSIRT of your authorised representative's member state, then your importer's, then your distributor's."
            : "Reports route to the coordinating CSIRT of the member state of your main establishment."
      }`,
      ref: "Art. 14",
    },
    ...(country?.inEU
      ? [
          {
            when: "By 29 Jan 2027",
            now: true,
            title: "Apply for EU co-funding",
            body: "The SECURE open call co-funds 50% of CRA compliance projects for eligible EU SMEs, up to €30,000 per project. Check eligibility on the SECURE site.",
            ref: "SECURE call 2",
          },
        ]
      : []),
    {
      when: "Next 90 days",
      title: "Write the risk assessment and security plan",
      body: "Document intended purpose, architecture, risks and how you meet each essential requirement. Generate an SBOM for every release.",
      ref: "Art. 13; Annex VII",
    },
    ...(industry && industry.craClass !== "default"
      ? [
          {
            when: "Before mid-2027",
            title: "Book conformity assessment capacity",
            body: `${cls!.route} Notified-body provisions have applied since 11 June 2026, and capacity will tighten close to the deadline.`,
            ref: "Art. 32",
          },
        ]
      : []),
    ...(country && !country.inEU
      ? [
          {
            when: "Before placing on market",
            title: "Set up your EU route to market",
            body: "Agree obligations with your importer and decide whether to appoint an authorised representative by written mandate. Importers must check CE marking and documentation.",
            ref: "Art. 18–19",
          },
        ]
      : []),
    {
      when: "By 11 Dec 2027",
      title: "Technical file, declaration and CE marking",
      body: "Products placed on the market from this date need the technical documentation, an EU declaration of conformity and CE marking under the CRA.",
      ref: "Art. 28–31",
    },
  ];

  const checklist = (industry ? requirementsFor(industry.productTypes) : requirementsFor(["software", "firmware", "hardware", "cloud"]))
    .filter((r) => r.priority === "critical")
    .slice(0, 8);

  const faqs = [
    {
      q: `Does the CRA apply to ${industry ? industry.name.toLowerCase() : "my product"}${country && !country.inEU ? ` made in ${country.name}` : ""}?`,
      a: `Yes, if the product has digital elements and is made available on the EU market. ${industry ? industry.classNote : ""}${
        country && !country.inEU ? ` Where you are based does not matter; placing on the EU market does.` : ""
      }`,
    },
    {
      q: "What do we have to do first?",
      a: "Make sure you can report actively exploited vulnerabilities within 24 hours, because that obligation already applies. Then write your risk assessment and security plan.",
    },
    ...(country
      ? [
          {
            q: `Which language must user instructions be in${country.inEU ? ` in ${country.name}` : ""}?`,
            a: country.inEU
              ? `Member states set the language for user information. Expect ${country.languages.join(" or ")} for ${country.name}.`
              : "The language is set by each member state where you sell. Plan for the official languages of your target markets.",
          },
        ]
      : []),
    {
      q: "Is self-assessment allowed?",
      a: cls ? `${cls.label}: self-assessment ${cls.selfAssess.toLowerCase() === "yes" ? "is allowed" : cls.selfAssess === "No" ? "is not allowed" : "is allowed only with harmonised standards"}. ${cls.route}` : "It depends on the product category. Default products can self-assess; important and critical products have stricter routes.",
    },
  ];

  return {
    title,
    shortTitle,
    metaDescription: `${industry ? `${industry.name}: ` : ""}what the EU Cyber Resilience Act requires${where ? ` ${where}` : ""}, the deadlines, where to report, and a dated action plan. Free security plan builder.`.slice(0, 158),
    summary: summaryParts.filter(Boolean).join(" "),
    industry,
    country,
    cls,
    steps,
    checklist,
    faqs,
  };
}

export type Brief = ReturnType<typeof buildBrief>;

export function allCombos() {
  return industries.flatMap((i) => countries.map((c) => ({ industry: i.slug, country: c.slug })));
}
