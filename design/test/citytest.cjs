// City-level suite (nested folds, pinned stack, filters, persistence) for both implementations, run by run.mjs.
// Usage: node citytest.cjs <url of the page> <app|repo>   (OUT=folder for screenshots)
const { chromium } = require('playwright');
const path = require('path');
const out = process.env.OUT || require('os').tmpdir();
const URL = process.argv[2] || (process.env.BASE + '/index.html');
const KIND = process.argv[3] || 'app';
const peakSpeed = pts => { let m = 0; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dt = pts[j][0] - pts[i][0]; if (dt >= 30) { m = Math.max(m, Math.abs(pts[j][1] - pts[i][1]) / dt); break; } } return m; };  // px/ms over windows of at least 30 ms: one frame alone is too noisy (scroll and sampler can share a frame or sit one apart)
(async () => {
  const browser = await chromium.launch();
  const results = [];
  const check = (name, ok, extra = '') => results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  const views = [['desktop', { width: 1280, height: 900 }, 'light'], ['phone', { width: 390, height: 844 }, 'light']];
  if (KIND === 'repo') views.push(['dark', { width: 1280, height: 900 }, 'dark']);
  for (const [label, viewport, scheme] of views) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const ready = () => KIND === 'app' ? page.waitForFunction(() => window.__ready === true) : page.waitForSelector('section.cat');
    await page.goto(URL); await ready();
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await ready();
    const p = label + ': ';
    const base = () => page.evaluate(() => { const b = document.querySelector('.bar'); return b ? Math.round(b.getBoundingClientRect().bottom) : 0; });
    const st = sel => page.$eval(sel, n => ({ c: n.getAttribute('data-collapsed'), open: n.querySelector(':scope > [data-fold]').getAttribute('data-open'), inert: n.querySelector(':scope > [data-fold]').hasAttribute('inert'), h: Math.round(n.querySelector(':scope > [data-fold]').getBoundingClientRect().height), aria: n.querySelector(':scope > [data-head] [data-toggle]').getAttribute('aria-expanded') }));
    const visCards = sel => page.$$eval(sel + ' .card', cs => cs.filter(c => !c.closest('[data-fold][data-open="0"]')).length);
    // puts a fold's top `by` px above the line where its header pins, i.e. scrolled into it
    const into = (sel, by = 120) => page.evaluate(([sel, by]) => { const a = document.querySelector(sel); const sec = a.closest('.cat'); const line = sec.querySelector(':scope > [data-head]').getBoundingClientRect().height + (document.querySelector('.bar')?.getBoundingClientRect().bottom ?? 0); scrollTo({ top: scrollY + a.getBoundingClientRect().top - line + by, behavior: 'instant' }); }, [sel, by]);
    const top0 = () => page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    const B = await base();
    // expectations come from the data; these panels must hold a posting because the tests open and scroll inside them
    const want = (c, g) => page.evaluate(([c, g]) => (typeof DATA !== 'undefined' ? DATA : window.__data.postings).filter(x => !x.removed_on && x.category === c && x.location_group === g).length, [c, g]);
    for (const [c, g] of [['ai', 'berlin'], ['ai', 'leipzig'], ['ai', 'de'], ['data', 'berlin'], ['data', 'leipzig'], ['pm', 'berlin'], ['pm', 'leipzig']]) {
      const n = await want(c, g);
      if (n < 1) check(p + 'precondition: ' + c + ' / ' + g + ' must hold at least one posting (has ' + n + ')', false, 'these tests open and scroll inside that panel');
    }

    // ---- category opens, cities folded inside
    await page.click('#cat-ai > [data-head] h2'); await page.waitForTimeout(700);
    const cities = await page.$$eval('#cat-ai .area', as => as.map(a => a.dataset.area));
    const citiesFolded = await page.$$eval('#cat-ai .area', as => as.every(a => a.getAttribute('data-collapsed') === '1' && a.querySelector(':scope > [data-fold]').hasAttribute('inert')));
    check(p + 'opened category shows 3 folded cities, no cards yet', cities.join() === 'berlin,leipzig,de' && citiesFolded && (await visCards('#cat-ai')) === 0, cities.join());

    // ---- the two levels look different; the three cities have distinct colours
    const look = await page.evaluate(() => {
      const cat = getComputedStyle(document.querySelector('#cat-ai h2'));
      const names = [...document.querySelectorAll('#cat-ai .area-name')].map(n => getComputedStyle(n));
      const edges = [...document.querySelectorAll('#cat-ai .area')].map(a => getComputedStyle(a).borderLeftColor);
      return { catFont: cat.fontFamily.split(',')[0], catSize: parseFloat(cat.fontSize), cityFont: names[0].fontFamily.split(',')[0], citySize: parseFloat(names[0].fontSize), cityUpper: names[0].textTransform, edges };
    });
    check(p + 'city headers differ from category headers (font, size, capitals)', look.catFont !== look.cityFont && look.citySize < look.catSize * 0.6 && look.cityUpper === 'uppercase', JSON.stringify(look).slice(0, 160));
    check(p + 'three cities have three distinct colours', new Set(look.edges).size === 3, look.edges.join(' | '));
    const pillMatch = await page.evaluate(() => {
      const a = document.querySelector('#area-ai-berlin'); const edge = getComputedStyle(a).borderLeftColor;
      const name = getComputedStyle(a.querySelector('.area-name')).color; return edge === name;
    });
    check(p + 'city name and edge share the city colour', pillMatch);

    // ---- open one city with its header, another with its button
    await page.click('#area-ai-berlin > [data-head] .area-name'); await page.waitForTimeout(700);
    let s = await st('#area-ai-berlin');
    const berlinCards = await visCards('#area-ai-berlin');
    const wantBerlin = await want('ai', 'berlin');
    const leipzigStill = (await st('#area-ai-leipzig')).c;
    check(p + 'city header click opens that city only', s.c === '0' && s.open === '1' && !s.inert && s.aria === 'true' && berlinCards === wantBerlin && leipzigStill === '1', JSON.stringify({ s, berlinCards, leipzigStill }));
    await page.click('#area-ai-leipzig > [data-head] [data-toggle]'); await page.waitForTimeout(700);
    s = await st('#area-ai-leipzig');
    check(p + 'city button opens it; Berlin stays open', s.c === '0' && (await st('#area-ai-berlin')).c === '0' && (await visCards('#area-ai-leipzig')) === (await want('ai', 'leipzig')), JSON.stringify(s));

    // ---- city open motion: gentle start, settles on the fold clock
    await page.click('#area-ai-de > [data-head] [data-toggle]'); await page.waitForTimeout(600);
    await page.click('#area-ai-de > [data-head] [data-toggle]'); await page.waitForTimeout(600);
    const frames = await page.evaluate(() => new Promise(res => { const a = document.getElementById('area-ai-de'); const f = a.querySelector(':scope > [data-fold]'); const o = []; const t0 = performance.now(); a.querySelector(':scope > [data-head] [data-toggle]').click(); (function tick() { o.push([Math.round(performance.now() - t0), Math.round(f.getBoundingClientRect().height)]); if (performance.now() - t0 < 600) requestAnimationFrame(tick); else res(o); })(); }));
    const full = frames[frames.length - 1][1], at20 = frames.find(f => f[0] >= 18)?.[1] ?? 0, settled = frames.find((f, i) => i > 2 && f[1] === full)?.[0];
    check(p + 'city opens on the same curve (gentle start, settles < 380 ms)', full > 100 && at20 < full * 0.15 && settled < 380, JSON.stringify({ full, at20, settled }));
    await page.waitForTimeout(400);

    // ---- pinned stack: category header at its line, city header right under it
    await into('#area-ai-leipzig', 120); await page.waitForTimeout(250);
    const stack = await page.evaluate(() => {
      const ch = document.querySelector('#cat-ai > [data-head]').getBoundingClientRect();
      const lh = document.querySelector('#area-ai-leipzig > [data-head]').getBoundingClientRect();
      const bh = document.querySelector('#area-ai-berlin > [data-head]').getBoundingClientRect();
      return { catTop: Math.round(ch.top), catBottom: Math.round(ch.bottom), leipzigTop: Math.round(lh.top), berlinTop: Math.round(bh.top) };
    });
    check(p + 'inside a city: category header pinned, city header pinned right under it', Math.abs(stack.catTop - B) <= 1 && Math.abs(stack.leipzigTop - stack.catBottom) <= 1 && stack.berlinTop < stack.catBottom, JSON.stringify(stack));
    await page.screenshot({ path: path.join(out, 'city-' + KIND + '-' + label + '-stack.png') });

    // the next city takes over when you scroll into it
    await into('#area-ai-de', 120); await page.waitForTimeout(250);
    const take = await page.evaluate(() => ({ catBottom: Math.round(document.querySelector('#cat-ai > [data-head]').getBoundingClientRect().bottom), deTop: Math.round(document.querySelector('#area-ai-de > [data-head]').getBoundingClientRect().top), leipzigBottom: Math.round(document.getElementById('area-ai-leipzig').getBoundingClientRect().bottom) }));
    check(p + 'scrolling into the next city: its header takes over the pinned spot', Math.abs(take.deTop - take.catBottom) <= 1 && take.leipzigBottom <= take.catBottom + 1, JSON.stringify(take));

    // ---- closing a city from deep inside never jumps
    await into('#area-ai-leipzig', 200); await page.waitForTimeout(250);
    const deep = await page.evaluate(() => new Promise(res => { const head = document.querySelector('#area-ai-leipzig > [data-head]'); const pts = []; const t0 = performance.now(); head.querySelector('.area-name').click(); (function tick() { pts.push([Math.round(performance.now() - t0), Math.round(head.getBoundingClientRect().top)]); if (performance.now() - t0 < 700) requestAnimationFrame(tick); else res(pts); })(); }));
    const maxSpeed = peakSpeed(deep);
    const travel = Math.abs(deep[deep.length - 1][1] - deep[0][1]);
    const settle = deep.find((pt, i) => i > 2 && pt[1] === deep[deep.length - 1][1])?.[0] ?? 1;
    const catLine = await page.$eval('#cat-ai > [data-head]', h => Math.round(h.getBoundingClientRect().bottom));
    check(p + 'closing a city from deep inside never jumps (travel ' + travel + 'px, peak ' + maxSpeed.toFixed(1) + 'px/ms)', Math.abs(deep[0][1] - catLine) <= 2 && (await st('#area-ai-leipzig')).c === '1' && (travel <= 2 || maxSpeed <= 3.2 * travel / Math.max(settle, 1)), JSON.stringify(deep.filter((_, i) => i % 4 === 0)));

    // ---- a city opened low in the window glides up under the category header
    await page.click('#collapse-all, .foldbtn:nth-child(2), .ubtn:nth-child(2)'); await page.waitForTimeout(300);
    await top0();
    await page.click('#cat-data > [data-head] h2'); await page.waitForTimeout(900);
    await page.click('#area-data-berlin > [data-head] [data-toggle]'); await page.waitForTimeout(900);
    await page.evaluate(() => { const l = document.getElementById('area-data-leipzig'); scrollTo({ top: scrollY + l.getBoundingClientRect().top - innerHeight * 0.8, behavior: 'instant' }); });
    await page.waitForTimeout(250);
    const lowBefore = await page.$eval('#area-data-leipzig', a => Math.round(a.getBoundingClientRect().top));
    await page.click('#area-data-leipzig > [data-head] [data-toggle]'); await page.waitForTimeout(1100);
    const low = await page.evaluate(() => { const a = document.getElementById('area-data-leipzig'); const ch = document.querySelector('#cat-data > [data-head]').getBoundingClientRect(); const body = a.querySelector('.area-body').getBoundingClientRect(); return { top: Math.round(a.getBoundingClientRect().top), catBottom: Math.round(ch.bottom), visible: Math.round(Math.max(0, Math.min(body.bottom, innerHeight) - Math.max(body.top, 0))) }; });
    check(p + 'a city opened low glides up to just under the category header', lowBefore > viewport.height * 0.6 && Math.abs(low.top - (low.catBottom + 8)) <= 2 && low.visible > 200, JSON.stringify({ lowBefore, ...low }));

    // ---- a category closed from deep inside a city never jumps
    await into('#area-data-leipzig', 200); await page.waitForTimeout(250);
    const cdeep = await page.evaluate(() => new Promise(res => { const head = document.querySelector('#cat-data > [data-head]'); const pts = []; const t0 = performance.now(); head.querySelector('h2').click(); (function tick() { pts.push([Math.round(performance.now() - t0), Math.round(head.getBoundingClientRect().top)]); if (performance.now() - t0 < 700) requestAnimationFrame(tick); else res(pts); })(); }));
    const cmax = peakSpeed(cdeep);
    const ctravel = Math.abs(cdeep[cdeep.length - 1][1] - cdeep[0][1]), csettle = cdeep.find((pt, i) => i > 2 && pt[1] === cdeep[cdeep.length - 1][1])?.[0] ?? 1;
    check(p + 'closing a category from deep inside a city never jumps (travel ' + ctravel + 'px)', Math.abs(cdeep[0][1] - B) <= 2 && ctravel <= 2 || cmax <= 3.2 * ctravel / Math.max(csettle, 1), JSON.stringify(cdeep.filter((_, i) => i % 4 === 0)));

    // ---- Expand all / Collapse all reach both levels
    await page.click('#expand-all, .foldbtn:nth-child(1), .ubtn:nth-child(1)'); await page.waitForTimeout(300);
    const allOpen = await page.evaluate(() => [...document.querySelectorAll('section.cat, .area')].every(n => n.getAttribute('data-collapsed') === '0'));
    const nAreas = await page.$$eval('.area', a => a.length);
    await page.click('#collapse-all, .foldbtn:nth-child(2), .ubtn:nth-child(2)'); await page.waitForTimeout(300);
    const allShut = await page.evaluate(() => [...document.querySelectorAll('section.cat, .area')].every(n => n.getAttribute('data-collapsed') === '1'));
    check(p + 'Expand all / Collapse all open and close categories and all ' + nAreas + ' cities', allOpen && allShut && nAreas === 3 * (await page.$$eval('section.cat', s => s.length - (s.some(x => x.id === 'record') ? 1 : 0))));

    // ---- remembered: one category, one city
    await top0();
    await page.click('#cat-pm > [data-head] h2'); await page.waitForTimeout(700);
    await page.click('#area-pm-leipzig > [data-head] [data-toggle]'); await page.waitForTimeout(600);
    await page.reload(); await ready();
    const remembered = await page.evaluate(() => ({ cats: [...document.querySelectorAll('section.cat[data-collapsed="0"]')].map(n => n.id), areas: [...document.querySelectorAll('.area[data-collapsed="0"]')].map(n => n.id) }));
    check(p + 'open category and open city remembered after reload', remembered.cats.join() === 'cat-pm' && remembered.areas.join() === 'area-pm-leipzig', JSON.stringify(remembered));

    // ---- one-city filter opens that city by itself; back to all restores
    const chip = KIND === 'app' ? 'button.segbtn:has-text("Berlin")' : '[data-loc="berlin"]';
    const allChip = KIND === 'app' ? 'button.segbtn:has-text("All areas")' : '[data-loc="all"]';
    if (KIND === 'app' && (await page.getAttribute('#fpanel', 'data-open')) === '0') { await page.click('.fbtn'); await page.waitForTimeout(450); }
    await page.click(chip); await page.waitForTimeout(400);
    const f = await page.evaluate(() => ({ shown: [...document.querySelectorAll('#cat-pm .area')].map(a => a.id + ':' + a.getAttribute('data-collapsed')) }));
    await page.click('#area-pm-berlin > [data-head] [data-toggle]'); await page.waitForTimeout(500);
    const closedInFilter = await page.$eval('#area-pm-berlin', a => a.getAttribute('data-collapsed'));
    await page.click(allChip); await page.waitForTimeout(400);
    const back = await page.evaluate(() => [...document.querySelectorAll('#cat-pm .area')].map(a => a.id + ':' + a.getAttribute('data-collapsed')));
    check(p + 'Berlin chip shows Berlin open by itself; it can be closed; All restores remembered state', f.shown.join() === 'area-pm-berlin:0' && closedInFilter === '1' && back.join() === 'area-pm-berlin:1,area-pm-leipzig:0,area-pm-de:1', JSON.stringify({ f, closedInFilter, back }));

    // ---- state survives a re-render (Remove in app, Mark applied in repo)
    if (KIND === 'app') {
      await page.click('#area-pm-leipzig .card .actions .remove'); await page.waitForTimeout(200);
      const kept = await page.evaluate(() => [document.getElementById('cat-pm').getAttribute('data-collapsed'), document.getElementById('area-pm-leipzig').getAttribute('data-collapsed')]);
      check(p + 'open category and city survive a re-render', kept.join() === '0,0', kept.join());
      await page.click('#area-pm-leipzig .card .choose .cancel');
      // card details still work inside a city
      await page.click('#area-pm-leipzig .card .actions .more'); await page.waitForTimeout(600);
      const more = await page.$eval('#area-pm-leipzig .card', c => ({ c: c.getAttribute('data-collapsed'), h: Math.round(c.querySelector('.card-more').getBoundingClientRect().height) }));
      check(p + 'card More works inside a city', more.c === '0' && more.h > 20, JSON.stringify(more));
    } else {
      await page.click('#area-pm-leipzig .card .acts button'); await page.waitForTimeout(200);
      const kept = await page.evaluate(() => [document.getElementById('cat-pm').getAttribute('data-collapsed'), document.getElementById('area-pm-leipzig').getAttribute('data-collapsed')]);
      check(p + 'open category and city survive a re-render', kept.join() === '0,0', kept.join());
      await page.click('#area-pm-leipzig .card .acts button');
      // search opens every category and city; clearing restores
      await page.fill('#q', 'meridial'); await page.waitForTimeout(300);
      const sOpen = await page.evaluate(() => [...document.querySelectorAll('section.cat, .area')].every(n => n.getAttribute('data-collapsed') === '0'));
      await page.fill('#q', ''); await page.waitForTimeout(300);
      const sBack = await page.evaluate(() => [...document.querySelectorAll('.area[data-collapsed="0"]')].map(n => n.id));
      check(p + 'search opens every category and city; clearing restores', sOpen && sBack.join() === 'area-pm-leipzig', JSON.stringify(sBack));
    }

    await top0();
    await page.$eval('#area-pm-leipzig', a => a.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -200)); await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(out, 'city-' + KIND + '-' + label + '-open.png') });
    check(p + 'no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(results.join('\n'));
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
