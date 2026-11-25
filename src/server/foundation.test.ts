import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { open, seal } from "@/server/crypto/envelope";
import { generateStoredKeys, keys, publicKeyDocument, resetKeysForTests } from "@/server/crypto/keys";
import { burnPasswordCheck, emailHash, hashPassword, passwordProblem, tokenHash, verifyPassword } from "@/server/crypto/secrets";
import { canonicalJson, signPayload, verifyPayload } from "@/server/crypto/sign";
import { all, get, run, tx } from "@/server/db";
import { v, ValidationError } from "@/server/validate";

describe("post-quantum envelope encryption", () => {
  it("round-trips data bound to its record", () => {
    const token = seal({ secret: "plan", n: 42 }, "plan:abc");
    expect(token.startsWith("rl1.")).toBe(true);
    expect(token).not.toContain("plan");
    expect(open(token, "plan:abc")).toEqual({ secret: "plan", n: 42 });
  });

  it("uses a fresh key per record, so equal plaintexts differ", () => {
    expect(seal("x", "a")).not.toBe(seal("x", "a"));
  });

  it("refuses ciphertext moved to another record", () => {
    const token = seal({ a: 1 }, "plan:one");
    expect(() => open(token, "plan:two")).toThrow();
  });

  it("refuses tampered ciphertext", () => {
    const token = seal({ a: 1 }, "r");
    const raw = Buffer.from(token.slice(4), "base64url");
    raw[raw.length - 1] ^= 0x01;
    expect(() => open(`rl1.${raw.toString("base64url")}`, "r")).toThrow();
  });

  it("cannot be opened with a different key ring", () => {
    const token = seal({ a: 1 }, "r");
    const stored = generateStoredKeys();
    const saved = { ...process.env };
    Object.assign(process.env, {
      READYLINE_MASTER_KEY: stored.master,
      READYLINE_PEPPER: stored.pepper,
      READYLINE_KEM_PRIVATE: stored.kem,
      READYLINE_SIGN_ED25519_PRIVATE: stored.ed,
      READYLINE_SIGN_MLDSA_PRIVATE: stored.pq,
    });
    resetKeysForTests();
    expect(() => open(token, "r")).toThrow();
    process.env = saved;
    resetKeysForTests();
    expect(open(token, "r")).toEqual({ a: 1 });
  });

  it("uses ML-KEM-1024 and ML-DSA-65 keys", () => {
    const k = keys();
    expect(k.kemPrivate.asymmetricKeyType).toBe("ml-kem-1024");
    expect(k.pqPrivate.asymmetricKeyType).toBe("ml-dsa-65");
    expect(publicKeyDocument().mldsa65).toContain("BEGIN PUBLIC KEY");
  });
});

describe("hybrid signatures", () => {
  const payload = { product: "p1", rev: "A", fingerprint: "abc" };

  it("verifies only when both Ed25519 and ML-DSA-65 verify", () => {
    const sig = signPayload(payload);
    expect(verifyPayload(payload, sig)).toBe(true);
    expect(verifyPayload({ ...payload, rev: "B" }, sig)).toBe(false);
    const other = signPayload({ other: true });
    expect(verifyPayload(payload, { ...sig, mldsa65: other.mldsa65 })).toBe(false);
    expect(verifyPayload(payload, { ...sig, ed25519: other.ed25519 })).toBe(false);
  });

  it("is independent of key order", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
    const sig = signPayload({ b: 1, a: 2 });
    expect(verifyPayload({ a: 2, b: 1 }, sig)).toBe(true);
  });

  it("rejects signatures checked against someone else's public keys", () => {
    const sig = signPayload(payload);
    const pem = (t: "ed25519" | "ml-dsa-65") => generateKeyPairSync(t as "ed25519").publicKey.export({ type: "spki", format: "pem" }).toString();
    expect(verifyPayload(payload, sig, { ed25519: pem("ed25519"), mldsa65: pem("ml-dsa-65") })).toBe(false);
  });
});

describe("passwords and tokens", () => {
  it("hashes with scrypt and a pepper", async () => {
    const h = await hashPassword("correct horse battery staple");
    expect(h.startsWith("v1$scrypt$32768$8$1$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", h)).toBe(true);
    expect(await verifyPassword("correct horse battery stapl", h)).toBe(false);
    await expect(burnPasswordCheck("anything")).resolves.toBeUndefined();
  });

  it("rejects weak passwords", () => {
    expect(passwordProblem("short", "a@b.co")).toMatch(/12 characters/);
    expect(passwordProblem("aaaaaaaaaaaaaa", "a@b.co")).toBeTruthy();
    expect(passwordProblem("maria-likes-cra-2026", "maria@x.eu")).toMatch(/email name/);
    expect(passwordProblem("Ample-Harbour-Lantern-9", "sam@x.eu")).toBeNull();
  });

  it("hashes tokens and emails with SHA-512 family digests", () => {
    expect(tokenHash("t")).toHaveLength(128);
    expect(emailHash("A@B.co ")).toBe(emailHash("a@b.co"));
  });
});

describe("database", () => {
  it("applies migrations and enforces foreign keys", () => {
    expect(all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")).toHaveLength(1);
    expect(() => run("INSERT INTO memberships (org_id, user_id, role, created_at) VALUES ($o, $u, 'owner', 0)", { o: "x", u: "y" })).toThrow();
  });

  it("rolls back failed transactions", () => {
    expect(() =>
      tx(() => {
        run("INSERT INTO rate_limits (key, window_start, count) VALUES ('k1', 0, 1)");
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(get("SELECT * FROM rate_limits WHERE key = 'k1'")).toBeUndefined();
  });
});

describe("validator", () => {
  const schema = v.object({ name: v.string({ min: 1, max: 10 }), email: v.email(), role: v.enum(["editor", "viewer"] as const), n: v.optional(v.int({ min: 0, max: 5 })) });

  it("parses valid input and normalises it", () => {
    expect(schema({ name: " Ana ", email: "ANA@X.EU", role: "editor" }, "")).toEqual({ name: "Ana", email: "ana@x.eu", role: "editor", n: undefined });
  });

  it("rejects bad input with a path", () => {
    expect(() => schema({ name: "", email: "x", role: "owner" }, "")).toThrow(ValidationError);
    expect(() => schema({ name: "a\u0000b", email: "a@b.co", role: "viewer" }, "")).toThrow(/invalid characters/);
    expect(() => schema({ name: "ok", email: "a@b.co", role: "viewer", n: 9 }, "")).toThrow(/n: must be between/);
  });
});
