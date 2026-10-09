#!/usr/bin/env node
// Runs the design test suites in a real browser.
//
//   node design/test/run.mjs            # everything
//   node design/test/run.mjs repo       # only the single-file page (index.html)
//   node design/test/run.mjs app        # only the live app's view code, in the stand-in harness
//   node design/test/run.mjs measure    # no pass/fail: prints the frame-by-frame motion numbers quoted in DESIGN.md, for both
//
// Needs Node 18+, the `playwright` package (npm i --no-save playwright, or a global install) and a Chromium
// (in the cloud sandbox PLAYWRIGHT_BROWSERS_PATH already points at one). Screenshots go to $OUT or the system temp dir.
//
// What it does: builds a temp folder holding the live app's real page.js and board.css next to stand-ins for the
// three server-side modules (design/test/harness) and a data.json made from the DATA line of index.html; serves that
// folder and the repo root on two local ports; runs each suite with BASE pointing at the right one.
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const design = path.join(root, 'design');
const want = process.argv[2] ?? 'all';
if (!['all', 'repo', 'app', 'measure'].includes(want)) { console.error('usage: run.mjs [all|repo|app|measure]'); process.exit(2); }

// ---- harness folder for the live app -------------------------------------------------------------------------
const tmp = mkdtempSync(path.join(os.tmpdir(), 'physik-harness-'));
const put = (from, to) => { mkdirSync(path.dirname(path.join(tmp, to)), { recursive: true }); copyFileSync(from, path.join(tmp, to)); };
put(path.join(design, 'live-app/page.js'), 'src/claude/view/page.js');
put(path.join(design, 'live-app/board.css'), 'src/claude/styles/board.css');
put(path.join(here, 'harness/dom.js'), 'src/claude/view/dom.js');
put(path.join(here, 'harness/marks-repo.js'), 'src/claude/data/marks-repo.js');
put(path.join(here, 'harness/added-repo.js'), 'src/claude/data/added-repo.js');
put(path.join(here, 'harness/password-gate.js'), 'src/claude/auth/password-gate.js');
put(path.join(here, 'harness/index.html'), 'index.html');

const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const a = html.indexOf('const DATA = ') + 'const DATA = '.length;
const b = html.indexOf(';\nconst UPDATED = ');
const postings = JSON.parse(html.slice(a, b));
const updated = JSON.parse(html.slice(b + ';\nconst UPDATED = '.length, html.indexOf(';\n', b + 20)));
const cfg = JSON.parse(readFileSync(path.join(design, 'categories.json'), 'utf8'));
writeFileSync(path.join(tmp, 'data.json'), JSON.stringify({
  postings: postings.toSorted((x, y) => y.n - x.n),
  meta: { updated, rule: 'Test harness data, copied from index.html.', target_per_area: cfg.target_per_area },
  categories: cfg.categories,
  areas: [['berlin', 'Berlin'], ['leipzig', 'Leipzig area'], ['de', 'Rest of Germany']],
}));

// ---- two tiny static servers ---------------------------------------------------------------------------------
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
function serve(dir) {
  return new Promise(resolve => {
    const s = createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(dir, p);
      if (!file.startsWith(dir) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(readFileSync(file));
    }).listen(0, '127.0.0.1', () => resolve([s, `http://127.0.0.1:${s.address().port}`]));
  });
}
const [repoServer, repoBase] = await serve(root);
const [appServer, appBase] = await serve(tmp);

// ---- run ---------------------------------------------------------------------------------------------------
let globalRoot = '';
try { globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim(); } catch { /* no npm: rely on NODE_PATH */ }
const env = { ...process.env, OUT: process.env.OUT ?? path.join(tmp, 'shots'), NODE_PATH: [process.env.NODE_PATH, globalRoot].filter(Boolean).join(path.delimiter) };
mkdirSync(env.OUT, { recursive: true });

const suites = [
  ['repo', 'repotest.cjs', [], repoBase],
  ['repo', 'citytest.cjs', ['/index.html', 'repo'], repoBase],
  ['app', 'foldtest.cjs', [], appBase],
  ['app', 'citytest.cjs', ['/index.html', 'app'], appBase],
].filter(([kind]) => want === 'all' || want === kind);

// The suites run as child processes; they must be awaited asynchronously, because the servers above live in this process.
const run = (file, args, base) => new Promise(resolve => {
  const child = spawn('node', [path.join(here, file), ...args.map((x, i) => (i === 0 ? base + x : x))], { env: { ...env, BASE: base } });
  let out = '';
  child.stdout.on('data', d => { out += d; });
  child.stderr.on('data', d => { out += d; });
  const timer = setTimeout(() => child.kill(), 600000);
  child.on('close', status => { clearTimeout(timer); resolve({ out, status }); });
});

if (want === 'measure') {
  for (const [kind, base] of [['live app (harness)', appBase], ['single-file page', repoBase]]) {
    console.log(`\n=== ${kind} ===`);
    const r = await run('measure.cjs', ['/index.html', kind.startsWith('live') ? 'app' : 'repo'], base);
    console.log(r.out.trimEnd());
  }
  repoServer.close(); appServer.close();
  process.exit(0);
}

let failed = 0, passed = 0;
for (const [kind, file, args, base] of suites) {
  const r = await run(file, args, base);
  const out = r.out;
  const p = (out.match(/^PASS /gm) ?? []).length;
  const crashed = /TEST CRASH/.test(out) || (r.status !== 0 && !/^FAIL /m.test(out));
  const f = (out.match(/^FAIL /gm) ?? []).length + (crashed ? 1 : 0);
  passed += p; failed += f;
  console.log(`${f ? 'FAIL' : 'ok  '}  ${kind.padEnd(4)} ${file.padEnd(14)} ${args[1] ? '(' + args[1] + ') ' : ''}${p} passed${f ? `, ${f} failed` : ''}`);
  for (const line of out.split('\n')) if (/^FAIL |TEST CRASH/.test(line)) console.log('      ' + line.slice(0, 400));
}

repoServer.close(); appServer.close();
console.log(`\n${passed} passed, ${failed} failed. Screenshots: ${env.OUT}`);
process.exit(failed ? 1 : 0);
