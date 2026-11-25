import { createHash, createPublicKey, sign as nodeSign, verify as nodeVerify, type KeyObject } from "node:crypto";
import { keys } from "@/server/crypto/keys";

// Hybrid signatures: Ed25519 (classical) and ML-DSA-65 (post-quantum, FIPS 204).
// A signature is valid only if BOTH verify, so it stays secure if either algorithm is broken.
export type HybridSignature = {
  alg: "Ed25519+ML-DSA-65";
  kid: string;
  ed25519: string;
  mldsa65: string;
};

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha512Hex(text: string) {
  return createHash("sha512").update(text, "utf8").digest("hex");
}

export function signPayload(payload: unknown): HybridSignature {
  const k = keys();
  const data = Buffer.from(canonicalJson(payload), "utf8");
  return {
    alg: "Ed25519+ML-DSA-65",
    kid: k.kid,
    ed25519: nodeSign(null, data, k.edPrivate).toString("base64"),
    mldsa65: nodeSign(null, data, k.pqPrivate).toString("base64"),
  };
}

export function verifyPayload(payload: unknown, sig: HybridSignature, publicKeys?: { ed25519: KeyObject | string; mldsa65: KeyObject | string }) {
  if (!sig || sig.alg !== "Ed25519+ML-DSA-65" || typeof sig.ed25519 !== "string" || typeof sig.mldsa65 !== "string") return false;
  const k = keys();
  const ed = publicKeys ? toKey(publicKeys.ed25519) : k.edPublic;
  const pq = publicKeys ? toKey(publicKeys.mldsa65) : k.pqPublic;
  const data = Buffer.from(canonicalJson(payload), "utf8");
  try {
    return nodeVerify(null, data, ed, Buffer.from(sig.ed25519, "base64")) && nodeVerify(null, data, pq, Buffer.from(sig.mldsa65, "base64"));
  } catch {
    return false;
  }
}

function toKey(k: KeyObject | string) {
  return typeof k === "string" ? createPublicKey(k) : k;
}
