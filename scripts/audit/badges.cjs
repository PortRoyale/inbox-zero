// Requires Playwright (preinstalled in CI images; not a project dependency). Run against a started server.
// Badge-size audit: every badge in a family must have identical width and height, on every page,
// at desktop and phone widths. Exits non-zero on any mismatch.
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:4600';
const FAMILIES = ['.run-answer-chip', '.prio', '.risk-level', '.issue-sev', '.outcome-tag', '.step-state', '.run-map-meta', '.risk-table .risk-level'];

async function walkReadiness(p) {
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /Start the check/ }).click();
  const keys = ['1', '2', '3', '4', '1', '3', '2'];
  for (let i = 0; i < 80; i++) {
    const phase = await p.locator('#readiness-run').getAttribute('data-phase');
    if (phase === 'review') break;
    await p.keyboard.press(phase === 'level-done' ? 'Enter' : keys[i % keys.length]);
    await p.waitForTimeout(phase === 'level-done' ? 300 : 720);
  }
}

const views = [
  { name: 'readiness-review', path: '/assessment/', prep: walkReadiness },
  {
    name: 'readiness-report',
    path: '/assessment/',
    prep: async (p) => {
      await walkReadiness(p);
      await p.getByRole('button', { name: /See my report/ }).last().click();
      await p.waitForTimeout(300);
    },
  },
  {
    name: 'gate-record',
    path: '/release-gate/',
    prep: async (p) => {
      await p.evaluate(() => localStorage.clear());
      await p.reload({ waitUntil: 'networkidle' });
      await p.getByRole('button', { name: /Load an example/ }).click();
      await p.waitForTimeout(400);
    },
  },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    name: `plan-step-${n}`,
    path: '/plan/',
    prep: async (p) => {
      const adv = p.getByRole('radio', { name: /advanced/i }).first();
      if (await adv.count()) await adv.click().catch(() => {});
      await p.locator('.stepper .step-btn').nth(n - 1).click();
      await p.waitForTimeout(250);
    },
  })),
];

(async () => {
  const b = await chromium.launch();
  let failures = 0;
  for (const width of [1280, 390]) {
    const ctx = await b.newContext({ viewport: { width, height: 900 } });
    const p = await ctx.newPage();
    for (const v of views) {
      await p.goto(BASE + v.path, { waitUntil: 'networkidle' });
      await v.prep(p);
      const report = await p.evaluate((families) => {
        const out = [];
        for (const sel of families) {
          const els = [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length && e.offsetParent !== null);
          if (els.length < 2) continue;
          const sizes = els.map((e) => {
            const r = e.getBoundingClientRect();
            return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, t: e.textContent.trim().slice(0, 14) };
          });
          const ws = [...new Set(sizes.map((s) => s.w))];
          const hs = [...new Set(sizes.map((s) => s.h))];
          const overflow = els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim());
          out.push({ sel, n: els.length, widths: ws, heights: hs, overflow, sample: sizes.slice(0, 3) });
        }
        return out;
      }, FAMILIES);
      for (const r of report) {
        const ok = r.widths.length === 1 && r.heights.length === 1 && r.overflow.length === 0;
        if (!ok) failures++;
        console.log(`${ok ? 'pass' : 'FAIL'}  ${width}px  ${v.name.padEnd(17)} ${r.sel.padEnd(24)} n=${String(r.n).padEnd(3)} w=${r.widths.join('/')} h=${r.heights.join('/')}${r.overflow.length ? ' overflow=' + r.overflow.join(',') : ''}`);
      }
    }
    await ctx.close();
  }
  await b.close();
  console.log(failures ? `\n${failures} badge families differ` : '\nAll badge families uniform');
  process.exit(failures ? 1 : 0);
})();
