// Category-level suite for the single-file page (index.html), run by run.mjs.
// Usage: BASE=http://127.0.0.1:PORT node repotest.cjs   (OUT=folder for screenshots)
const { chromium } = require('playwright');
const path = require('path');
const out = process.env.OUT || require('os').tmpdir();
const peakSpeed = pts => { let m = 0; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dt = pts[j][0] - pts[i][0]; if (dt >= 30) { m = Math.max(m, Math.abs(pts[j][1] - pts[i][1]) / dt); break; } } return m; };  // px/ms over windows of at least 30 ms: one frame alone is too noisy (scroll and sampler can share a frame or sit one apart)
(async () => {
  const browser = await chromium.launch();
  const results = [];
  const check = (name, ok, extra = '') => results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  for (const [label, viewport, scheme] of [['desktop', { width: 1280, height: 900 }, 'light'], ['phone', { width: 390, height: 844 }, 'light'], ['dark', { width: 1280, height: 900 }, 'dark']]) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(process.env.BASE + '/index.html');
    await page.waitForSelector('section.cat');
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await page.waitForSelector('section.cat');
    const p = label + ': ';
    const state = key => page.$eval('#cat-' + key, n => ({ collapsed: n.getAttribute('data-collapsed'), open: n.querySelector(':scope > [data-fold]').getAttribute('data-open'), inert: n.querySelector(':scope > [data-fold]').hasAttribute('inert'), h: Math.round(n.querySelector(':scope > [data-fold]').getBoundingClientRect().height) }));
    const bar = () => page.$eval('.bar', b => Math.round(b.getBoundingClientRect().bottom));

    const n = await page.$$eval('section.cat', s => s.length);
    const nCats = await page.evaluate(() => CATS.length);
    check(p + 'one section per category (' + nCats + ')', n === nCats, 'found ' + n);
    const figs = await page.$eval('#figs', f => f.textContent);
    const liveN = await page.evaluate(() => DATA.filter(x => !x.removed_on).length);
    check(p + 'figures show every live posting (' + liveN + ')', new RegExp(liveN + 'livepostings').test(figs.replace(/\s/g, '')), figs);
    let s = await state('ai');
    check(p + 'starts folded', s.collapsed === '1' && s.inert && s.h === 0, JSON.stringify(s));
    await page.screenshot({ path: path.join(out, 'repo-' + label + '-folded.png') });

    await page.click('#cat-ai > [data-head] h2'); await page.waitForTimeout(800);
    s = await state('ai');
    const cities = await page.$$eval('#cat-ai .area', as => as.filter(a => a.getBoundingClientRect().height > 30).length);
    check(p + 'header click opens, three city panels visible', s.collapsed === '0' && !s.inert && s.h > 100 && cities === 3, JSON.stringify({ s, cities }));
    const hClosed = await page.$eval('#cat-data > [data-head]', x => Math.round(x.getBoundingClientRect().height));
    await page.click('#cat-ai > [data-head] [data-toggle]'); await page.waitForTimeout(600);
    s = await state('ai');
    check(p + 'round button closes', s.collapsed === '1' && s.h === 0, JSON.stringify(s));

    // low section brought into view, under the bar
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    const lowBefore = await page.$eval('#cat-energy', x => Math.round(x.getBoundingClientRect().top));
    await page.click('#cat-energy > [data-head] h2'); await page.waitForTimeout(1200);
    const lowAfter = await page.evaluate(() => { const sec = document.getElementById('cat-energy'); const body = sec.querySelector('.cat-body').getBoundingClientRect(); return { top: Math.round(sec.getBoundingClientRect().top), visible: Math.round(Math.max(0, Math.min(body.bottom, innerHeight) - Math.max(body.top, 0))) }; });
    const b = await bar();
    const bodyH = await page.$eval('#cat-energy .cat-body', x => Math.round(x.getBoundingClientRect().height));
    const atEnd = await page.evaluate(() => Math.abs(document.documentElement.scrollHeight - innerHeight - scrollY) <= 2);
    check(p + 'low section glides up under the bar (or to the page end)', lowBefore > innerHeightGuess(viewport) * 0.4 && (Math.abs(lowAfter.top - (b + 12)) <= 2 || atEnd) && lowAfter.visible >= Math.min(300, bodyH - 2), JSON.stringify({ lowBefore, lowAfter, bar: b, bodyH, atEnd }));

    // pinned header sits under the bar while scrolled inside
    for (const g of ['berlin', 'leipzig', 'de']) { await page.click('#area-energy-' + g + ' > [data-head] [data-toggle]'); await page.waitForTimeout(450); }
    await page.evaluate(() => { const sec = document.getElementById('cat-energy'); scrollTo({ top: scrollY + sec.getBoundingClientRect().top + 300, behavior: 'instant' }); }); await page.waitForTimeout(200);
    const pinned = await page.$eval('#cat-energy > [data-head]', x => Math.round(x.getBoundingClientRect().top));
    check(p + 'open header pins under the bar', Math.abs(pinned - b) <= 1, JSON.stringify({ pinned, bar: b }));

    // closing from deep inside moves continuously: the header stays, or glides;
    // its speed never exceeds what the glide's own curve allows (a clamp would show as a jump many times faster)
    const deep = await page.evaluate(() => new Promise(res => { const head = document.querySelector('#cat-energy > [data-head]'); const pts = []; const t0 = performance.now(); head.click(); (function tick() { pts.push([Math.round(performance.now() - t0), Math.round(head.getBoundingClientRect().top)]); if (performance.now() - t0 < 700) requestAnimationFrame(tick); else res(pts); })(); }));
    const maxSpeed = peakSpeed(deep);
    const travel = deep[deep.length - 1][1] - deep[0][1];
    const settle = deep.find((pt, i) => i > 2 && pt[1] === deep[deep.length - 1][1])?.[0] ?? 0;
    const allowed = travel > 0 ? 3.2 * travel / Math.max(settle, 1) : 1;
    check(p + 'closing from deep inside never jumps (' + travel + 'px in ' + settle + 'ms, peak ' + maxSpeed.toFixed(1) + 'px/ms)', deep[0][1] <= b + 2 && maxSpeed <= allowed, JSON.stringify(deep.filter((_, i) => i % 4 === 0)));

    // motion curve
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    const frames = await page.evaluate(() => new Promise(res => { const sec = document.getElementById('cat-content'); const fold = sec.querySelector(':scope > [data-fold]'); const out = []; const t0 = performance.now(); sec.querySelector(':scope > [data-head] [data-toggle]').click(); (function tick() { out.push([Math.round(performance.now() - t0), Math.round(fold.getBoundingClientRect().height)]); if (performance.now() - t0 < 600) requestAnimationFrame(tick); else res(out); })(); }));
    const full = frames[frames.length - 1][1], at20 = frames.find(f => f[0] >= 18)?.[1] ?? 0, settledAt = frames.find((f, i) => i > 2 && f[1] === full)?.[0];
    check(p + 'open motion starts gently and settles in time', at20 < full * 0.12 && settledAt < 380, JSON.stringify({ full, at20, settledAt }));
    const hOpen = await page.$eval('#cat-content > [data-head]', x => Math.round(x.getBoundingClientRect().height));
    const hClosed2 = await page.$eval('#cat-data > [data-head]', x => Math.round(x.getBoundingClientRect().height));
    check(p + 'header keeps its size when opened', hClosed === hClosed2, hClosed + ' vs ' + hClosed2);

    // expand / collapse all
    await page.click('#expand-all'); await page.waitForTimeout(300);
    const allOpen = await page.$$eval('section.cat', ss => ss.every(x => x.getAttribute('data-collapsed') === '0'));
    await page.click('#collapse-all'); await page.waitForTimeout(300);
    const allShut = await page.$$eval('section.cat', ss => ss.every(x => x.getAttribute('data-collapsed') === '1'));
    check(p + 'Expand all / Collapse all', allOpen && allShut);

    // search opens everything; clearing it restores
    await page.click('#cat-pm > [data-head] h2'); await page.waitForTimeout(500);
    await page.fill('#q', 'meridial'); await page.waitForTimeout(300);
    const searchOpen = await page.$$eval('section.cat', ss => ss.every(x => x.getAttribute('data-collapsed') === '0'));
    const hits = await page.$$eval('.card', cs => cs.length);
    const wantHits = await page.evaluate(() => DATA.filter(x => !x.removed_on && [x.title, x.title_original, x.company, x.city, (x.skills || []).join(' ')].join(' ').toLowerCase().includes('meridial')).length);
    await page.fill('#q', ''); await page.waitForTimeout(300);
    const restored = await page.$$eval('section.cat', ss => ss.filter(x => x.getAttribute('data-collapsed') === '0').map(x => x.id));
    check(p + 'search opens all, clearing restores the one open section', searchOpen && wantHits > 0 && hits === wantHits && restored.length === 1 && restored[0] === 'cat-pm', JSON.stringify({ searchOpen, hits, restored }));

    // mark applied survives re-render, open state kept
    if (await page.$eval('#area-pm-berlin', a => a.getAttribute('data-collapsed')) === '1') { await page.click('#area-pm-berlin > [data-head] [data-toggle]'); await page.waitForTimeout(500); }
    await page.click('#area-pm-berlin .card .acts button'); await page.waitForTimeout(200);
    const marked = await page.$eval('#figs', f => f.textContent.includes('1'));
    const stillOpen = await page.$eval('#cat-pm', x => x.getAttribute('data-collapsed'));
    check(p + 'Mark applied re-renders with the section still open', marked && stillOpen === '0');
    await page.click('#area-pm-berlin .card .acts button');

    // persistence
    await page.reload(); await page.waitForSelector('section.cat');
    const after = await page.$$eval('section.cat', ss => ss.filter(x => x.getAttribute('data-collapsed') === '0').map(x => x.id));
    check(p + 'open section remembered after reload', after.length === 1 && after[0] === 'cat-pm', JSON.stringify(after));

    // colours: every category header has its own colour, job titles are ink
    const colours = await page.$$eval('section.cat h2', hs => hs.map(x => getComputedStyle(x).color));
    const inkTitle = await page.$eval('#cat-pm .card h4 a', a => getComputedStyle(a).color);
    check(p + 'every category has its own colour, job titles not among them', new Set(colours).size === nCats && !colours.includes(inkTitle), JSON.stringify({ colours: colours.slice(0, 3), inkTitle }));
    await page.evaluate(() => { const sec = document.getElementById('cat-pm'); scrollTo({ top: scrollY + sec.getBoundingClientRect().top + 200, behavior: 'instant' }); }); await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(out, 'repo-' + label + '-boundary.png') });

    check(p + 'no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(results.join('\n'));
  function innerHeightGuess(vp) { return vp.height; }
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
