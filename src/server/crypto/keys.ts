import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, type KeyObject } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "@/server/config";

// Key material. Production reads every key from the environment (see `pnpm keys:generate`).
// Development and tests generate keys once and keep them in DATA_DIR/dev-keys.json (mode 0600).
export type KeyRing = {
  masterKey: Buffer;
  pepper: Buffer;
  kemPrivate: KeyObject;
  kemPublic: KeyObject;
  edPrivate: KeyObject;
  edPublic: KeyObject;
  pqPrivate: KeyObject;
  pqPublic: KeyObject;
  kid: string;
};

type Stored = { master: string; pepper: string; kem: string; ed: string; pq: string };

const KEM_ALG = "ml-kem-1024";
const PQ_SIG_ALG = "ml-dsa-65";

let ring: KeyRing | undefined;

export function keys(): KeyRing {
  if (ring) return ring;
  const stored = fromEnv() ?? devKeys();
  ring = build(stored);
  return ring;
}

export function generateStoredKeys(): Stored {
  const der = (k: KeyObject) => k.export({ type: "pkcs8", format: "der" }).toString("base64");
  return {
    master: randomBytes(32).toString("base64"),
    pepper: randomBytes(32).toString("base64"),
    kem: der(generateKeyPairSync(KEM_ALG as "ml-kem-1024").privateKey),
    ed: der(generateKeyPairSync("ed25519").privateKey),
    pq: der(generateKeyPairSync(PQ_SIG_ALG as "ml-dsa-65").privateKey),
  };
}

function fromEnv(): Stored | null {
  const e = process.env;
  const vals = [e.READYLINE_MASTER_KEY, e.READYLINE_PEPPER, e.READYLINE_KEM_PRIVATE, e.READYLINE_SIGN_ED25519_PRIVATE, e.READYLINE_SIGN_MLDSA_PRIVATE];
  if (vals.every((v) => !v)) {
    if (config().isProd) throw new Error("Production needs READYLINE_* keys. Run `pnpm keys:generate` and set them as secrets.");
    return null;
  }
  if (vals.some((v) => !v)) throw new Error("Set all five READYLINE_* key variables, not just some of them.");
  return { master: vals[0]!, pepper: vals[1]!, kem: vals[2]!, ed: vals[3]!, pq: vals[4]! };
}

function devKeys(): Stored {
  const dir = config().dataDir;
  const file = path.join(/*turbopackIgnore: true*/ dir, "dev-keys.json");
  if (fs.existsSync(/*turbopackIgnore: true*/ file)) return JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as Stored;
  fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true, mode: 0o700 });
  const stored = generateStoredKeys();
  fs.writeFileSync(/*turbopackIgnore: true*/ file, JSON.stringify(stored), { mode: 0o600 });
  return stored;
}

function build(s: Stored): KeyRing {
  const masterKey = Buffer.from(s.master, "base64");
  const pepper = Buffer.from(s.pepper, "base64");
  if (masterKey.length !== 32) throw new Error("READYLINE_MASTER_KEY must be 32 bytes, base64-encoded");
  if (pepper.length < 32) throw new Error("READYLINE_PEPPER must be at least 32 bytes, base64-encoded");
  const priv = (b64: string, type: string) => {
    const key = createPrivateKey({ key: Buffer.from(b64, "base64"), format: "der", type: "pkcs8" });
    if (key.asymmetricKeyType !== type) throw new Error(`Expected a ${type} key, got ${key.asymmetricKeyType}`);
    return key;
  };
  const kemPrivate = priv(s.kem, KEM_ALG);
  const edPrivate = priv(s.ed, "ed25519");
  const pqPrivate = priv(s.pq, PQ_SIG_ALG);
  const edPublic = createPublicKey(edPrivate);
  const pqPublic = createPublicKey(pqPrivate);
  const spki = (k: KeyObject) => k.export({ type: "spki", format: "der" });
  const kid = createHash("sha512").update(spki(edPublic)).update(spki(pqPublic)).digest("hex").slice(0, 16);
  return { masterKey, pepper, kemPrivate, kemPublic: createPublicKey(kemPrivate), edPrivate, edPublic, pqPrivate, pqPublic, kid };
}

export function publicKeyDocument() {
  const k = keys();
  const pem = (key: KeyObject) => key.export({ type: "spki", format: "pem" }).toString();
  return {
    kid: k.kid,
    algorithms: { classical: "Ed25519", postQuantum: "ML-DSA-65 (FIPS 204)" },
    ed25519: pem(k.edPublic),
    mldsa65: pem(k.pqPublic),
  };
}

export function resetKeysForTests() {
  ring = undefined;
}
