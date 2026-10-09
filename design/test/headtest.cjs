// Header and filter panel of the live app: figures instead of boxes, one Filter button, a panel that folds,
// one-category filtering, removable tags, no "aim" line. Run by run.mjs (app only).
// Usage: node headtest.cjs <url of the page> <app|repo>   (OUT=folder for screenshots)
const { chromium } = require('playwright');
const path = require('path');
const out = process.env.OUT || require('os').tmpdir();
const URL = process.argv[2] || (process.env.BASE + '/index.html');
const KIND = process.argv[3] || 'app';
const APP = KIND === 'app';
(async () => {
  const browser = await chromium.launch();
  const results = [];
  const check = (name, ok, extra = '') => results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport, colorScheme: 'light' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const ready = () => APP ? page.waitForFunction(() => window.__ready === true) : page.waitForSelector('section.cat');
    await page.goto(URL); await ready();
    await page.evaluate(() => localStorage.clear()); await page.reload(); await ready();
    const p = label + ': ';
    const n = sel => page.$$eval(sel, a => a.length);
    const txt = sel => page.$eval(sel, e => e.textContent.trim());
    const panelH = () => page.$eval('#fpanel', e => Math.round(e.getBoundingClientRect().height));

    // ---- the top of the page
    check(p + 'no "aim" line and no "n/3" counts', !/Aim:|aim \d|\d\/3\b/.test(await page.$eval('header, .mast, main', e => document.body.innerText)));
    check(p + 'title is the largest text on the page', await page.evaluate(() => {
      const f = s => parseFloat(getComputedStyle(document.querySelector(s)).fontSize);
      return f('h1') >= 44 && f('h1') > f('.cat h2') * 1.5;
    }));
    const FIG = APP ? '.tally .t' : '.fig';
    check(p + 'figures: ' + (APP ? 'Open, Applied, Not relevant' : 'live postings, Berlin, Leipzig area, marked applied'), (await page.$$eval(FIG, a => a.map(x => x.querySelector('span').textContent.trim()))).join() === (APP ? 'Open,Applied,Not relevant' : 'live postings,Berlin,Leipzig area,marked applied'));
    check(p + 'figures have no box (no border, no background)', await page.$$eval(FIG, a => a.every(x => { const s = getComputedStyle(x); return s.borderTopWidth === '0px' && s.backgroundColor === 'rgba(0, 0, 0, 0)'; })));
    check(p + 'the old chip row, bar and category strip are gone', (await n('.chips, .chip, nav.jump, .bar, .foldbar')) === 0);
    check(p + 'filter panel starts closed and inert', (await page.$eval('#fpanel', e => e.dataset.open === '0' && e.inert)) && (await panelH()) === 0);
    check(p + 'says what is shown when nothing is filtered', (await txt('.filterrow')).includes('Showing everything'));
    const total = Number(await txt(APP ? '.tally .open b' : '.fig b'));

    // ---- opening the panel
    await page.click('.fbtn'); await page.waitForTimeout(450);
    check(p + 'Filter opens the panel', (await panelH()) > 80 && (await page.getAttribute('.fbtn', 'aria-expanded')) === 'true');
    if (!APP) check(p + 'the search box lives in the panel', (await n('#fpanel #q')) === 1);
    check(p + 'panel holds 4 area buttons and 11 category chips', (await n('.segbtn')) === 4 && (await n('.cchip')) === 11);
    await page.screenshot({ path: path.join(out, `head-open-${label}.png`) });

    // ---- area filter
    await page.click('.segbtn:nth-child(2)'); await page.waitForTimeout(100);
    check(p + 'choosing an area keeps the panel open and shows a tag', (await panelH()) > 80 && (await txt('.filterrow .tag')).startsWith('Berlin'));
    const berlinOpen = await page.$$eval('.cat:not(.record) .area[data-area="berlin"]', a => a.length);
    check(p + 'only Berlin cities are shown', (await n('.area')) === berlinOpen && berlinOpen === 10);

    // ---- one category
    await page.click('.cchip[data-cat="ai"]'); await page.waitForTimeout(100);
    check(p + 'choosing a category shows only that category' + (APP ? ' (plus your record)' : ''), (await page.$$eval('section.cat', a => a.map(x => x.dataset.cat).join())) === (APP ? 'ai,record' : 'ai'));
    check(p + 'the chosen category is open', await page.$eval('#cat-ai', e => e.getAttribute('data-collapsed') === '0'));
    check(p + 'both filters are visible as tags', (await n('.filterrow .tag')) === 2);
    check(p + 'the chosen chip is filled', await page.$eval('.cchip[data-cat="ai"]', e => e.classList.contains('on') && e.getAttribute('aria-pressed') === 'true'));
    await page.screenshot({ path: path.join(out, `head-filtered-${label}.png`) });
    // clicking the chosen chip again returns to all categories
    await page.click('.cchip[data-cat="ai"]'); await page.waitForTimeout(100);
    check(p + 'clicking the chosen category again shows all categories', (await n('section.cat:not(.record)')) === 10 && (await n('.filterrow .tag')) === 1);
    await page.click('.cchip[data-cat="data"]'); await page.waitForTimeout(100);

    // ---- tags undo
    await page.locator('.filterrow .tag').first().click(); await page.waitForTimeout(100);
    check(p + 'clicking the area tag removes only the area filter', (await n('.filterrow .tag')) === 1 && (await n('.area')) === 3);
    await page.locator('.filterrow .tag').first().click(); await page.waitForTimeout(100);
    check(p + 'clicking the last tag shows everything again', (await n('.filterrow .tag')) === 0 && (await txt('.filterrow')).includes('Showing everything') && (await n('section.cat:not(.record)')) === 10);
    check(p + 'the count of open postings is unchanged by filtering', Number(await txt(APP ? '.tally .open b' : '.fig b')) === total);

    // ---- persistence and expand/collapse with a filtered-away category
    await page.click('.cchip[data-cat="energy"]'); await page.waitForTimeout(100);
    await page.reload(); await ready();
    check(p + 'the category filter survives a reload', (await page.$$eval('section.cat', a => a.map(x => x.dataset.cat).join())) === (APP ? 'energy,record' : 'energy'));
    await page.click('.ubtn:nth-child(2)'); await page.waitForTimeout(150);
    await page.click('.ubtn:nth-child(1)'); await page.waitForTimeout(150);
    if (!APP) {   // the page's search is a filter too: it gets a tag, and clearing it from the tag empties the box
      await page.click('.fbtn'); await page.waitForTimeout(450);
      await page.fill('#q', 'meridial'); await page.waitForTimeout(200);
      const searchTag = await n('.filterrow .tag');
      await page.locator('.filterrow .tag').last().click(); await page.waitForTimeout(200);
      check(p + 'a search shows as a tag and the tag clears it', searchTag === 2 && (await page.$eval('#q', e => e.value)) === '' && (await n('.filterrow .tag')) === 1);
    }
    check(p + 'Expand all / Collapse all work with a filter on', await page.$eval('#cat-energy', e => e.getAttribute('data-collapsed') === '0'));
    // panel closes again, keyboard reachable
    await page.click('.fbtn'); await page.waitForTimeout(450); const h1 = await panelH();
    await page.click('.fbtn'); await page.waitForTimeout(450); const h2 = await panelH();
    check(p + 'Filter toggles the panel open and closed', (h1 === 0 && h2 > 80) || (h1 > 80 && h2 === 0));
    // ---- theme: one button cycles Auto -> Light -> Dark -> Auto, the choice changes the ground and survives a reload
    const ground = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const th = () => page.evaluate(() => [document.documentElement.dataset.theme, document.querySelector('.ubtn.theme').textContent.trim()]);
    await page.evaluate(() => localStorage.removeItem(document.querySelector('#fbtn') ? 'pr.theme' : 'radar.theme')); await page.reload(); await ready();
    const t0 = await th(), g0 = await ground();
    await page.click('.ubtn.theme'); const t1 = await th();
    await page.click('.ubtn.theme'); const t2 = await th(), g2 = await ground();
    check(p + 'theme button cycles Auto, Light, Dark', t0.join() === 'auto,Auto' && t1.join() === 'light,Light' && t2.join() === 'dark,Dark', JSON.stringify([t0, t1, t2]));
    const lum = c => { const [r, g, b] = c.match(/\d+/g).map(Number); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    check(p + 'dark theme darkens the ground and keeps the title readable', lum(g2) < 40 && lum(g0) > 200 && await page.evaluate(() => { const c = getComputedStyle(document.querySelector('h1')).color.match(/\d+/g).map(Number); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 200; }), g0 + ' -> ' + g2);
    await page.reload(); await ready();
    check(p + 'the theme choice survives a reload', (await th()).join() === 'dark,Dark');
    await page.screenshot({ path: path.join(out, `head-dark-${label}.png`) });
    await page.click('.ubtn.theme'); await page.waitForTimeout(50);
    check(p + 'back to Auto after a full cycle', (await th()).join() === 'auto,Auto');
    check(p + 'no horizontal scroll', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check(p + 'no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
    await page.screenshot({ path: path.join(out, `head-closed-${label}.png`) });
    await ctx.close();
  }
  await browser.close();
  console.log(results.join('\n'));
  process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log('TEST CRASH ' + e.stack); process.exit(1); });
