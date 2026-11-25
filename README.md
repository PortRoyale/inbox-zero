# Readyline (working name)

EU Cyber Resilience Act (CRA) compliance for small product teams: free tools that work without an account, and a paid workspace that keeps a team's plans, releases, SBOMs, incidents and evidence in one signed record.

## What is in it

**Free tools** (no account; answers stay in the browser):

| Tool | Path | What it does |
| --- | --- | --- |
| Security plan builder | `/plan/` | Eight steps to CRA Annex VII technical documentation: risk register, how each essential requirement is met, vulnerability handling, 24/72-hour reporting, evidence register and a dated action plan. Exports Markdown and JSON. |
| Readiness check | `/assessment/` | 31 requirements mapped to Annex I and Articles 13, 14 and 31, one question at a time, with a scored report and fix register. |
| Release gate | `/release-gate/` | Decides each release's security testing from what changed and writes the release record. |
| SBOM check | `/tools/sbom-check/` | Scores a CycloneDX or SPDX SBOM against the NTIA minimum elements and lists known vulnerabilities from OSV. The file is parsed in the browser; only package identifiers are sent. |
| Incident clock | `/tools/incident-clock/` | Every Article 14 deadline from the moment of awareness, with report drafts for each stage. |
| Signature check | `/verify-signature/` | Verifies a signed plan revision or evidence export against the public keys. |
| Sector and country briefs | `/cra/`, `/guides/` | Generated pages for 14 sectors, 39 countries and every combination, plus 13 guides. |

**Workspace** (`/app/`, after sign-up; 14-day trial):

- Teams with owner, admin, approver, editor and viewer roles, and email invitations.
- Products with a cloud-saved security plan. Approvers issue revisions signed with Ed25519 and ML-DSA-65.
- Release records per product, from the release gate.
- SBOM watch: upload SBOMs; they are re-checked against OSV every hour and owners are emailed about new critical and high findings, with triage per finding.
- Incident clock per product with a shared timeline and report drafts.
- Signed evidence export (JSON) for auditors; anyone can verify it at `/verify-signature/`.
- Billing through Finix (yearly prepay) or Stripe (monthly subscription), or plans granted by hand.
- Admin page for superadmins: early-access requests, every team, manual plans.

Security design: see [`SECURITY.md`](SECURITY.md) and the public trust centre at `/security/`.

## Develop

Needs Node.js 24.7 or later (for `node:sqlite`, ML-KEM and ML-DSA in `node:crypto`) and pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # unit, API and security tests (vitest)
pnpm typecheck
pnpm build        # production build (.next/standalone)
pnpm build:demo   # the public site as one self-contained HTML file (hash routing, no server)
```

Development needs no configuration. On first start the server creates `.data/` with a SQLite database and a development key set (`.data/dev-keys.json`, mode 0600). Emails are printed to the server log instead of being sent, so you can open verification and reset links from there. Add your address to `SUPERADMIN_EMAILS` in `.env.local` to see the admin page.

To try a production build locally over plain http:

```bash
pnpm build
NODE_ENV=production READYLINE_ALLOW_INSECURE=1 APP_URL=http://localhost:3000 pnpm start
```

## Run in production

The supplied setup is Docker Compose with two containers: the app (Node.js, unprivileged, read-only filesystem) and Caddy in front of it (automatic HTTPS, TLS 1.3 only, post-quantum hybrid key exchange). The database is SQLite on a Docker volume.

1. **Server and DNS.** Any Linux host with Docker. Point your domain's A/AAAA records at it and open ports 80 and 443.

2. **Secrets.** Generate a key set into a new file (it refuses to overwrite one):

   ```bash
   node scripts/generate-keys.mjs --out .env.production
   ```

   Store a copy in a secret manager and an offline backup now. Losing `READYLINE_MASTER_KEY` or `READYLINE_KEM_PRIVATE` makes the data unreadable; losing `READYLINE_PEPPER` locks everyone out. See `SECURITY.md`, "Keys and their limits".

3. **Settings.** Append the rest from `.env.example` to `.env.production`. At minimum:

   ```bash
   APP_URL=https://app.example.com
   NEXT_PUBLIC_SITE_URL=https://app.example.com
   APP_DOMAIN=app.example.com
   RESEND_API_KEY=...            # or POSTMARK_SERVER_TOKEN
   MAIL_FROM=Readyline <no-reply@example.com>
   SUPERADMIN_EMAILS=you@example.com
   BILLING_PROVIDER=none         # or finix / stripe, see below
   ```

   Also set the company name, contact email and CRA dates in `src/lib/site.ts`. The contact email is what `/.well-known/security.txt` publishes.

4. **Start.**

   ```bash
   docker compose -f deploy/compose.yaml --env-file .env.production up -d --build
   ```

   The server refuses to start with a missing key, an http `APP_URL`, no IP hash salt or no email provider. `docker compose -f deploy/compose.yaml ps` shows the app as healthy once `/api/health/` answers (database open, keys loaded).

5. **Scheduled jobs.** Add both to the host's crontab, with the `CRON_SECRET` value from `.env.production`:

   ```bash
   CRON_SECRET=paste-the-value-from-.env.production
   17 * * * * curl -fsS --max-time 300 -X POST -H "Authorization: Bearer $CRON_SECRET" https://app.example.com/api/cron/sbom-watch/ > /dev/null
   41 6 * * * curl -fsS --max-time 120 -X POST -H "Authorization: Bearer $CRON_SECRET" https://app.example.com/api/cron/billing/ > /dev/null
   ```

   `sbom-watch` (hourly) re-checks stored SBOMs and sends alerts. `billing` (daily) sends renewal reminders and ends lapsed plans. Keep the trailing slashes.

6. **Sign up** with an address listed in `SUPERADMIN_EMAILS`, then open `/admin/`.

### Billing

Teams start with a 14-day trial. When a plan lapses, the team's workspace becomes read-only: people can still read, export and delete their data, and open and update incidents.

**Finix** (`BILLING_PROVIDER=finix`): yearly prepay through a Finix hosted checkout form.

1. Set `FINIX_API_URL` (sandbox `https://finix.sandbox-payments-api.com`, live `https://finix.live-payments-api.com`), `FINIX_USERNAME`, `FINIX_PASSWORD` (an API key pair) and `FINIX_MERCHANT_ID`.
2. Set the yearly prices in minor units and the currency your merchant settles in: `FINIX_PRICE_STARTER_YEAR`, `FINIX_PRICE_TEAM_YEAR`, `FINIX_CURRENCY`. The defaults (178800 and 598800, USD) are 149 and 499 a month paid yearly; the pricing page shows euros, so set the currency to match what your Finix account supports and update the page if they differ.
3. In the Finix dashboard, create a webhook to `https://app.example.com/api/billing/webhook/finix/` with checkout form events enabled. Copy its secret signing key to `FINIX_WEBHOOK_SIGNING_KEY`. If you also set bearer authentication on the webhook, put the token in `FINIX_WEBHOOK_BEARER`.
4. Test in the sandbox: start a checkout from `/app/account/`, pay with a Finix test card and check the plan shows as active.

The Finix request and event field names in `src/server/services/billing.ts` follow Finix's checkout form API (`POST /checkout_forms`, `Finix-Version: 2022-02-01`) and are covered by tests against a mock. Check them against the current Finix API reference in the sandbox before going live.

**Stripe** (`BILLING_PROVIDER=stripe`): monthly subscriptions through Stripe Checkout, managed in the Stripe customer portal.

1. Create two recurring prices (Starter and Team) and set `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_TEAM` to their ids, and `STRIPE_SECRET_KEY` to a restricted or secret key.
2. Add a webhook endpoint `https://app.example.com/api/billing/webhook/stripe/` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` and `invoice.payment_failed`. Set `STRIPE_WEBHOOK_SECRET` to its signing secret.
3. Turn on the customer portal in the Stripe dashboard. Set `STRIPE_AUTOMATIC_TAX=1` if Stripe Tax is set up.

**None** (`BILLING_PROVIDER=none`): superadmins grant plans from `/admin/` (for invoiced customers or pilots).

### Backups

Everything is in one SQLite database (`/data/readyline.db`, WAL mode). Take a consistent online copy without stopping the app:

```bash
docker compose -f deploy/compose.yaml exec app node -e "const{DatabaseSync,backup}=require('node:sqlite');backup(new DatabaseSync('/data/readyline.db',{readOnly:true}),'/data/backup.db').then(()=>console.log('ok'))"
docker compose -f deploy/compose.yaml cp app:/data/backup.db ./readyline-$(date +%F).db
docker compose -f deploy/compose.yaml exec app rm /data/backup.db
```

Sensitive fields are encrypted, but treat backups as sensitive anyway. A backup is only useful together with the keys, so store the keys separately and test a restore.

### Updating

```bash
git pull
docker compose -f deploy/compose.yaml --env-file .env.production up -d --build
```

Database migrations run automatically at start. Take a backup first.

## SEO notes

- Indexed: home, tools, 14 sector pages, 39 country pages, 13 guides (see `/sitemap.xml`).
- Sector by country pages (546) are generated but `noindex, follow` until they have genuinely local content, to stay clear of Google's scaled-content-abuse policy. Promote one by adding it to `src/lib/seo/indexing.ts`.
- Country and guide facts live in `src/content/` with sources; review them when the Commission or ENISA publishes updates.

## Where to change things

| What | File |
| --- | --- |
| Company name, contact email, CRA dates | `src/lib/site.ts` |
| Assessment questions, guidance, CRA references | `src/lib/cra-requirements.ts` |
| Plan builder logic (checks, actions, document) | `src/lib/plan/` |
| SBOM parsing, quality score, CVSS, OSV client | `src/lib/sbom/` |
| Incident deadlines and report drafts | `src/lib/incidents/` |
| Sectors, countries, guides | `src/content/` |
| Scoring and prioritisation | `src/lib/assessment-score.ts` |
| Release-gate triggers and rules | `src/lib/release-gate.ts` |
| Landing page copy | `src/components/Home.tsx` |
| Pricing page | `src/components/sales/Pricing.tsx` |
| API routes | `src/server/api/` (one dispatcher in `src/server/http.ts`) |
| Accounts, teams, products, SBOM, incidents, billing | `src/server/services/` |
| Database schema | `src/server/migrations.ts` |
| Plan tiers and limits | `src/server/services/orgs.ts` (`TIERS`) |
| Security headers | `src/lib/security-headers.ts`, `src/proxy.ts` |
| Design tokens and components | `src/design/` (see `DESIGN.md`) |
| Deployment | `Dockerfile`, `deploy/` |
