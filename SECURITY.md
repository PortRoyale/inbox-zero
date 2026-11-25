# Security

## Reporting a vulnerability

Email the contact address in `/.well-known/security.txt` on the live site. It comes from `contactEmail` in `src/lib/site.ts`, which is still the placeholder `hello@example.com`: set a monitored address there before launch. Please include the affected URL or file, the steps to reproduce and the impact you expect. We reply within two working days, keep you updated until it is fixed, and credit you in the release notes if you want.

Please do not access other customers' data beyond what you need to show the issue, do not degrade the service for others (no load or denial-of-service testing), and give us a reasonable time to fix before you publish. Research done in good faith under these terms is welcome and we will not pursue it.

Report security issues privately. Do not open a public GitHub issue for them.

## How the service protects data

This describes the code in this repository. The public version is the trust centre page (`/security/`).

### Cryptography

| Area | What the code does | Where |
| --- | --- | --- |
| Data at rest | Each sensitive value is encrypted with AES-256-GCM under a fresh 256-bit data key. The data key is wrapped with AES-256-GCM under a key derived with HKDF-SHA-512 from the master key and a fresh ML-KEM-1024 shared secret. Opening a record needs both the master key and the ML-KEM private key. The associated data names the record, so a ciphertext cannot be moved to another row. | `src/server/crypto/envelope.ts` |
| Signatures | Plan revisions and evidence exports are signed with Ed25519 and ML-DSA-65 over canonical JSON. Verification requires both signatures. Public keys are at `/api/keys/` and `/.well-known/readyline-keys.json`. | `src/server/crypto/sign.ts` |
| Fingerprints | SHA-512 over canonical JSON of the plan content. The browser and the server compute the same value. | `src/lib/plan/hash.ts` |
| Passwords | scrypt (N 2^15, r 8, p 1, 64-byte output) over HMAC-SHA-512 of the password with a server-side pepper. Unknown accounts take the same time to answer as wrong passwords. Ten failures lock an account for 15 minutes. | `src/server/crypto/secrets.ts`, `src/server/services/accounts.ts` |
| Tokens | Sessions, email verification, password reset and invitations use 256-bit random tokens stored only as SHA-512 digests. Email links are single use and expire. | `src/server/services/accounts.ts`, `src/server/services/orgs.ts` |
| Email addresses | Stored encrypted. Lookups use a keyed HMAC, so the database alone does not list customers. | `src/server/services/accounts.ts` |
| In transit | The supplied Caddy configuration allows TLS 1.3 only and prefers the hybrid X25519MLKEM768 key exchange. | `deploy/Caddyfile` |

All cryptography uses Node.js's built-in `node:crypto` (OpenSSL). There are no third-party crypto libraries.

### Application controls

- **One API dispatcher.** Every API request goes through `src/server/http.ts`, which applies the access rule declared on the route (public, signed in, verified email, superadmin, cron, webhook), checks `Origin` and `Sec-Fetch-Site` on every state-changing request, accepts JSON bodies only, and enforces a byte limit before parsing.
- **Strict input validation.** Request bodies are validated against a schema per route (`src/server/validate.ts`). Stored plans go through `coercePlan`, which rebuilds them field by field with length caps.
- **Team isolation.** Every product, plan, SBOM, incident and export request checks team membership. A record that belongs to another team returns 404, so ids cannot be probed.
- **Roles.** Owner, admin, approver, editor and viewer, enforced on the server. A team always keeps at least one owner.
- **Sessions.** `HttpOnly`, `SameSite=Lax` cookies, `Secure` and `__Host-` prefixed on https. Changing or resetting a password ends every other session.
- **Rate limits.** Sign-up, sign-in (per address and per account), verification email, password reset, invitations, early-access requests and the public SBOM lookup are rate limited.
- **Headers.** Signed-in pages (app, sign-in, sign-up, verification, reset, invitations, admin) get a per-request nonce Content Security Policy with `strict-dynamic` (`src/proxy.ts`). Public pages are prerendered, show no user data and take no HTML input; their static policy allows inline scripts for Next.js's hydration payload and structured data, and limits everything else to the site's own origin. HSTS (on https), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and frame denial are set everywhere (`src/lib/security-headers.ts`).
- **Payments.** Card details are entered on the payment processor's hosted page (Finix or Stripe) and never reach this server. Webhooks are verified with HMAC-SHA256 signatures and a five-minute timestamp window, recorded by event id and applied once. Only the checkout created for a team can activate that team's plan.
- **Audit log.** Changes to teams, members, plans, revisions, releases, SBOMs, incidents, exports and billing are recorded with the acting user and a keyed hash of the client address.
- **Privacy by design.** The free tools run in the browser. The public SBOM check sends only package names, versions and package URLs. There is no analytics and no third-party script.
- **Your data.** Users can export everything as JSON and delete their account, including teams they own alone.

### Deployment hardening (supplied Docker setup)

- The app runs as an unprivileged user with a read-only root filesystem, every Linux capability dropped and `no-new-privileges`. Only Caddy publishes ports.
- Base images are pinned by version and digest.
- The production server refuses to start without https, all keys, an IP hash salt and an email provider (`src/instrumentation.ts`, `src/server/config.ts`).
- `/api/health/` reports healthy only when the database opens and the keys load.

## Keys and their limits

Generate keys once per deployment with `pnpm keys:generate` (`scripts/generate-keys.mjs`) and keep them in a secret manager with an offline backup.

| Key | If it is lost | If it leaks |
| --- | --- | --- |
| `READYLINE_MASTER_KEY` and `READYLINE_KEM_PRIVATE` | Every encrypted record is unrecoverable. | Together with a copy of the database, encrypted records can be read. Either key alone is not enough. |
| `READYLINE_PEPPER` | Nobody can sign in and email lookups fail. | Password hashes become open to offline guessing (still scrypt-hardened). |
| Signing keys | New revisions and exports cannot be signed with the old identity. | Someone could sign records that verify as ours. |
| `IP_HASH_SALT`, `CRON_SECRET` | Replace them; no data depends on them. | Replace them. |

Key rotation is manual today. There is no automated re-encryption, and the server holds one signing key pair at a time. Records keep the key id (`kid`) they were signed with, so after rotating the signing keys publish the old public keys alongside the new ones to keep older records verifiable. Rotating the master or ML-KEM key requires decrypting and re-encrypting the database with a one-off script; plan this before you need it.

## Supported versions

Only the latest commit on the main branch is supported. Dependencies are kept at their latest releases (Next.js, React and React DOM are the only runtime packages).
