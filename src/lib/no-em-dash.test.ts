import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const SKIP = new Set(["node_modules", ".next", "out", "dist-demo", ".git", "pnpm-lock.yaml"]);
const EM_DASH = String.fromCharCode(0x2014);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("house style", () => {
  it("uses no em dashes anywhere in the repo", () => {
    const offenders = files(ROOT)
      .filter((f) => /\.(tsx?|css|md|mjs|json|txt)$/.test(f))
      .filter((f) => readFileSync(f, "utf8").includes(EM_DASH))
      .map((f) => f.slice(ROOT.length + 1));
    expect(offenders).toEqual([]);
  });
});
