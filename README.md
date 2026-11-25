# Readyline (working name)

EU Cyber Resilience Act (CRA) compliance for small product teams.

The site has four free tools that work today and double as the lead funnel:

- **Security plan builder** (`/plan`): eight steps (simple or advanced) that produce CRA Annex VII technical documentation: risk register generated from the architecture, how each essential requirement is met with evidence, vulnerability handling, 24/72-hour reporting, an evidence register and a dated, owned action plan. Every gap is shown and becomes an action. Issued revisions carry a SHA-256 fingerprint so later edits are detectable. Exports Markdown and JSON.
- **Sector and country briefs** (`/cra`): generated pages for 14 sectors, 39 countries and every combination, plus 13 guides (`/guides`).

- **CRA readiness check** (`/assessment`): 31 requirements mapped to CRA Annex I and Articles 13, 14 and 31, filtered by product type, scored, with a prioritised and printable action plan. Answers stay in the visitor's browser.
- **Release security gate** (`/release-gate`): decides which security testing a release needs (automated scan, targeted test, full pen test, fix retest) from what changed in the release.

## Develop

```bash
pnpm install
pnpm dev         # http://localhost:3000
pnpm test        # unit tests for scoring and gate logic
pnpm build       # static export to ./out, deploy anywhere (Vercel, Netlify, Cloudflare Pages)
pnpm build:demo  # the whole site as one self-contained HTML file (hash routing) in ./dist-demo
```

## Configuration

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` before deploying (canonical URLs and the sitemap use it). Set `NEXT_PUBLIC_LEAD_ENDPOINT` to capture early-access sign-ups.

## SEO notes

- Indexed: home, tools, 14 sector pages, 39 country pages, 13 guides (see `/sitemap.xml`).
- Sector × country pages (546) are generated but `noindex, follow` until they have genuinely local content, to stay clear of Google's scaled-content-abuse policy. Promote one by adding it to `src/lib/seo/indexing.ts`.
- Country and guide facts live in `src/content/` with sources; review them when the Commission or ENISA publishes updates.

## Where to change things

| What | File |
| --- | --- |
| Company name, contact email, CRA dates | `src/lib/site.ts` |
| Assessment questions, guidance, CRA references | `src/lib/cra-requirements.ts` |
| Plan builder logic (checks, actions, document) | `src/lib/plan/` |
| Sectors, countries, guides | `src/content/` |
| Scoring and prioritisation | `src/lib/assessment-score.ts` |
| Release-gate triggers and rules | `src/lib/release-gate.ts` |
| Landing page copy, pricing, FAQ | `src/components/Home.tsx` |
| Design tokens and components | `src/design/system.css` (see `DESIGN.md`) |
