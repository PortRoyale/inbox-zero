#!/usr/bin/env node
// Generates a complete production key set for Readyline.
//
//   node scripts/generate-keys.mjs                         print KEY=value lines to stdout
//   node scripts/generate-keys.mjs --out .env.production   write them to a new file (mode 0600)
//
// The formats match src/server/crypto/keys.ts (generateStoredKeys and build): the master key and
// pepper are 32 random bytes, and each private key is PKCS#8 DER, all base64-encoded. No
// dependencies; needs Node 24.7 or later for ML-KEM and ML-DSA in node:crypto.
import { createPrivateKey, generateKeyPairSync, randomBytes } from "node:crypto";
import fs from "node:fs";

const USAGE = `Usage: node scripts/generate-keys.mjs [--out <file>]

Prints a full Readyline production key set as KEY=value lines.
  --out <file>  write to <file> instead (created with mode 0600; an existing file is never overwritten)
  -h, --help    show this help`;

function parseArgs(argv) {
  let out = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else if (arg === "--out") {
      out = argv[++i];
      if (!out || out.startsWith("-")) fail("--out needs a file name.");
    } else if (arg.startsWith("--out=")) {
      out = arg.slice("--out=".length);
      if (!out) fail("--out needs a file name.");
    } else {
      fail(`Unknown argument: ${arg}\n\n${USAGE}`);
    }
  }
  return { out };
}

function fail(message) {
  console.error(`generate-keys: ${message}`);
  process.exit(1);
}

// Mirrors generateStoredKeys() in src/server/crypto/keys.ts.
function pkcs8(type) {
  let pair;
  try {
    pair = generateKeyPairSync(type);
  } catch (err) {
    fail(`This Node.js (${process.version}) cannot generate ${type} keys. Use Node 24.7 or later. (${err.message})`);
  }
  return pair.privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
}

function generate() {
  return [
    ["READYLINE_MASTER_KEY", randomBytes(32).toString("base64")],
    ["READYLINE_PEPPER", randomBytes(32).toString("base64")],
    ["READYLINE_KEM_PRIVATE", pkcs8("ml-kem-1024")],
    ["READYLINE_SIGN_ED25519_PRIVATE", pkcs8("ed25519")],
    ["READYLINE_SIGN_MLDSA_PRIVATE", pkcs8("ml-dsa-65")],
    // Not read by keys.ts, but required in production by src/server/config.ts (32+ characters).
    ["IP_HASH_SALT", randomBytes(32).toString("base64url")],
    ["CRON_SECRET", randomBytes(32).toString("base64url")],
  ];
}

// Load every value back the way the server does, so a bad key set is never written out.
function check(entries) {
  const env = Object.fromEntries(entries);
  const bytes = (name) => Buffer.from(env[name], "base64").length;
  if (bytes("READYLINE_MASTER_KEY") !== 32) fail("READYLINE_MASTER_KEY is not 32 bytes.");
  if (bytes("READYLINE_PEPPER") < 32) fail("READYLINE_PEPPER is shorter than 32 bytes.");
  const expected = {
    READYLINE_KEM_PRIVATE: "ml-kem-1024",
    READYLINE_SIGN_ED25519_PRIVATE: "ed25519",
    READYLINE_SIGN_MLDSA_PRIVATE: "ml-dsa-65",
  };
  for (const [name, type] of Object.entries(expected)) {
    const key = createPrivateKey({ key: Buffer.from(env[name], "base64"), format: "der", type: "pkcs8" });
    if (key.asymmetricKeyType !== type) fail(`${name} loaded as ${key.asymmetricKeyType}, expected ${type}.`);
  }
  for (const name of ["IP_HASH_SALT", "CRON_SECRET"]) {
    if (env[name].length < 32) fail(`${name} is shorter than 32 characters.`);
  }
}

function writeNew(file, text) {
  let fd;
  try {
    // "wx" is O_CREAT | O_EXCL: fails if the path exists, including as a symlink.
    fd = fs.openSync(file, "wx", 0o600);
  } catch (err) {
    if (err.code === "EEXIST") fail(`${file} already exists. Refusing to overwrite it; choose a new file name.`);
    fail(`Cannot create ${file}: ${err.message}`);
  }
  try {
    fs.fchmodSync(fd, 0o600);
    fs.writeSync(fd, text);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

const { out } = parseArgs(process.argv.slice(2));
const entries = generate();
check(entries);
const lines = entries.map(([k, v]) => `${k}=${v}`).join("\n") + "\n";

if (out) {
  const header = `# Readyline production secrets, generated ${new Date().toISOString()} by scripts/generate-keys.mjs.\n# Keep this file private (mode 0600) and backed up in a secret manager.\n`;
  writeNew(out, header + lines);
  console.error(`Wrote ${entries.length} values to ${out} (mode 0600).`);
} else {
  process.stdout.write(lines);
}

console.error(`
WARNING: store these values in a secret manager and keep an offline backup before you go live.
Losing READYLINE_MASTER_KEY or READYLINE_KEM_PRIVATE makes every sealed record unrecoverable.
Losing READYLINE_PEPPER locks every user out (password hashes and email lookups depend on it).
Generate keys once per deployment: new keys cannot read a database sealed with the old ones.`);
