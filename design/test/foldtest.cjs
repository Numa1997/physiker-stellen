// Category-level suite for the live app's view code (design/live-app/page.js), run in the harness by run.mjs.
// Usage: BASE=http://127.0.0.1:PORT node foldtest.cjs   (OUT=folder for screenshots)
const { chromium } = require('playwright');
const path = require('path');
const out = process.env.OUT || require('os').tmpdir();
require('fs').mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const check = (name, ok, extra = '') => results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(process.env.BASE + '/index.html');
    await page.waitForFunction(() => window.__ready === true);
    const state = id => page.$eval('#' + id, n => ({
      collapsed: n.getAttribute('data-collapsed'),
      open: n.querySelector(':scope > [data-fold]').getAttribute('data-open'),
      aria: n.querySelector(':scope > [data-head] [data-toggle]').getAttribute('aria-expanded'),
      inert: n.querySelector(':scope > [data-fold]').hasAttribute('inert'),
      h: Math.round(n.querySelector(':scope > [data-fold]').getBoundingClientRect().height),
    }));
    const p = label + ': ';
    const n = await page.$$eval('section.cat', s => s.length);
    const nCats = await page.evaluate(() => window.__data.categories.length);
    check(p + 'one fold section per category plus the record (' + (nCats + 1) + ')', n === nCats + 1, 'found ' + n);
    let s = await state('cat-ai');
    check(p + 'starts folded', s.collapsed === '1' && s.open === '0' && s.aria === 'false' && s.inert, JSON.stringify(s));
    await page.screenshot({ path: path.join(out, label + '-folded.png'), fullPage: false });

    await page.click('#cat-ai > [data-head] h2');
    await page.waitForTimeout(700);
    s = await state('cat-ai');
    check(p + 'header click opens', s.collapsed === '0' && s.open === '1' && s.aria === 'true' && !s.inert && s.h > 100, JSON.stringify(s));
    const visibleCities = await page.$$eval('#cat-ai .area', as => as.filter(a => a.getBoundingClientRect().height > 30).length);
    check(p + 'three city panels visible when open', visibleCities === 3, visibleCities + ' cities');
    await page.screenshot({ path: path.join(out, label + '-ai-open.png'), fullPage: false });

    await page.click('#cat-ai > [data-head] [data-toggle]');
    await page.waitForTimeout(600);
    s = await state('cat-ai');
    check(p + 'round button closes', s.collapsed === '1' && s.open === '0' && s.h === 0, JSON.stringify(s));

    await page.click('text=Expand all');
    await page.waitForTimeout(700);
    const allOpen = await page.$$eval('section.cat', ss => ss.every(x => x.getAttribute('data-collapsed') === '0'));
    check(p + 'Expand all opens every section', allOpen);
    await page.click('text=Collapse all');
    await page.waitForTimeout(600);
    const allShut = await page.$$eval('section.cat', ss => ss.every(x => x.getAttribute('data-collapsed') === '1'));
    check(p + 'Collapse all closes every section', allShut);

    if (label === 'desktop') {
      await page.click('nav.jump a[href="#cat-energy"]');
      await page.waitForTimeout(1200);
      s = await state('cat-energy');
      const eTop = await page.$eval('#cat-energy', n => Math.round(n.getBoundingClientRect().top));
      const atEnd = await page.evaluate(() => Math.abs(document.documentElement.scrollHeight - innerHeight - scrollY) <= 2);
      check(p + 'category link opens its section and scrolls to it (or to the page end)', s.collapsed === '0' && (eTop <= 14 || atEnd), JSON.stringify({ s, eTop, atEnd }));
      await page.click('#cat-energy > [data-head] [data-toggle]');
      await page.waitForTimeout(500);
    }

    await page.click('#cat-production > [data-head] h2');
    await page.waitForTimeout(700);
    await page.click('#cat-production .sec-tools .add');
    await page.waitForTimeout(500);
    s = await state('cat-production');
    const form = await page.$('#cat-production form.addform');
    check(p + '+ Add posting shows the form inside the open section', s.collapsed === '0' && !!form, JSON.stringify(s));
    await page.click('#cat-production form.addform .cancel');
    await page.click('#cat-production > [data-head] [data-toggle]');
    await page.waitForTimeout(500);

    // Defect 1: a section opened low in the window must be brought into view.
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(100);
    const lowBefore = await page.$eval('#cat-systems', n => Math.round(n.getBoundingClientRect().top));
    await page.click('#cat-systems > [data-head] h2');
    await page.waitForTimeout(1200);
    const lowAfter = await page.evaluate(() => {
      const sec = document.getElementById('cat-systems');
      const body = sec.querySelector('.sec-body').getBoundingClientRect();
      return { headTop: Math.round(sec.getBoundingClientRect().top), visiblePx: Math.round(Math.max(0, Math.min(body.bottom, innerHeight) - Math.max(body.top, 0))) };
    });
    const bodyH = await page.$eval('#cat-systems .sec-body', b => Math.round(b.getBoundingClientRect().height));
    check(p + 'opening a low section brings it up into view', lowBefore > 400 && lowAfter.headTop <= 14 && lowAfter.visiblePx >= Math.min(400, bodyH - 2), JSON.stringify({ lowBefore, lowAfter, bodyH }));

    // Defect 3: closing from deep inside must move continuously: the pinned
    // header stays, or glides, but never jumps between two frames.
    for (const a of ['berlin', 'leipzig', 'de']) { await page.click('#area-systems-' + a + ' > [data-head] [data-toggle]'); await page.waitForTimeout(450); }
    await page.$eval('#area-systems-de', b => b.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(200);
    const deep = await page.evaluate(() => new Promise(res => {
      const head = document.querySelector('#cat-systems > [data-head]');
      const before = Math.round(head.getBoundingClientRect().top);
      const tops = []; const t0 = performance.now();
      head.click();
      (function tick() { tops.push(Math.round(head.getBoundingClientRect().top)); if (performance.now() - t0 < 500) requestAnimationFrame(tick); else res({ before, tops }); })();
    }));
    let maxStep = 0; for (let i = 1; i < deep.tops.length; i++) maxStep = Math.max(maxStep, Math.abs(deep.tops[i] - deep.tops[i - 1]));
    const deepFinal = deep.tops[deep.tops.length - 1];
    const pageEnd = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY);
    check(p + 'closing from deep inside never jumps (header glides at most ' + maxStep + 'px per frame)', deep.before === 0 && maxStep <= 40 && deepFinal >= 0 && (deepFinal <= 2 || Math.abs(pageEnd) <= 2), JSON.stringify({ before: deep.before, final: deepFinal, maxStep, pageEnd, tops: deep.tops.filter((_, i) => i % 3 === 0) }));

    // Defect 2: the first frame must not snap; the motion must settle within ~350ms.
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.click('#cat-content > [data-head] [data-toggle]');
    await page.waitForTimeout(500);
    await page.click('#cat-content > [data-head] [data-toggle]');
    await page.waitForTimeout(500);
    const frames = await page.evaluate(() => new Promise(res => {
      const sec = document.getElementById('cat-content'); const fold = sec.querySelector(':scope > [data-fold]');
      const out = []; const t0 = performance.now();
      sec.querySelector(':scope > [data-head] [data-toggle]').click();
      (function tick() { out.push([Math.round(performance.now() - t0), Math.round(fold.getBoundingClientRect().height)]); if (performance.now() - t0 < 600) requestAnimationFrame(tick); else res(out); })();
    }));
    const full = frames[frames.length - 1][1];
    const at20 = frames.find(f => f[0] >= 18)?.[1] ?? 0;
    const settledAt = frames.find((f, i) => i > 2 && f[1] === full)?.[0];
    check(p + 'open motion starts gently and settles in time', at20 < full * 0.12 && settledAt < 380, JSON.stringify({ full, at20, settledAt }));
    await page.click('#cat-content > [data-head] [data-toggle]');
    await page.waitForTimeout(400);

    // Defect 4: the header keeps its size when opened (no content shift).
    const hClosed = await page.$eval('#cat-ai > [data-head]', h => Math.round(h.getBoundingClientRect().height));

    // card details
    await page.click('#cat-ai > [data-head] h2');
    await page.waitForTimeout(700);
    const hOpen = await page.$eval('#cat-ai > [data-head]', h => Math.round(h.getBoundingClientRect().height));
    check(p + 'header keeps its size when opened', hClosed === hOpen, hClosed + ' vs ' + hOpen);
    if (await page.$eval('#area-ai-leipzig', a => a.getAttribute('data-collapsed')) === '1') { await page.click('#area-ai-leipzig > [data-head] [data-toggle]'); await page.waitForTimeout(600); }
    const cardSel = '#area-ai-leipzig .card:has(.more)';   // the first posting in this city that has a details toggle
    await page.$eval(cardSel, c => c.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const before = await page.$eval(cardSel, c => ({ c: c.getAttribute('data-collapsed'), h: Math.round(c.querySelector('.card-more').getBoundingClientRect().height) }));
    await page.click(cardSel + ' .actions .more');
    await page.waitForTimeout(700);
    const after = await page.$eval(cardSel, c => ({ c: c.getAttribute('data-collapsed'), h: Math.round(c.querySelector('.card-more').getBoundingClientRect().height), txt: c.querySelector('.more').textContent, rows: c.querySelectorAll('.more-row').length }));
    check(p + 'card More opens details', before.c === '1' && before.h === 0 && after.c === '0' && after.h > 30 && after.txt.startsWith('Less'), JSON.stringify({ before, after }));
    await page.$eval(cardSel, c => c.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: path.join(out, label + '-card-open.png'), fullPage: false });

    // Remove flow re-renders the page: open states must survive it
    await page.click(cardSel + ' .actions .remove');
    await page.waitForTimeout(300);
    s = await state('cat-ai');
    const kept = await page.$eval(cardSel, c => c.getAttribute('data-collapsed'));
    check(p + 'open section and card survive a re-render', s.collapsed === '0' && kept === '0', JSON.stringify({ s, kept }));
    await page.click(cardSel + ' .choose .cancel');

    // persistence across reload
    await page.reload();
    await page.waitForFunction(() => window.__ready === true);
    s = await state('cat-ai');
    check(p + 'open section remembered after reload', s.collapsed === '0', JSON.stringify(s));

    // sticky header while scrolled inside an open section
    await page.evaluate(() => { const sec = document.getElementById('cat-ai'); scrollTo({ top: scrollY + sec.getBoundingClientRect().top + 300, behavior: 'instant' }); });
    await page.waitForTimeout(300);
    const top = await page.$eval('#cat-ai > [data-head]', h => Math.round(h.getBoundingClientRect().top));
    check(p + 'open header sticks to the top', top === 0, 'top=' + top);

    check(p + 'no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(results.join('\n'));
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
