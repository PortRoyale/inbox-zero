import { get, getArr, getStr, isObject } from "./json";

export type Severity = "critical" | "high" | "medium" | "low" | "none" | "unknown";

// Most to least urgent. Unknown sits below low and above none.
export const SEVERITY_ORDER: readonly Severity[] = ["critical", "high", "medium", "low", "unknown", "none"];

const BASE_WEIGHTS = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  PR: { N: 0.85, L: 0.62, H: 0.27 },
  UI: { N: 0.85, R: 0.62 },
  S: { U: 0, C: 0 },
  C: { H: 0.56, L: 0.22, N: 0 },
  I: { H: 0.56, L: 0.22, N: 0 },
  A: { H: 0.56, L: 0.22, N: 0 },
} as const;

// Privileges Required weights when scope is changed.
const PR_CHANGED = { N: 0.85, L: 0.68, H: 0.5 } as const;

// Temporal and environmental metrics are allowed in the vector but do not affect the base score.
const OTHER_METRICS: Record<string, readonly string[]> = {
  E: ["X", "U", "P", "F", "H"],
  RL: ["X", "O", "T", "W", "U"],
  RC: ["X", "U", "R", "C"],
  CR: ["X", "L", "M", "H"],
  IR: ["X", "L", "M", "H"],
  AR: ["X", "L", "M", "H"],
  MAV: ["X", "N", "A", "L", "P"],
  MAC: ["X", "L", "H"],
  MPR: ["X", "N", "L", "H"],
  MUI: ["X", "N", "R"],
  MS: ["X", "U", "C"],
  MC: ["X", "N", "L", "H"],
  MI: ["X", "N", "L", "H"],
  MA: ["X", "N", "L", "H"],
};

type BaseKey = keyof typeof BASE_WEIGHTS;
const BASE_KEYS = Object.keys(BASE_WEIGHTS) as BaseKey[];

// Roundup from CVSS v3.1 Appendix A: smallest one-decimal number >= input, avoiding float error.
export function cvssRoundup(input: number): number {
  const intInput = Math.round(input * 100000);
  if (intInput % 10000 === 0) return intInput / 100000;
  return (Math.floor(intInput / 10000) + 1) / 10;
}

function weight(key: BaseKey, value: string): number | undefined {
  const table: Record<string, number> = BASE_WEIGHTS[key];
  return Object.hasOwn(table, value) ? table[value] : undefined;
}

// CVSS v3.1 base score. Accepts "CVSS:3.1/", "CVSS:3.0/" or no prefix. Returns null when invalid.
export function cvss31BaseScore(vector: string): number | null {
  if (typeof vector !== "string") return null;
  const parts = vector.trim().split("/");
  if (parts[0]?.startsWith("CVSS:")) {
    if (parts[0] !== "CVSS:3.1" && parts[0] !== "CVSS:3.0") return null;
    parts.shift();
  }

  const base = new Map<BaseKey, string>();
  const seen = new Set<string>();
  for (const part of parts) {
    const match = /^([A-Z]+):([A-Z])$/.exec(part);
    if (!match) return null;
    const [, key, value] = match;
    if (seen.has(key)) return null;
    seen.add(key);
    if ((BASE_KEYS as string[]).includes(key)) {
      if (weight(key as BaseKey, value) === undefined) return null;
      base.set(key as BaseKey, value);
    } else if (!Object.hasOwn(OTHER_METRICS, key) || !OTHER_METRICS[key].includes(value)) {
      return null;
    }
  }
  if (base.size !== BASE_KEYS.length) return null;

  const m = (key: BaseKey) => base.get(key) as string;
  const changed = m("S") === "C";
  const iss = 1 - (1 - weight("C", m("C"))!) * (1 - weight("I", m("I"))!) * (1 - weight("A", m("A"))!);
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15) : 6.42 * iss;
  const pr = changed ? PR_CHANGED[m("PR") as keyof typeof PR_CHANGED] : weight("PR", m("PR"))!;
  const exploitability = 8.22 * weight("AV", m("AV"))! * weight("AC", m("AC"))! * pr * weight("UI", m("UI"))!;

  if (impact <= 0) return 0;
  return changed
    ? cvssRoundup(Math.min(1.08 * (impact + exploitability), 10))
    : cvssRoundup(Math.min(impact + exploitability, 10));
}

// CVSS v3 qualitative severity rating scale.
export function severityFromScore(score: number | null): Severity {
  if (score === null || typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 10) return "unknown";
  if (score === 0) return "none";
  if (score < 4) return "low";
  if (score < 7) return "medium";
  if (score < 9) return "high";
  return "critical";
}

const LABELS: Record<string, Severity> = {
  CRITICAL: "critical",
  HIGH: "high",
  IMPORTANT: "high",
  MODERATE: "medium",
  MEDIUM: "medium",
  LOW: "low",
  NEGLIGIBLE: "low",
  NONE: "none",
};

function bestCvss(entries: unknown[]): { score: number; vector: string } | null {
  let best: { score: number; vector: string } | null = null;
  for (const entry of entries) {
    if (getStr(entry, "type") !== "CVSS_V3") continue;
    const vector = getStr(entry, "score");
    const score = vector ? cvss31BaseScore(vector) : null;
    if (vector && score !== null && (!best || score > best.score)) best = { score, vector };
  }
  return best;
}

function labelSeverity(source: unknown): Severity | undefined {
  const label = getStr(source, "severity")?.toUpperCase();
  return label && Object.hasOwn(LABELS, label) ? LABELS[label] : undefined;
}

// Severity of an OSV record: highest CVSS v3 vector first, then a database severity label.
export function severityFromOsv(vuln: unknown): { severity: Severity; score: number | null; vector?: string } {
  if (!isObject(vuln)) return { severity: "unknown", score: null };
  const affected = getArr(vuln, "affected");

  const cvss = bestCvss(getArr(vuln, "severity")) ?? bestCvss(affected.flatMap((a) => getArr(a, "severity")));
  if (cvss) return { severity: severityFromScore(cvss.score), score: cvss.score, vector: cvss.vector };

  const label =
    labelSeverity(get(vuln, "database_specific")) ??
    affected.map((a) => labelSeverity(get(a, "database_specific")) ?? labelSeverity(get(a, "ecosystem_specific"))).find(Boolean);
  return { severity: label ?? "unknown", score: null };
}
