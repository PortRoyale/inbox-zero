# Readyline (working name)

EU Cyber Resilience Act (CRA) compliance for small product teams.

The site has two free tools that work today and double as the lead funnel:

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

## Where to change things

| What | File |
| --- | --- |
| Company name, contact email, CRA dates | `src/lib/site.ts` |
| Assessment questions, guidance, CRA references | `src/lib/cra-requirements.ts` |
| Scoring and prioritisation | `src/lib/assessment-score.ts` |
| Release-gate triggers and rules | `src/lib/release-gate.ts` |
| Landing page copy, pricing, FAQ | `src/components/Home.tsx` |
| Design tokens and components | `src/design/system.css` (see `DESIGN.md`) |
