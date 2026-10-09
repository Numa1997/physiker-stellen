// Measures the fold motion frame by frame (one sample per requestAnimationFrame) and prints the numbers that
// DESIGN.md quotes. Not a pass/fail suite: it is the instrument the suites were derived from.
//
//   node design/test/run.mjs measure     # runs this against the live app's harness and the single-file page
// or by hand: node design/test/measure.cjs http://127.0.0.1:PORT/index.html <app|repo>
//
// Viewport 1280 x 900. The category used is `systems`; its three cities are opened first so the category body is tall.
const { chromium } = require('playwright');
const URL = process.argv[2] || (process.env.BASE + '/index.html');
const KIND = process.argv[3] || 'app';
const peakSpeed = pts => { let m = 0; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dt = pts[j][0] - pts[i][0]; if (dt >= 30) { m = Math.max(m, Math.abs(pts[j][1] - pts[i][1]) / dt); break; } } return m; };  // px/ms over windows of at least 30 ms: one frame alone is too noisy (scroll and sampler can share a frame or sit one apart)
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto(URL);
  if (KIND === 'app') await page.waitForFunction(() => window.__ready === true); else await page.waitForSelector('section.cat');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  if (KIND === 'app') await page.waitForFunction(() => window.__ready === true); else await page.waitForSelector('section.cat');
  const barBottom = () => page.evaluate(() => document.querySelector('.bar')?.getBoundingClientRect().bottom ?? 0);
  const B = Math.round(await barBottom());
  const sample = (selFold, toggleSel, ms) => page.evaluate(([f, t, ms]) => new Promise(res => {
    const fold = document.querySelector(f), out = [], t0 = performance.now();
    document.querySelector(t).click();
    (function tick() { out.push([Math.round(performance.now() - t0), Math.round(fold.getBoundingClientRect().height)]); if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res(out); })();
  }), [selFold, toggleSel, ms]);

  // 1. Opening a category whose header sits low in the window
  const low = await page.evaluate(() => { const r = document.getElementById('cat-systems').getBoundingClientRect(); return { headerTop: Math.round(r.top), windowH: innerHeight }; });
  for (const a of ['berlin', 'leipzig', 'de']) { /* cities are folded; open them after the category */ }
  await page.click('#cat-systems > [data-head] h2'); await page.waitForTimeout(900);
  const afterOpen = await page.evaluate(() => { const sec = document.getElementById('cat-systems'), body = sec.querySelector(':scope > [data-fold] .fold-i > *').getBoundingClientRect(); return { headerTop: Math.round(sec.getBoundingClientRect().top), bodyVisiblePx: Math.round(Math.max(0, Math.min(body.bottom, innerHeight) - Math.max(body.top, 0))), bodyPx: Math.round(body.height), scrollY: Math.round(scrollY) }; });
  console.log('1. open a low category   before:', JSON.stringify(low), ' after:', JSON.stringify(afterOpen), ' (single-file page: top bar bottom =', B + ')');

  // 2. Frame samples of a category opening (fold height against time)
  await page.click('#cat-systems > [data-head] [data-toggle]'); await page.waitForTimeout(700);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  const open = await sample('#cat-systems > [data-fold]', '#cat-systems > [data-head] [data-toggle]', 700);
  const full = open[open.length - 1][1];
  const settled = open.find((s, i) => i > 2 && s[1] === full)?.[0];
  const pct = s => (100 * s[1] / full).toFixed(1) + ' %';
  console.log('2. open frames: full height', full, 'px; settled at', settled, 'ms; frames:', open.length);
  console.log('   ' + open.filter(s => s[0] > 0).slice(0, 10).map(s => s[0] + ' ms: ' + pct(s)).join(' | '));
  let nonMono = 0; for (let i = 1; i < open.length; i++) if (open[i][1] < open[i - 1][1]) nonMono++;
  console.log('   frames where the height went down while opening:', nonMono);

  // 3. Closing from deep inside (open the three cities, put the last one under the pinned header, close the category)
  for (const a of ['berlin', 'leipzig', 'de']) { await page.click(`#area-systems-${a} > [data-head] [data-toggle]`); await page.waitForTimeout(500); }
  await page.evaluate(() => { const a = document.getElementById('area-systems-de'); const sec = document.getElementById('cat-systems'); const head = sec.querySelector(':scope > [data-head]').getBoundingClientRect().height; scrollTo({ top: scrollY + a.getBoundingClientRect().top - head - (document.querySelector('.bar')?.getBoundingClientRect().bottom ?? 0) + 300, behavior: 'instant' }); });
  await page.waitForTimeout(250);
  const deep = await page.evaluate(() => new Promise(res => {
    const head = document.querySelector('#cat-systems > [data-head]'), pts = [], t0 = performance.now(), y0 = scrollY;
    head.click();
    (function tick() { pts.push([Math.round(performance.now() - t0), Math.round(head.getBoundingClientRect().top), Math.round(scrollY)]); if (performance.now() - t0 < 700) requestAnimationFrame(tick); else res({ pts, y0 }); })();
  }));
  const peak = peakSpeed(deep.pts.map(p => [p[0], p[1]]));
  const travel = Math.abs(deep.pts[deep.pts.length - 1][1] - deep.pts[0][1]);
  const end = deep.pts.find((p, i) => i > 2 && p[1] === deep.pts[deep.pts.length - 1][1])?.[0] ?? 1;
  console.log('3. close from deep inside: header top', deep.pts[0][1], '->', deep.pts[deep.pts.length - 1][1], 'px (travel', travel, 'px in', end, 'ms); peak speed', peak.toFixed(2), 'px/ms (30 ms windows); mean', (travel / end).toFixed(2), 'px/ms; ratio', travel ? (peak / (travel / end)).toFixed(2) : 'n/a');
  console.log('   header top, every 4th frame:', JSON.stringify(deep.pts.filter((_, i) => i % 4 === 0).map(p => [p[0], p[1]])));

  // 4. Header size, open against closed
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  const hOpen = await page.$eval('#cat-systems > [data-head]', h => Math.round(h.getBoundingClientRect().height));
  await page.click('#cat-systems > [data-head] [data-toggle]'); await page.waitForTimeout(700);
  const hShut = await page.$eval('#cat-systems > [data-head]', h => Math.round(h.getBoundingClientRect().height));
  console.log('4. category header height: open', hOpen, 'px, closed', hShut, 'px');

  // 5. Interrupted fold: open, reverse after 150 ms
  const rev = await page.evaluate(() => new Promise(res => {
    const sec = document.getElementById('cat-data'), fold = sec.querySelector(':scope > [data-fold]'), btn = sec.querySelector(':scope > [data-head] [data-toggle]'), out = [], t0 = performance.now();
    btn.click(); let back = false;
    (function tick() { const t = performance.now() - t0; if (t > 150 && !back) { back = true; btn.click(); } out.push([Math.round(t), Math.round(fold.getBoundingClientRect().height)]); if (t < 900) requestAnimationFrame(tick); else res(out); })();
  }));
  console.log('5. interrupt: peak', Math.max(...rev.map(s => s[1])), 'px, final', rev[rev.length - 1][1], 'px; around the reversal', JSON.stringify(rev.filter(s => s[0] > 130 && s[0] < 230)));

  // 6. Target sizes of the interactive parts (WCAG 2.2 AA asks for at least 24 x 24 CSS px; AAA for 44)
  await page.click('#cat-ai > [data-head] [data-toggle]'); await page.waitForTimeout(500);
  await page.click('#area-ai-berlin > [data-head] [data-toggle]'); await page.waitForTimeout(500);
  const sel = ['.toggle', '.atoggle', '.chip', '.foldbtn', '.ubtn', '.fbtn', '.segbtn', '.cchip', '.tag', '.search', '.more', '.remove', '.acts button', '.acts a', '.actions a', '.add', '.signout', '.foldbar'];
  const sizes = await page.evaluate(sel => sel.map(q => { const els = [...document.querySelectorAll(q)].filter(e => e.getBoundingClientRect().width > 0 && !e.closest('[inert]')); if (!els.length) return [q, null]; const r = els.map(e => e.getBoundingClientRect()); return [q, Math.round(Math.min(...r.map(x => x.width))), Math.round(Math.min(...r.map(x => x.height)))]; }), sel);
  console.log('6. smallest interactive targets (width x height, px):', sizes.filter(s => s[1] !== null).map(s => `${s[0]} ${s[1]}x${s[2]}`).join(' | '));

  // 7. Reduced motion: every transition collapses to 0.01 ms and a fold settles at once
  const calm = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })).newPage();
  await calm.goto(URL);
  if (KIND === 'app') await calm.waitForFunction(() => window.__ready === true); else await calm.waitForSelector('section.cat');
  await calm.evaluate(() => localStorage.clear()); await calm.reload();
  if (KIND === 'app') await calm.waitForFunction(() => window.__ready === true); else await calm.waitForSelector('section.cat');
  const dur = await calm.evaluate(() => { const f = document.querySelector('#cat-data > [data-fold]'), c = document.querySelector('#cat-data .chev'); return { fold: getComputedStyle(f).transitionDuration, chevron: getComputedStyle(c).transitionDuration }; });
  const settle = await calm.evaluate(() => new Promise(res => { const f = document.querySelector('#cat-data > [data-fold]'), t0 = performance.now(); document.querySelector('#cat-data > [data-head] [data-toggle]').click(); (function tick() { const h = Math.round(f.getBoundingClientRect().height); if (h > 0 && performance.now() - t0 > 30) res(Math.round(performance.now() - t0)); else if (performance.now() - t0 > 1000) res(-1); else requestAnimationFrame(tick); })(); }));
  console.log('7. reduced motion: fold transition', dur.fold, ', chevron', dur.chevron, '; the fold is open and measurable after', settle, 'ms');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
