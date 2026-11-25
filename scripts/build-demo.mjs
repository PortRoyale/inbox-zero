// Builds the whole site as one self-contained HTML page with hash routing,
// for hosts that serve a single file (e.g. a claude.ai artifact).
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = resolve(process.argv[2] ?? `${root}/dist-demo/index.html`);

const { outputFiles } = await build({
  entryPoints: [`${root}/src/demo/main.tsx`],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  write: false,
  alias: { "@": `${root}/src` },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_ROUTING": '"hash"',
    "process.env.NEXT_PUBLIC_SITE_URL": "undefined",
    "process.env.NEXT_PUBLIC_LEAD_ENDPOINT": "undefined",
  },
  logOverride: { "unsupported-directive": "silent" },
});

if (/\bprocess\.env\b/.test(outputFiles[0].text)) throw new Error("Unresolved process.env reference in demo bundle; add it to define.");
const js = outputFiles[0].text.replaceAll("</script", "<\\/script");
const css = ["system.css", "pages.css", "plan.css", "flair.css", "brand.css"].map((f) => readFileSync(`${root}/src/design/${f}`, "utf8")).join("\n");

const html = `<title>Readyline CRA Readiness</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="EU Cyber Resilience Act readiness check and release security gate for small product teams.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=B612:wght@700&family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,700;1,400&family=Atkinson+Hyperlegible+Mono:wght@400;700&display=swap">
<style>
${css}
</style>
<div id="root"></div>
<script>
${js}
</script>
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, html);
console.log(`Wrote ${outFile} (${(html.length / 1024).toFixed(0)} KB)`);
