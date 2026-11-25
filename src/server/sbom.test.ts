import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetConfigForTests } from "@/server/config";
import { get } from "@/server/db";
import { testOutbox } from "@/server/platform";
import { signedInUser, TestClient } from "@/server/test/client";

const CRON = "c".repeat(40);
let server: ReturnType<typeof createServer>;
let vulnerable = true;

const sbomText = JSON.stringify({
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  metadata: { timestamp: "2026-11-01T00:00:00Z", tools: [{ name: "syft" }] },
  components: [
    { name: "lodash", version: "4.17.20", purl: "pkg:npm/lodash@4.17.20" },
    { name: "left-pad", version: "1.3.0", purl: "pkg:npm/left-pad@1.3.0" },
  ],
});

beforeAll(async () => {
  server = createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/v1/querybatch") {
      const q = JSON.parse(raw).queries as { package: { purl: string } }[];
      res.end(JSON.stringify({ results: q.map((x) => (vulnerable && x.package.purl.includes("lodash") ? { vulns: [{ id: "GHSA-35jh" }] } : {})) }));
      return;
    }
    res.end(
      JSON.stringify({
        id: "GHSA-35jh",
        summary: "Command injection in lodash",
        severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H" }],
        affected: [{ package: { purl: "pkg:npm/lodash" }, ranges: [{ events: [{ introduced: "0" }, { fixed: "4.17.21" }] }] }],
      }),
    );
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.OSV_API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.CRON_SECRET = CRON;
  resetConfigForTests();
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

async function setup() {
  const owner = await signedInUser("Sbom Owner", "Sbom Co");
  const p = await owner.c.post<{ id: string }>(`/orgs/${owner.orgId}/products`, { name: "Gateway" });
  return { owner, productId: p.data.id };
}

describe("SBOM watch", () => {
  it("uploads, scores, checks and stores encrypted findings", async () => {
    const { owner, productId } = await setup();
    const up = await owner.c.post<{ id: string; quality: { score: number }; newFindings: unknown[] }>(`/products/${productId}/sboms`, { label: "v2.5.0", text: sbomText });
    expect(up.status).toBe(201);
    expect(up.data.newFindings).toHaveLength(1);
    const list = await owner.c.get<{ sboms: { id: string; counts: Record<string, number>; components: number }[] }>(`/products/${productId}/sboms`);
    expect(list.data.sboms[0]).toMatchObject({ components: 2, counts: { high: 1 } });
    const findings = await owner.c.get<{ findings: { id: string; vulnId: string; fixedIn: string[]; status: string }[] }>(`/products/${productId}/sboms/${up.data.id}/findings`);
    expect(findings.data.findings[0]).toMatchObject({ vulnId: "GHSA-35jh", fixedIn: ["4.17.21"], status: "open" });
    const row = JSON.stringify(get("SELECT * FROM sbom_findings LIMIT 1"));
    expect(row).not.toContain("Command injection");
    const triage = await owner.c.patch(`/products/${productId}/findings/${findings.data.findings[0].id}`, { status: "fixed", note: "Upgraded in 2.5.1" });
    expect(triage.status).toBe(200);
  });

  it("rejects bad files with a clear message and hides other teams' SBOMs", async () => {
    const { owner, productId } = await setup();
    const bad = await owner.c.post(`/products/${productId}/sboms`, { label: "x", text: "<bom/>" });
    expect(bad.status).toBe(400);
    expect(bad.data.error).toMatch(/XML/);
    const up = await owner.c.post<{ id: string }>(`/products/${productId}/sboms`, { label: "v1", text: sbomText });
    const outsider = await signedInUser("Sbom Outsider", "Else");
    expect((await outsider.c.get(`/products/${productId}/sboms/${up.data.id}/findings`)).status).toBe(404);
    expect((await outsider.c.post(`/products/${productId}/sboms/${up.data.id}/check`)).status).toBe(404);
  });

  it("protects the cron endpoint and emails owners about new serious findings", async () => {
    const anon = new TestClient(undefined, "192.0.2.170");
    expect((await anon.call("POST", "/cron/sbom-watch", undefined, { origin: "" })).status).toBe(401);
    expect((await anon.call("POST", "/cron/sbom-watch", undefined, { authorization: "Bearer wrong" })).status).toBe(401);

    vulnerable = false;
    const { owner, productId } = await setup();
    await owner.c.post(`/products/${productId}/sboms`, { label: "v3", text: sbomText });
    vulnerable = true;
    const before = testOutbox().length;
    const res = await anon.call<{ checked: number; alerts: number }>("POST", "/cron/sbom-watch", undefined, { authorization: `Bearer ${CRON}` });
    expect(res.status).toBe(200);
    expect(res.data.checked).toBeGreaterThan(0);
    const mail = testOutbox().slice(before).find((m) => m.to === owner.email);
    expect(mail?.subject).toMatch(/1 new vulnerability in Gateway/);
    expect(mail?.text).toContain("fixed in 4.17.21");
  });

  it("offers a stateless public check", async () => {
    const anon = new TestClient(undefined, "192.0.2.171");
    const res = await anon.post<{ findings: { vulnId: string }[]; quality: { score: number }; sbom: { components: number } }>("/tools/sbom-check", { text: sbomText });
    expect(res.status).toBe(200);
    expect(res.data.sbom.components).toBe(2);
    expect(res.data.findings.map((f) => f.vulnId)).toEqual(["GHSA-35jh"]);
  });
});
