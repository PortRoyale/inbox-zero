import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkWithOsv, cvss31BaseScore, parseSbom, SbomError, sbomQuality, severityFromOsv, severityFromScore, type SbomComponent } from "@/lib/sbom";

const cdx = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  metadata: {
    timestamp: "2026-11-01T10:00:00Z",
    tools: { components: [{ name: "syft", version: "1.18.0" }] },
    component: { "bom-ref": "root", name: "thermostat-fw", version: "2.4.0", type: "firmware" },
  },
  components: [
    { name: "lodash", version: "4.17.20", purl: "pkg:npm/lodash@4.17.20", supplier: { name: "OpenJS" }, licenses: [{ license: { id: "MIT" } }], hashes: [{ alg: "SHA-256", content: "ab" }] },
    { name: "requests", version: "2.25.0", purl: "pkg:pypi/requests@2.25.0", licenses: [{ expression: "Apache-2.0" }] },
    {
      name: "openssl",
      version: "3.0.7",
      purl: "pkg:generic/openssl@3.0.7",
      components: [{ name: "zlib", version: "1.2.13", purl: "pkg:generic/zlib@1.2.13" }],
    },
    { group: "@babel", name: "core", version: "7.20.0", purl: "pkg:npm/%40babel/core@7.20.0" },
    { name: "lodash", version: "4.17.20", purl: "pkg:npm/lodash@4.17.20", licenses: [{ license: { id: "CC0-1.0" } }] },
  ],
};

const spdx = {
  spdxVersion: "SPDX-2.3",
  SPDXID: "SPDXRef-DOCUMENT",
  name: "gateway",
  creationInfo: { created: "2026-10-01T00:00:00Z", creators: ["Tool: trivy-0.58", "Organization: Acme (security@acme.example)"] },
  documentDescribes: ["SPDXRef-root"],
  packages: [
    { SPDXID: "SPDXRef-root", name: "gateway", versionInfo: "4.12.0" },
    {
      SPDXID: "SPDXRef-a",
      name: "openssl",
      versionInfo: "3.0.7",
      supplier: "Organization: OpenSSL Foundation",
      licenseConcluded: "Apache-2.0",
      checksums: [{ algorithm: "SHA256", checksumValue: "cd" }],
      externalRefs: [{ referenceCategory: "PACKAGE-MANAGER", referenceType: "purl", referenceLocator: "pkg:generic/openssl@3.0.7" }],
    },
    { SPDXID: "SPDXRef-b", name: "busybox", versionInfo: "NOASSERTION", licenseConcluded: "NOASSERTION" },
  ],
};

describe("parseSbom", () => {
  it("reads CycloneDX with nesting, groups, tools and de-duplication", () => {
    const s = parseSbom(JSON.stringify(cdx));
    expect(s).toMatchObject({ format: "CycloneDX", specVersion: "1.6", subject: "thermostat-fw 2.4.0", tool: "syft 1.18.0", created: "2026-11-01T10:00:00Z" });
    expect(s.components.map((c) => c.name)).toEqual(["lodash", "requests", "openssl", "zlib", "@babel/core"]);
    expect(s.components[0]).toMatchObject({ supplier: "OpenJS", hashes: 1, licenses: ["MIT", "CC0-1.0"] });
  });

  it("reads SPDX 2.3 and skips the described root package", () => {
    const s = parseSbom(JSON.stringify(spdx));
    expect(s).toMatchObject({ format: "SPDX", specVersion: "2.3", subject: "gateway 4.12.0", tool: "trivy-0.58", author: "Acme" });
    expect(s.components).toHaveLength(2);
    expect(s.components[0]).toMatchObject({ name: "openssl", purl: "pkg:generic/openssl@3.0.7", supplier: "OpenSSL Foundation", hashes: 1, licenses: ["Apache-2.0"] });
    expect(s.components[1]).toMatchObject({ name: "busybox", version: "", licenses: [] });
  });

  it("rejects unsupported and hostile input with clear messages", () => {
    expect(() => parseSbom("not json")).toThrow(SbomError);
    expect(() => parseSbom("<bom/>")).toThrow(/XML/);
    expect(() => parseSbom("{}")).toThrow(/CycloneDX or SPDX/);
    expect(() => parseSbom("x".repeat(5 * 1024 * 1024 + 1))).toThrow(/5 MB/);
    expect(() => parseSbom(JSON.stringify({ ...cdx, specVersion: "2.0" }))).toThrow(/Unsupported CycloneDX/);
    expect(() => parseSbom(JSON.stringify(cdx), { maxComponents: 2 })).toThrow(/over the limit/);
    const polluted = '{"bomFormat":"CycloneDX","specVersion":"1.5","components":[{"name":"x","version":"1","__proto__":{"polluted":true}}]}';
    parseSbom(polluted);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("sbomQuality", () => {
  it("scores coverage and explains each check", () => {
    const q = sbomQuality(parseSbom(JSON.stringify(cdx)));
    const byId = Object.fromEntries(q.checks.map((c) => [c.id, c]));
    expect(byId.versions.passed).toBe(true);
    expect(byId.identifiers.passed).toBe(true);
    expect(byId.supplier.passed).toBe(false);
    expect(byId.supplier.detail).toBe("1 of 5 components have a supplier");
    expect(q.score).toBeGreaterThan(50);
    expect(q.score).toBeLessThan(100);
  });
});

describe("CVSS 3.1", () => {
  it.each([
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", 9.8],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H", 10.0],
    ["CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H", 7.8],
    ["CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N", 3.1],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", 6.1],
    ["CVSS:3.0/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N", 6.5],
    ["AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N", 0],
  ])("%s scores %s", (vector, score) => {
    expect(cvss31BaseScore(vector)).toBe(score);
  });

  it("rejects malformed vectors and maps severities", () => {
    expect(cvss31BaseScore("CVSS:3.1/AV:N")).toBeNull();
    expect(cvss31BaseScore("CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N")).toBeNull();
    expect(cvss31BaseScore("CVSS:3.1/AV:N/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")).toBeNull();
    expect([0, 3.9, 4, 6.9, 7, 8.9, 9].map(severityFromScore)).toEqual(["none", "low", "medium", "medium", "high", "high", "critical"]);
    expect(severityFromOsv({ database_specific: { severity: "MODERATE" } }).severity).toBe("medium");
  });
});

describe("checkWithOsv", () => {
  let server: ReturnType<typeof createServer>;
  let base = "";
  const calls: { path: string; body: unknown }[] = [];
  let failNext = false;

  beforeAll(async () => {
    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = raw ? JSON.parse(raw) : null;
      calls.push({ path: req.url ?? "", body });
      const send = (status: number, data: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      };
      if (failNext) {
        failNext = false;
        return send(500, { error: "boom" });
      }
      if (req.url === "/v1/querybatch") {
        const queries = (body as { queries: { package: { purl: string }; page_token?: string }[] }).queries;
        return send(200, {
          results: queries.map((q) => {
            if (q.package.purl === "pkg:npm/lodash@4.17.20") {
              return q.page_token ? { vulns: [{ id: "GHSA-p6mc" }] } : { vulns: [{ id: "GHSA-35jh" }], next_page_token: "page2" };
            }
            if (q.package.purl === "pkg:pypi/requests@2.25.0") return { vulns: [{ id: "PYSEC-2023-74" }] };
            return {};
          }),
        });
      }
      const id = decodeURIComponent((req.url ?? "").replace("/v1/vulns/", ""));
      const detail: Record<string, unknown> = {
        "GHSA-35jh": {
          id: "GHSA-35jh",
          aliases: ["CVE-2021-23337"],
          summary: "Command injection in lodash",
          severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H" }],
          affected: [{ package: { ecosystem: "npm", name: "lodash", purl: "pkg:npm/lodash" }, ranges: [{ type: "SEMVER", events: [{ introduced: "0" }, { fixed: "4.17.21" }] }] }],
          references: [{ url: "https://github.com/advisories/GHSA-35jh" }, { url: "javascript:alert(1)" }],
        },
        "GHSA-p6mc": { id: "GHSA-p6mc", summary: "ReDoS", database_specific: { severity: "MODERATE" }, affected: [] },
        "PYSEC-2023-74": {
          id: "PYSEC-2023-74",
          summary: "Proxy-Authorization leak",
          severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N" }],
          affected: [{ package: { ecosystem: "PyPI", name: "requests", purl: "pkg:pypi/requests" }, ranges: [{ type: "ECOSYSTEM", events: [{ introduced: "2.3.0" }, { fixed: "2.31.0" }] }] }],
        },
      };
      return detail[id] ? send(200, detail[id]) : send(404, {});
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("queries in batches, follows page tokens, fetches details and sorts by severity", async () => {
    calls.length = 0;
    const components = parseSbom(JSON.stringify(cdx)).components;
    const out = await checkWithOsv(components, { baseUrl: base });
    expect(out.queried).toBe(5);
    expect(out.findings.map((f) => f.vulnId)).toEqual(["GHSA-35jh", "PYSEC-2023-74", "GHSA-p6mc"]);
    expect(out.findings[0]).toMatchObject({ severity: "high", score: 7.2, fixedIn: ["4.17.21"], aliases: ["CVE-2021-23337"], references: ["https://github.com/advisories/GHSA-35jh"] });
    expect(out.findings[1]).toMatchObject({ severity: "medium", score: 5.3, fixedIn: ["2.31.0"] });
    expect(out.findings[2].severity).toBe("medium");
    expect(calls.filter((c) => c.path === "/v1/querybatch")).toHaveLength(2);
  });

  it("splits more than 1,000 queries into several batches and skips components without a purl", async () => {
    calls.length = 0;
    const many: SbomComponent[] = Array.from({ length: 1001 }, (_, i) => ({ name: `p${i}`, version: "1.0.0", purl: `pkg:npm/p${i}`, licenses: [], hashes: 0 }));
    many.push({ name: "no-purl", version: "1", licenses: [], hashes: 0 });
    const out = await checkWithOsv(many, { baseUrl: base });
    expect(out.queried).toBe(1001);
    expect(out.skipped).toBe(1);
    const batches = calls.filter((c) => c.path === "/v1/querybatch");
    expect(batches).toHaveLength(2);
    expect((batches[0].body as { queries: { package: { purl: string } }[] }).queries[0].package.purl).toBe("pkg:npm/p0@1.0.0");
  });

  it("surfaces upstream errors", async () => {
    failNext = true;
    await expect(checkWithOsv([{ name: "a", version: "1", purl: "pkg:npm/a@1", licenses: [], hashes: 0 }], { baseUrl: base })).rejects.toThrow(/OSV request failed \(500\)/);
  });
});
