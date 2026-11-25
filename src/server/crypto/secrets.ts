import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { config } from "@/server/config";
import { keys } from "@/server/crypto/keys";

// Passwords: scrypt (N=2^15, r=8, p=1, 64-byte output) over HMAC-SHA-512(pepper, password).
// The pepper lives outside the database, so a stolen database alone cannot be cracked offline.
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 96 * 1024 * 1024;

function scrypt(input: Buffer, salt: Buffer, n: number, r: number, p: number, len: number) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCb(input, salt, len, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

function peppered(password: string) {
  return createHmac("sha512", keys().pepper).update(password.normalize("NFKC"), "utf8").digest();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(peppered(password), salt, N, R, P, KEYLEN);
  return `v1$scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 7 || parts[0] !== "v1" || parts[1] !== "scrypt") return false;
  const [, , n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(peppered(password), Buffer.from(saltB64, "base64"), Number(n), Number(r), Number(p), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummy: Promise<string> | undefined;
// Spend the same time on unknown accounts so timing does not reveal which emails exist.
export async function burnPasswordCheck(password: string) {
  dummy ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummy);
}

export function passwordProblem(password: string, email: string) {
  if (password.length < 12) return "Use at least 12 characters.";
  if (password.length > 256) return "Use at most 256 characters.";
  const lower = password.toLowerCase();
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && lower.includes(local)) return "Don't include your email name in the password.";
  if (new Set(password).size < 6) return "Use more varied characters.";
  if (/^(.)\1+$/.test(password) || /^(?:0123456789|1234567890|password|qwerty)/i.test(password)) return "That password is too easy to guess.";
  return null;
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

// Tokens and session ids are stored only as SHA-512 digests.
export function tokenHash(token: string) {
  return createHash("sha512").update(token, "utf8").digest("hex");
}

// Emails are looked up by keyed hash; the address itself is stored encrypted.
export function emailHash(email: string) {
  return createHmac("sha512", keys().pepper).update(`email:${email.trim().toLowerCase()}`, "utf8").digest("hex");
}

export function ipHash(ip: string | null | undefined) {
  if (!ip) return "";
  return createHmac("sha512", config().ipSalt).update(ip).digest("hex").slice(0, 32);
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
