// Requires Playwright (preinstalled in CI images; not a project dependency). Run against a started server.
// Edge audit: inside each content column, every framed box (border or fill) that is a direct child must
// share the column's left and right content edges. Flags boxes that stop short (like a follow-up box
// narrower than the answer tiles above it). Usage: node edges.cjs [base]
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:4600';
const COLUMNS = ['.run-pane', '.run-setup', '.run-q-head', '.step-body', '.step-body > .stack-sm', '.step-body > .form-grid', '.record', '.report', '.tab-panel', '.section-head', '.sheet > .stack', '.brief-section', '.guide-body'];

async function walk(p, root, key) {
  for (let i = 0; i < 60; i++) {
    const phase = await p.locator(root).getAttribute('data-phase');
    if (phase === 'review') return;
    await p.keyboard.press(phase === 'level-done' ? 'Enter' : key(i));
    await p.waitForTimeout(phase === 'level-done' ? 300 : 720);
  }
}

const views = [
  ['home', '/', null],
  ['readiness-intro', '/assessment/', async (p) => { await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' }); }],
  ['readiness-q', '/assessment/', async (p) => { await p.getByRole('button', { name: /Start the check/ }).click(); await p.waitForTimeout(300); await p.keyboard.press('?'); await p.keyboard.press('2'); await p.waitForTimeout(150); }],
  ['readiness-level', '/assessment/', async (p) => { await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' }); await p.getByRole('button', { name: /Start the check/ }).click(); for (const k of ['1', '2', '3', '1']) { await p.keyboard.press(k); await p.waitForTimeout(760); } }],
  ['readiness-report', '/assessment/', async (p) => { await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' }); await p.getByRole('button', { name: /Start the check/ }).click(); await walk(p, '#readiness-run', (i) => String((i % 4) + 1)); await p.getByRole('button', { name: /See my report/ }).last().click(); await p.waitForTimeout(300); }],
  ['gate-follow', '/release-gate/', async (p) => { await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' }); await p.getByRole('button', { name: /Start the gate/ }).click(); for (const k of ['1', '1', '2']) { await p.keyboard.press(k); await p.waitForTimeout(760); } await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.press('1'); await p.waitForTimeout(200); }],
  ['gate-record', '/release-gate/', async (p) => { await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' }); await p.getByRole('button', { name: /Load an example/ }).click(); await p.waitForTimeout(300); }],
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`plan-${n}`, '/plan/', async (p) => { const adv = p.getByRole('radio', { name: /advanced/i }).first(); if (await adv.count()) await adv.click().catch(() => {}); await p.locator('.stepper .step-btn').nth(n - 1).click(); await p.waitForTimeout(250); }]),
  ['pricing', '/pricing/', null],
  ['pricing-calc', '/pricing/', async (p) => { await p.getByRole('tab', { name: /Cost calculator/ }).click(); await p.waitForTimeout(250); }],
  ['plan-own', '/plan/', async (p) => { await p.getByRole('button', { name: /Start blank/ }).click(); await p.waitForTimeout(250); }],
  ['sector', '/cra/smart-home-security/', null],
  ['country', '/cra/countries/germany/', null],
  ['guide', '/guides/vulnerability-reporting/', null],
  ['guides', '/guides/', null],
  ['hub', '/cra/', null],
];

(async () => {
  const b = await chromium.launch();
  let fails = 0;
  for (const width of [1280, 390]) {
    const ctx = await b.newContext({ viewport: { width, height: 900 } });
    const p = await ctx.newPage();
    for (const [name, path, prep] of views) {
      if (p.url() !== BASE + path || !prep) await p.goto(BASE + path, { waitUntil: 'networkidle' });
      if (prep) await prep(p);
      const bad = await p.evaluate((cols) => {
        const out = [];
        const framed = (el) => {
          const cs = getComputedStyle(el);
          const border = ['Left', 'Right'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none');
          const fill = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
          return border || fill;
        };
        for (const sel of cols) {
          for (const col of document.querySelectorAll(sel)) {
            if (!col.offsetParent) continue;
            const cs = getComputedStyle(col);
            if (cs.display.includes('grid') && cs.gridTemplateColumns.split(' ').length > 1) continue;
            if (cs.display.includes('flex') && !cs.flexDirection.startsWith('column')) continue;
            const r = col.getBoundingClientRect();
            const left = r.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
            const right = r.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
            for (const child of col.children) {
              if (!child.offsetParent || !framed(child)) continue;
              const ccs = getComputedStyle(child);
              if (ccs.position === 'absolute' || ccs.position === 'fixed' || ccs.display.startsWith('inline')) continue;
              if (child.matches('button, a, .btn, .prio, .fcf, .key, .run-stamp, .seg, h1, h2, h3, p, .visually-hidden')) continue;
              const cr = child.getBoundingClientRect();
              if (Math.abs(cr.left - left) > 1.5 || Math.abs(cr.right - right) > 1.5) {
                out.push(`${sel} > ${child.tagName.toLowerCase()}.${[...child.classList].join('.')}  L${Math.round(cr.left - left)} R${Math.round(right - cr.right)}`);
              }
            }
          }
        }
        return [...new Set(out)];
      }, COLUMNS);
      // Row alignment: in strips and card rows, the n-th row of every cell lines up (same top),
      // and the cells share a bottom edge for their last row.
      const rowBad = await p.evaluate(() => {
        const out = [];
        const groups = [
          ['.control-strip', '.cs-cell', ['.cs-head', '.cs-control']],
          ['.calc-inputs', '.field', ['.label', 'input, select', '.hint']],
          ['.calc-result', '.cr-cell', ['.label', '.cr-figure', '.cr-note']],
          ['.tool-cards', 'li', ['.card-head', 'p', '.btn']],
        ];
        for (const [wrapSel, cellSel, parts] of groups) {
          for (const wrap of document.querySelectorAll(wrapSel)) {
            if (!wrap.offsetParent) continue;
            const cells = [...wrap.querySelectorAll(':scope > ' + cellSel)].filter((c) => c.offsetParent);
            // Only compare cells that sit on the same visual row.
            const rows = new Map();
            for (const c of cells) {
              const t = Math.round(c.getBoundingClientRect().top);
              if (!rows.has(t)) rows.set(t, []);
              rows.get(t).push(c);
            }
            for (const row of rows.values()) {
              if (row.length < 2) continue;
              for (const part of parts) {
                const tops = row.map((c) => c.querySelector(part)).filter(Boolean).map((e) => Math.round(e.getBoundingClientRect().top));
                if (tops.length > 1 && Math.max(...tops) - Math.min(...tops) > 1.5) out.push(`${wrapSel} ${part} tops differ: ${tops.join('/')}`);
              }
            }
          }
        }
        return out;
      });
      bad.push(...rowBad);
      for (const x of bad) console.log(`FAIL  ${width}px  ${name.padEnd(17)} ${x}`);
      if (!bad.length) console.log(`pass  ${width}px  ${name}`);
      fails += bad.length;
    }
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `\n${fails} boxes off the column edges` : '\nAll framed boxes share their column edges');
  process.exit(fails ? 1 : 0);
})();
