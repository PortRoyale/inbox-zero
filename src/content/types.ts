export type Source = { label: string; url: string };

export type Country = {
  slug: string;
  name: string;
  isoCode: string;
  inEU: boolean;
  languages: string[];
  authority?: { name: string; url: string };
  localContext: string[];
  exporterNotes?: string[];
  sources: Source[];
};

export type Guide = {
  slug: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  summary: string;
  sections: { heading: string; body: string[] }[];
  faqs: { q: string; a: string }[];
  craRefs: string[];
  related: string[];
  sources: Source[];
};

export type CraClass = "default" | "important-1" | "important-2" | "critical";

export type Industry = {
  slug: string;
  name: string;
  searchName: string;
  examples: string[];
  productTypes: ("software" | "firmware" | "hardware" | "cloud")[];
  craClass: CraClass;
  classNote: string;
  standards: { name: string; note: string }[];
  topRisks: string[];
  pitfalls: string[];
  alsoRegulatedBy: string[];
  sources: Source[];
};
