import { get, getArr, getStr, isObject } from "./json";
import type { SbomComponent } from "./parse";
import { parsePurl, purlWithVersion } from "./purl";
import { SEVERITY_ORDER, severityFromOsv, type Severity } from "./cvss";

// Vulnerability lookup against the OSV API (https://google.github.io/osv.dev/api/).
// querybatch returns ids only, so details are fetched per unique id with a concurrency limit.

export type Finding = {
  vulnId: string;
  aliases: string[];
  summary: string;
  severity: Severity;
  score: number | null;
  component: string;
  version: string;
  purl: string;
  fixedIn: string[];
  published?: string;
  references: string[];
};

export type OsvOptions = { baseUrl: string; fetchImpl?: typeof fetch; timeoutMs?: number; maxDetails?: number };

const BATCH = 1000;
const CONCURRENCY = 8;

function queryPurl(c: SbomComponent): string | null {
  if (!c.purl) return null;
  const parsed = parsePurl(c.purl);
  if (!parsed) return null;
  if (parsed.version) return c.purl;
  return c.version ? purlWithVersion(c.purl, c.version) : null;
}

async function call(opts: OsvOptions, path: string, init?: RequestInit): Promise<unknown> {
  const f = opts.fetchImpl ?? fetch;
  const res = await f(`${opts.baseUrl.replace(/\/+$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
  });
  if (!res.ok) throw new Error(`OSV request failed (${res.status}) for ${path.split("?")[0]}`);
  return res.json();
}

// Runs tasks with at most `limit` in flight.
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

function fixedVersions(vuln: unknown, purl: string): string[] {
  const target = parsePurl(purl);
  const fixed: string[] = [];
  for (const affected of getArr(vuln, "affected")) {
    const pkg = get(affected, "package");
    const affPurl = getStr(pkg, "purl");
    const affParsed = affPurl ? parsePurl(affPurl) : null;
    const sameByPurl = affParsed && target && affParsed.type === target.type && affParsed.name.toLowerCase() === target.name.toLowerCase() && (affParsed.namespace ?? "") === (target.namespace ?? "");
    const sameByName = !affPurl && target && getStr(pkg, "name")?.toLowerCase().endsWith(target.name.toLowerCase());
    if (!sameByPurl && !sameByName) continue;
    for (const range of getArr(affected, "ranges")) {
      for (const event of getArr(range, "events")) {
        const v = getStr(event, "fixed");
        if (v && !fixed.includes(v)) fixed.push(v);
      }
    }
  }
  return fixed;
}

export async function checkWithOsv(components: SbomComponent[], opts: OsvOptions): Promise<{ findings: Finding[]; queried: number; skipped: number }> {
  const queries: { component: SbomComponent; purl: string }[] = [];
  let skipped = 0;
  for (const c of components) {
    const purl = queryPurl(c);
    if (purl) queries.push({ component: c, purl });
    else skipped++;
  }

  // 1. Which vulnerabilities affect which components.
  const hits: { q: (typeof queries)[number]; id: string }[] = [];
  for (let start = 0; start < queries.length; start += BATCH) {
    let chunk = queries.slice(start, start + BATCH).map((q) => ({ q, token: undefined as string | undefined }));
    while (chunk.length) {
      const body = { queries: chunk.map(({ q, token }) => (token ? { package: { purl: q.purl }, page_token: token } : { package: { purl: q.purl } })) };
      const res = await call(opts, "/v1/querybatch", { method: "POST", body: JSON.stringify(body) });
      const results = getArr(res, "results");
      const more: typeof chunk = [];
      chunk.forEach(({ q }, i) => {
        const r = results[i];
        for (const v of getArr(r, "vulns")) {
          const id = getStr(v, "id");
          if (id) hits.push({ q, id });
        }
        const token = getStr(r, "next_page_token");
        if (token) more.push({ q, token });
      });
      chunk = more;
    }
  }

  // 2. Details for each unique vulnerability id, capped.
  const ids = [...new Set(hits.map((h) => h.id))].slice(0, opts.maxDetails ?? 500);
  const details = new Map<string, unknown>();
  await pool(ids, CONCURRENCY, async (id) => {
    details.set(id, await call(opts, `/v1/vulns/${encodeURIComponent(id)}`));
  });

  // 3. One finding per vulnerability and component.
  const seen = new Set<string>();
  const findings: Finding[] = [];
  for (const { q, id } of hits) {
    const key = `${id}|${q.purl}`;
    if (seen.has(key) || !details.has(id)) continue;
    seen.add(key);
    const v = details.get(id);
    const sev = severityFromOsv(v);
    findings.push({
      vulnId: id,
      aliases: getArr(v, "aliases").filter((a): a is string => typeof a === "string"),
      summary: getStr(v, "summary") ?? getStr(v, "details")?.slice(0, 280) ?? "",
      severity: sev.severity,
      score: sev.score,
      component: q.component.name,
      version: q.component.version || parsePurl(q.purl)?.version || "",
      purl: q.purl,
      fixedIn: fixedVersions(v, q.purl),
      published: getStr(v, "published"),
      references: getArr(v, "references")
        .map((r) => (isObject(r) ? getStr(r, "url") : undefined))
        .filter((u): u is string => !!u && /^https:\/\//.test(u))
        .slice(0, 8),
    });
  }
  findings.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || (b.score ?? -1) - (a.score ?? -1) || a.vulnId.localeCompare(b.vulnId));
  return { findings, queried: queries.length, skipped };
}
