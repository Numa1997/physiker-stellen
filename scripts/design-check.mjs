#!/usr/bin/env node
// design-check.mjs: checks that the code still follows DESIGN.md.
//
//   node scripts/design-check.mjs            report, exit 1 on errors
//   node scripts/design-check.mjs --tokens   also print every colour token, light and dark
//
// No dependencies. What it checks, and why (each rule is explained in DESIGN.md):
//   1. Themes   the dark block and the "auto" (system dark) block define the same tokens with the
//               same values, and every colour token of the light block has a dark value.
//   2. Contrast WCAG 2.x contrast of each text token on the page ground and on cards, in both
//               themes; section colours on white cards and on their own tinted header band.
//   3. Fonts    the Google Fonts request loads exactly the house families; no other family is
//               named anywhere; the display serif (one weight only) is never set bold.
//   4. Literals colour literals outside the token blocks (each one is a colour that will not
//               follow the theme); listed as warnings with file and line.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------- configuration (per app)
const CONFIG = {
  app: 'Physik Radar',
  tokens: 'src/claude/styles/board.css',   // the file that holds :root, dark and auto blocks
  fontsIn: ['index.html'],                 // where the Google Fonts request lives
  families: ['Instrument Serif', 'IBM Plex Sans', 'IBM Plex Mono'],
  displaySerif: 'Instrument Serif',        // ships in weight 400 only: never bold
  allowedFamilies: ['Instrument Serif', 'IBM Plex Sans', 'IBM Plex Mono', 'Georgia', 'Times New Roman', 'Segoe UI', 'Menlo',
    'system-ui', '-apple-system', 'ui-monospace', 'serif', 'sans-serif', 'monospace'],
  // what the page actually mounts: index.html -> src/claude/boot.js (static GitHub Pages copy).
  scan: ['index.html', 'src/claude'],
  exts: ['.css', '.ts', '.tsx', '.js', '.mjs', '.html'],
  skip: [],
  // literals that are deliberate, with the reason (see DESIGN.md, "Deliberate exceptions")
  allowLiterals: [
    { file: 'src/claude/styles/board.css', match: /\[data-cat="[a-z]+"\] \{ --cat-base:/, why: 'category base colours (mixed per theme)' },
    { file: 'src/claude/styles/board.css', match: /color-mix\(in srgb, var\(--cat-base\) 55%, #fff\)/, why: 'dark-theme lightening of category colours' },
    { file: 'src/claude/styles/gate.css', match: /./, why: 'the sign-in screen is always light (the theme is chosen after sign-in)' },
  ],
  text: [ // token, role, minimum contrast
    ['--ink', 'body text, job titles', 4.5], ['--ink2', 'secondary text, quotes', 4.5], ['--muted', 'notes, counts', 4.5],
    ['--faint', 'small mono labels, card numbers', 3], ['--wine', 'accent, Berlin, links, Not relevant', 4.5],
    ['--amber', 'Leipzig, "added by you"', 4.5], ['--slate', 'rest of Germany', 4.5], ['--ok', 'Applied', 4.5],
  ],
  grounds: ['--bg', '--card', '--quote'],
};
// ----------------------------------------------------------------------------------------

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const showTokens = process.argv.includes('--tokens');
const errors = [], warnings = [];
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

function block(css, opener) { // the body of the first block whose header matches `opener`
  const m = opener.exec(css); if (!m) return null;
  let i = css.indexOf('{', m.index) + 1, depth = 1, start = i;
  for (; i < css.length && depth; i++) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; }
  return css.slice(start, i - 1);
}
function decls(body) {
  const out = {};
  for (const m of (body ?? '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const css = read(CONFIG.tokens);
const light = decls(block(css, /(^|\n)\s*:root\s*\{/));
const dark = decls(block(css, /:root\[data-theme="dark"\]\s*\{/));
const autoMedia = block(css, /@media \(prefers-color-scheme: dark\)\s*\{/);
const auto = decls(autoMedia ? block(autoMedia, /:root\[data-theme="auto"\]\s*\{/) : '');

// ---- colour arithmetic
function parseColor(v) {
  v = v.trim().toLowerCase();
  if (v === 'white') return [255, 255, 255, 1];
  let m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (m) { let h = m[1]; if (h.length <= 4) h = [...h].map((c) => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1]; }
  m = /^rgba?\(([^)]+)\)$/.exec(v);
  if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
  return null;
}
const resolve = (tokens, v, depth = 0) => { const m = /^var\((--[\w-]+)\)$/.exec(v?.trim() ?? ''); return m && depth < 8 ? resolve(tokens, tokens[m[1]], depth + 1) : v; };
const mix = (a, b, t) => a.map((x, i) => i < 3 ? x * t + b[i] * (1 - t) : 1); // t of a, rest b (srgb)
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = (c) => '#' + c.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');

// ---- 1. themes
const colourTokens = Object.keys(light).filter((k) => parseColor(resolve(light, light[k]) ?? ''));
if (!Object.keys(dark).length) errors.push('no :root[data-theme="dark"] block in ' + CONFIG.tokens);
if (!Object.keys(auto).length) errors.push('no @media (prefers-color-scheme: dark) { :root[data-theme="auto"] } block in ' + CONFIG.tokens);
for (const k of new Set([...Object.keys(dark), ...Object.keys(auto)])) {
  if (dark[k] !== auto[k]) errors.push(`theme blocks disagree on ${k}: dark "${dark[k]}" vs auto "${auto[k]}"`);
}
for (const k of colourTokens) if (!(k in dark) && !/^--(shade|on-fill|fold)/.test(k)) warnings.push(`${k} has no dark value (stays ${light[k]} in dark mode)`);

// ---- 2. contrast
const themes = { light, dark: { ...light, ...dark } };
const rows = [];
for (const [name, t] of Object.entries(themes)) {
  for (const [tok, role, min] of CONFIG.text) {
    const fg = parseColor(resolve(t, t[tok]) ?? '');
    if (!fg) { warnings.push(`${tok} not defined`); continue; }
    for (const g of CONFIG.grounds) {
      const bg = parseColor(resolve(t, t[g]) ?? ''); if (!bg) continue;
      const c = contrast(fg, bg);
      rows.push([name, tok, g, c.toFixed(2), min]);
      if (c < min) (min >= 4.5 && tok !== '--faint' ? errors : warnings).push(`${name}: ${tok} (${role}) on ${g} is ${c.toFixed(2)}:1, needs ${min}:1`);
    }
  }
}
// section colours: [data-cat="x"] { --cat-base: #... }
const cats = [...css.matchAll(/\[data-cat="([\w-]+)"\]\s*\{\s*--cat-base:\s*(#[0-9a-fA-F]{3,8})/g)].map((m) => [m[1], parseColor(m[2])]);
const catRows = [];
for (const [key, base] of cats) {
  for (const [name, t] of Object.entries(themes)) {
    const card = parseColor(resolve(t, t['--card']));
    const cat = name === 'light' ? base : mix(base, [255, 255, 255], 0.55);
    const soft = mix(cat, card, name === 'light' ? 0.08 : 0.10);
    const onCard = contrast(cat, card), onSoft = contrast(cat, soft);
    catRows.push([key, name, hex(cat), onCard.toFixed(2), onSoft.toFixed(2)]);
    if (onSoft < 3) errors.push(`section "${key}" (${name}): title ${hex(cat)} on its header band is ${onSoft.toFixed(2)}:1, needs 3:1 (28 px title)`);
  }
}

// ---- 3. fonts, and 4. literals
function walk(dir, out = []) {
  if (statSync(join(ROOT, dir)).isFile()) { out.push(dir); return out; }
  for (const f of readdirSync(join(ROOT, dir))) {
    const p = join(dir, f);
    if (CONFIG.skip.some((s) => p.startsWith(s))) continue;
    const st = statSync(join(ROOT, p));
    if (st.isDirectory()) walk(p, out); else if (CONFIG.exts.includes(extname(p))) out.push(p);
  }
  return out;
}
const files = CONFIG.scan.flatMap((d) => walk(d));
const fontReq = CONFIG.fontsIn.map(read).join('\n').match(/fonts\.googleapis\.com\/css2\?[^'")\s]+/g) ?? [];
if (!fontReq.length) errors.push('no Google Fonts request found in ' + CONFIG.fontsIn.join(', '));
for (const fam of CONFIG.families) if (!fontReq.some((u) => u.includes('family=' + fam.replace(/ /g, '+')))) errors.push(`Google Fonts request does not load ${fam}`);
for (const u of fontReq) for (const m of u.matchAll(/family=([^:&]+)/g)) { const fam = decodeURIComponent(m[1]).replace(/\+/g, ' '); if (!CONFIG.families.includes(fam)) errors.push(`Google Fonts request loads a family outside the house set: ${fam}`); }
const literalHits = [];
for (const f of files) {
  const text = read(f), lines = text.split('\n');
  // named families
  for (const m of text.matchAll(/font(?:-family)?\s*:\s*([^;}"]+)[;}]|fontFamily\s*[:=]\s*['"`]([^'"`]+)['"`]/g)) {
    for (const q of (m[1] ?? m[2]).matchAll(/'([^']+)'|"([^"]+)"/g)) {
      const fam = q[1] ?? q[2];
      if (!CONFIG.allowedFamilies.includes(fam) && !/^KaTeX/.test(fam)) errors.push(`${f}: font family "${fam}" is not part of the house set`);
    }
  }
  // display serif set bold
  if (extname(f) === '.css') {
    for (const r of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const body = r[2];
      const serif = /var\(--serif\)/.test(body) || body.includes(CONFIG.displaySerif) || /^\s*(h[1-4]|\.serif)\b/.test(r[1].trim());
      const bold = /font-weight\s*:\s*(bold|[5-9]00)/.test(body) || /font\s*:\s*(bold|[5-9]00)\s[^;]*var\(--serif\)/.test(body);
      if (serif && bold && !/var\(--sans\)|var\(--mono\)/.test(body.match(/font[^;]*/)?.[0] ?? '')) errors.push(`${f}: "${r[1].trim().slice(0, 60)}" sets ${CONFIG.displaySerif} bold (only weight 400 exists)`);
    }
  }
  // colour literals outside the token blocks
  let inTokens = 0;
  lines.forEach((line, i) => {
    if (f === CONFIG.tokens) {
      if (/^\s*:root(\[data-theme="(dark|auto)"\])?\s*\{[^}]*$|^@media \(prefers-color-scheme: dark\) \{ :root\[data-theme="auto"\] \{\s*$/.test(line)) inTokens = 1;
      if (inTokens && /^\s*\}\s*\}?\s*$|^\s*color-scheme: dark;\s*\}\s*\}?\s*$/.test(line)) { inTokens = 0; return; }
      if (inTokens) return;
    }
    if (!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(line)) return;
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    if (CONFIG.allowLiterals.some((a) => a.file === f && a.match.test(line))) return;
    literalHits.push(`${f}:${i + 1}  ${line.trim().slice(0, 110)}`);
  });
}
for (const h of literalHits) warnings.push('colour literal (will not follow the theme): ' + h);

// ---- report
console.log(`design-check · ${CONFIG.app}\n`);
console.log('Contrast of text tokens (WCAG ratio, minimum in brackets)');
for (const name of Object.keys(themes)) {
  console.log(`  ${name}`);
  for (const [tok, , min] of CONFIG.text) {
    const cells = rows.filter((r) => r[0] === name && r[1] === tok).map((r) => `${r[2]} ${r[3]}`).join('   ');
    console.log(`    ${tok.padEnd(9)} [${min}]  ${cells}`);
  }
}
if (catRows.length) {
  console.log('\nSection colours (title colour, on white card, on its header band)');
  for (const [key, name, h, a, b] of catRows) console.log(`    ${key.padEnd(14)} ${name.padEnd(5)} ${h}   card ${a}   band ${b}`);
}
if (showTokens) {
  console.log('\nColour tokens');
  for (const k of colourTokens) console.log(`    ${k.padEnd(14)} light ${String(light[k]).padEnd(24)} dark ${dark[k] ?? '(light value)'}`);
}
console.log(`\nFiles scanned: ${files.length} · fonts requested: ${CONFIG.families.join(', ')}`);
for (const w of warnings) console.log('  warning  ' + w);
for (const e of errors) console.log('  ERROR    ' + e);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
