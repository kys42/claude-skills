// Packs the exported web build (dist/) into one self-contained HTML body for hosts
// that serve a single page (e.g. a Claude artifact): the bundle is inlined and
// fonts come from Google Fonts. Usage: npm run build:web && node scripts/build-single-html.mjs out.html
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'dist/baljachwi.html';
const dir = 'dist/_expo/static/js/web';
const bundle = readdirSync(dir).find((f) => f.endsWith('.js'));
const js = readFileSync(join(dir, bundle), 'utf8')
  .replaceAll('"/assets/node_modules', '"./assets/node_modules')
  .replace(/<\/(script)/gi, '<\\/$1');

writeFileSync(
  out,
  `<title>발자취</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&family=Gowun+Batang:wght@400;700&display=swap">
<style>
  /* 발자취 — 사계절 길. A single light look by design. */
  :root { --ground: #F6EADA; --ink: #1F2A36; color-scheme: light; }
  html, body { height: 100%; }
  body { overflow: hidden; background: var(--ground); color: var(--ink); font-family: "Gowun Batang", "Nanum Myeongjo", serif; }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<noscript>발자취를 보려면 JavaScript가 필요해요.</noscript>
<script>
${js}
</script>
`,
);
console.log(`wrote ${out}`);
