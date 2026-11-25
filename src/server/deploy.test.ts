import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { config, resetConfigForTests } from "@/server/config";
import { open, seal } from "@/server/crypto/envelope";
import { keys, resetKeysForTests } from "@/server/crypto/keys";
import { signPayload, verifyPayload } from "@/server/crypto/sign";
import { TestClient } from "@/server/test/client";

// The production key generator must produce exactly what the server loads.
const script = path.resolve(__dirname, "../../scripts/generate-keys.mjs");
const run = (...args: string[]) => execFileSync(process.execPath, [script, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const KEY_NAMES = ["READYLINE_MASTER_KEY", "READYLINE_PEPPER", "READYLINE_KEM_PRIVATE", "READYLINE_SIGN_ED25519_PRIVATE", "READYLINE_SIGN_MLDSA_PRIVATE"];
const saved = Object.fromEntries(KEY_NAMES.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  resetKeysForTests();
  resetConfigForTests();
});

function parse(text: string) {
  return Object.fromEntries(
    text
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}

describe("scripts/generate-keys.mjs", () => {
  it("prints a complete key set the server loads, seals with and signs with", () => {
    const env = parse(run());
    expect(Object.keys(env).sort()).toEqual([...KEY_NAMES, "CRON_SECRET", "IP_HASH_SALT"].sort());
    expect(env.CRON_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.IP_HASH_SALT.length).toBeGreaterThanOrEqual(32);
    for (const k of KEY_NAMES) process.env[k] = env[k];
    resetKeysForTests();
    const ring = keys();
    expect(ring.masterKey.length).toBe(32);
    expect(ring.kemPrivate.asymmetricKeyType).toBe("ml-kem-1024");
    expect(ring.pqPrivate.asymmetricKeyType).toBe("ml-dsa-65");
    const sealed = seal("secret plan", "plans:p1");
    expect(open(sealed, "plans:p1")).toBe("secret plan");
    const sig = signPayload({ hello: "world" });
    expect(verifyPayload({ hello: "world" }, sig)).toBe(true);
    expect(verifyPayload({ hello: "there" }, sig)).toBe(false);
  });

  it("generates different keys each run", () => {
    expect(parse(run()).READYLINE_MASTER_KEY).not.toBe(parse(run()).READYLINE_MASTER_KEY);
  });

  it("writes a new 0600 file and never overwrites an existing one", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rl-keys-"));
    const file = path.join(dir, ".env.production");
    run("--out", file);
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    const first = fs.readFileSync(file, "utf8");
    expect(Object.keys(parse(first))).toHaveLength(7);
    expect(() => run("--out", file)).toThrow();
    expect(fs.readFileSync(file, "utf8")).toBe(first);
    fs.rmSync(dir, { recursive: true });
  });

  it("rejects unknown arguments", () => {
    expect(() => run("--bogus")).toThrow();
  });
});

describe("health endpoint", () => {
  it("answers ok without a session and is never cached", async () => {
    const res = await new TestClient(undefined, "192.0.2.180").call<{ ok: boolean }>("GET", "/health");
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("production configuration", () => {
  const prodEnv = {
    NODE_ENV: "production",
    APP_URL: "https://app.example.com",
    IP_HASH_SALT: "s".repeat(40),
    RESEND_API_KEY: "re_test",
    POSTMARK_SERVER_TOKEN: "",
    READYLINE_ALLOW_INSECURE: "",
    BILLING_PROVIDER: "none",
  };
  const withEnv = (over: Record<string, string>, fn: () => void) => {
    const keep = Object.fromEntries(Object.keys({ ...prodEnv, ...over }).map((k) => [k, process.env[k]]));
    Object.assign(process.env, prodEnv, over);
    resetConfigForTests();
    try {
      fn();
    } finally {
      for (const [k, v] of Object.entries(keep)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
      resetConfigForTests();
    }
  };

  it("accepts a complete setup", () => {
    withEnv({}, () => expect(config().isProd).toBe(true));
  });

  it.each([
    [{ APP_URL: "http://app.example.com" }, /https/],
    [{ IP_HASH_SALT: "short" }, /IP_HASH_SALT/],
    [{ RESEND_API_KEY: "" }, /RESEND_API_KEY or POSTMARK_SERVER_TOKEN/],
    [{ CRON_SECRET: "too-short" }, /CRON_SECRET/],
    [{ BILLING_PROVIDER: "finix" }, /FINIX_USERNAME/],
    [{ BILLING_PROVIDER: "stripe" }, /STRIPE_SECRET_KEY/],
    [{ BILLING_PROVIDER: "paypal" }, /finix, stripe or none/],
  ])("refuses to start with %o", (over, message) => {
    withEnv(over as Record<string, string>, () => expect(() => config()).toThrow(message));
  });
});
