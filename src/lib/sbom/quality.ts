import type { ParsedSbom, SbomComponent } from "./parse";

export type QualityCheck = { id: string; label: string; passed: boolean; detail: string };
export type SbomQuality = { score: number; checks: QualityCheck[] };

// A per-component check passes when at least this share of components meets it.
export const QUALITY_COVERAGE_THRESHOLD = 0.95;

type Outcome = { passed: boolean; detail: string };
type CheckDef = { id: string; label: string; weight: number; run: (s: ParsedSbom) => Outcome };

function coverage(s: ParsedSbom, test: (c: SbomComponent) => boolean, what: string): Outcome {
  const total = s.components.length;
  if (total === 0) return { passed: false, detail: "No components listed" };
  const count = s.components.filter(test).length;
  const noun = total === 1 ? "component has" : "components have";
  return { passed: count / total >= QUALITY_COVERAGE_THRESHOLD, detail: `${count} of ${total} ${noun} ${what}` };
}

// Based on the NTIA minimum elements and CRA Annex I Part II(1).
// Identifiers and versions weigh most because vulnerability matching depends on them.
const CHECKS: CheckDef[] = [
  {
    id: "supplier",
    label: "Supplier names",
    weight: 2,
    run: (s) => coverage(s, (c) => !!c.supplier, "a supplier"),
  },
  {
    id: "names",
    label: "Component names",
    weight: 2,
    run: (s) => coverage(s, (c) => !!c.name.trim(), "a name"),
  },
  {
    id: "versions",
    label: "Component versions",
    weight: 3,
    run: (s) => coverage(s, (c) => !!c.version.trim(), "a version"),
  },
  {
    id: "identifiers",
    label: "Unique identifiers (purl)",
    weight: 3,
    run: (s) => coverage(s, (c) => !!c.purl, "a package URL (purl)"),
  },
  {
    id: "dependencies",
    label: "Dependencies listed",
    weight: 2,
    run: (s) => {
      const n = s.components.length;
      return n > 0
        ? { passed: true, detail: `${n} ${n === 1 ? "component" : "components"} listed` }
        : { passed: false, detail: "No components listed" };
    },
  },
  {
    id: "author",
    label: "SBOM author or tool",
    weight: 2,
    run: (s) => {
      const parts = [s.author ? `Author: ${s.author}` : "", s.tool ? `Tool: ${s.tool}` : ""].filter(Boolean);
      return parts.length ? { passed: true, detail: parts.join(". ") } : { passed: false, detail: "No author or tool recorded" };
    },
  },
  {
    id: "timestamp",
    label: "Timestamp",
    weight: 2,
    run: (s) => {
      if (!s.created) return { passed: false, detail: "No creation timestamp" };
      if (Number.isNaN(Date.parse(s.created))) return { passed: false, detail: `"${s.created}" is not a valid date` };
      return { passed: true, detail: `Created ${s.created}` };
    },
  },
  {
    id: "licences",
    label: "Licence information",
    weight: 1,
    run: (s) => coverage(s, (c) => c.licenses.length > 0, "licence information"),
  },
  {
    id: "hashes",
    label: "Component hashes",
    weight: 1,
    run: (s) => coverage(s, (c) => c.hashes > 0, "a hash"),
  },
];

export function sbomQuality(s: ParsedSbom): SbomQuality {
  let total = 0;
  let earned = 0;
  const checks = CHECKS.map((def) => {
    const outcome = def.run(s);
    total += def.weight;
    if (outcome.passed) earned += def.weight;
    return { id: def.id, label: def.label, passed: outcome.passed, detail: outcome.detail };
  });
  return { score: Math.round((100 * earned) / total), checks };
}
