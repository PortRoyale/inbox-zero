import { createCipheriv, createDecipheriv, createHash, decapsulate, encapsulate, hkdfSync, randomBytes } from "node:crypto";
import { keys } from "@/server/crypto/keys";

// Hybrid post-quantum envelope encryption for data at rest.
//
//   data       AES-256-GCM under a fresh random 256-bit data key (DEK)
//   DEK        AES-256-GCM under a key-encryption key (KEK)
//   KEK        HKDF-SHA-512( MASTER_KEY || ML-KEM-1024 shared secret ), salted with the KEM ciphertext hash
//
// Recovering data needs both the master key and the ML-KEM private key. Every ciphertext is bound
// to its record through the associated data (AAD), so ciphertexts cannot be swapped between rows.
const VERSION = 1;
const PREFIX = "rl1.";

export function seal(value: unknown, aad: string): string {
  const k = keys();
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const { sharedKey, ciphertext: kemCt } = encapsulate(k.kemPublic);
  const kek = deriveKek(k.masterKey, sharedKey, kemCt);
  const dek = randomBytes(32);

  const wrapIv = randomBytes(12);
  const wrap = createCipheriv("aes-256-gcm", kek, wrapIv);
  wrap.setAAD(Buffer.from(`rl/dek/${aad}`));
  const wrapped = Buffer.concat([wrap.update(dek), wrap.final()]);
  const wrapTag = wrap.getAuthTag();

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  cipher.setAAD(Buffer.from(`rl/data/${aad}`));
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const len = Buffer.alloc(2);
  len.writeUInt16BE(kemCt.length);
  return PREFIX + Buffer.concat([Buffer.from([VERSION]), len, kemCt, wrapIv, wrapTag, wrapped, iv, tag, ct]).toString("base64url");
}

export function open<T = unknown>(token: string, aad: string): T {
  if (!token.startsWith(PREFIX)) throw new Error("Unsupported ciphertext");
  const buf = Buffer.from(token.slice(PREFIX.length), "base64url");
  if (buf[0] !== VERSION) throw new Error("Unsupported ciphertext version");
  let o = 1;
  const kemLen = buf.readUInt16BE(o);
  o += 2;
  const take = (n: number) => {
    if (o + n > buf.length) throw new Error("Truncated ciphertext");
    const part = buf.subarray(o, o + n);
    o += n;
    return part;
  };
  const kemCt = take(kemLen);
  const wrapIv = take(12);
  const wrapTag = take(16);
  const wrapped = take(32);
  const iv = take(12);
  const tag = take(16);
  const ct = buf.subarray(o);

  const k = keys();
  const sharedKey = decapsulate(k.kemPrivate, kemCt);
  const kek = deriveKek(k.masterKey, sharedKey, kemCt);
  const unwrap = createDecipheriv("aes-256-gcm", kek, wrapIv);
  unwrap.setAAD(Buffer.from(`rl/dek/${aad}`));
  unwrap.setAuthTag(wrapTag);
  const dek = Buffer.concat([unwrap.update(wrapped), unwrap.final()]);

  const decipher = createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAAD(Buffer.from(`rl/data/${aad}`));
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

function deriveKek(master: Buffer, shared: Buffer, kemCt: Buffer) {
  const salt = createHash("sha512").update(kemCt).digest();
  return Buffer.from(hkdfSync("sha512", Buffer.concat([master, shared]), salt, "readyline/kek/v1", 32));
}
