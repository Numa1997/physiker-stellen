const CATS = __CATS__;
const LOCS = [['berlin','Berlin','var(--wine)'],['leipzig','Leipzig area','var(--amber)'],['de','Rest of Germany','var(--slate)']];
const TARGET = __TARGET__;
const PILL = {berlin:['var(--wine-soft)','var(--wine)'],leipzig:['var(--amber-soft)','var(--amber)'],de:['var(--slate-soft)','var(--slate)']};
const store = {get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
let applied = store.get('pr.applied',{}), openCats = store.get('pr.open',{}), loc = store.get('pr.area','all'), cat = store.get('pr.cat','all'), q = '', filterOpen = false;
const motion = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

function h(tag, attrs, ...kids){const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs||{})){if(v==null||v===false)continue;if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':v)}for(const c of kids.flat()){if(c==null||c===false)continue;e.append(c instanceof Node?c:document.createTextNode(String(c)))}return e}
function match(p){if(!q)return true;const s=[p.title,p.title_original,p.company,p.city,(p.skills||[]).join(' ')].join(' ').toLowerCase();return q.split(/\s+/).every(w=>s.includes(w))}

// ---- the fold ---------------------------------------------------------------
// One curve and two durations for everything that moves: the fold and the
// chevron (CSS) and the window scroll (below) all follow these, so a section
// and the window move as one. The stylesheet reads them from these variables.
const FOLD = { open: 320, close: 240, curve: [0.4, 0, 0.2, 1] };
for (const [k, v] of [['--fold-open', FOLD.open + 'ms'], ['--fold-close', FOLD.close + 'ms'], ['--fold-ease', 'cubic-bezier(' + FOLD.curve.join(',') + ')']]) document.documentElement.style.setProperty(k, v);
const bezier = ([x1, y1, x2, y2]) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => { let t = x; for (let i = 0; i < 6; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-5) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; } return sy(Math.min(1, Math.max(0, t))); };
};
const ease = bezier(FOLD.curve);
// A close that also has to drop the page (a section near the end of the page,
// closed from deep inside) gets a little longer, in step with the distance,
// so a window-high drop never has to happen in a quarter of a second.
const closeMs = dist => dist > 0 ? Math.round(Math.min(420, Math.max(FOLD.close, dist * 0.45))) : FOLD.close;

// Moves the window to `to` on the fold's own curve and clock, one frame at a
// time, so the scroll and the unfolding height stay in step and the browser
// never has to clamp or re-anchor. A wheel or touch cancels it.
let glideId = 0;
function glide(to, ms) {
  const id = ++glideId, from = scrollY;
  if (Math.abs(to - from) < 1) return;
  const stop = () => { if (id === glideId) glideId++; };
  addEventListener('wheel', stop, { once: true, passive: true });
  addEventListener('touchmove', stop, { once: true, passive: true });
  const dur = motion() ? ms : 0;
  let t0 = null, frames = 0;
  (function step(now) {
    if (id !== glideId) return;
    frames++;
    if (!dur) { if (frames < 3) return requestAnimationFrame(step); scrollTo({ top: to, behavior: 'instant' }); return; }
    t0 ??= now;
    const p = ease(Math.min(1, (now - t0) / dur));
    scrollTo({ top: from + (to - from) * p, behavior: 'instant' });
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}

const barBottom = () => 0;   // no sticky bar any more (9 Oct 2026): a pinned category header sits at the top of the window

function chev(size = 14) {
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path');
  svg.setAttribute('class', 'chev'); svg.setAttribute('viewBox', '0 0 14 14'); svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('aria-hidden', 'true');
  path.setAttribute('d', 'M3 5l4 4 4-4'); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.8'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
  svg.append(path); return svg;
}

/** Opens or closes a rendered section without rebuilding the page. */
function setFold(node, open) {
  if (!node) return;
  node.setAttribute('data-collapsed', open ? '0' : '1');
  const fold = node.querySelector(':scope > [data-fold]');
  if (fold) { fold.setAttribute('data-open', open ? '1' : '0'); fold.toggleAttribute('inert', !open); }
  const btn = node.querySelector(':scope > [data-head] [data-toggle]');
  if (btn) { btn.setAttribute('aria-expanded', String(open)); btn.setAttribute('aria-label', (open ? 'Collapse ' : 'Expand ') + btn.dataset.label); }
}
// Two levels fold: the categories, and inside each open category its three
// cities. A city's state is remembered per category; a search opens every
// category and city; when the area chips narrow the list to one city, that
// city opens by itself (until closed).
let openAreas = store.get('pr.openAreas', {});
const filterClosed = new Set();
const areaKey = (cat, g) => cat + ':' + g;
const isAreaOpen = k => (q ? true : loc === 'all' ? !!openAreas[k] : !filterClosed.has(k));
function rememberArea(k, open, save = true) {
  if (q) return;
  if (loc === 'all') { open ? openAreas[k] = true : delete openAreas[k]; if (save) store.set('pr.openAreas', openAreas); }
  else open ? filterClosed.delete(k) : filterClosed.add(k);
}

const secNode = key => document.getElementById('cat-' + key);
const areaNode = k => document.getElementById('area-' + k.replace(':', '-'));
const foldOf = node => node?.querySelector(':scope > [data-fold]');
const isOpen = node => node?.getAttribute('data-collapsed') === '0';
const pageEnd = () => document.documentElement.scrollHeight - innerHeight;

// Where a fold's header pins while you scroll inside it: a category's under
// the top bar, a city's just under its category's header.
function pinLine(node) {
  if (!node?.classList.contains('area')) return barBottom();
  const sec = node.closest('.cat');
  return pinLine(sec) + (sec?.querySelector(':scope > [data-head]')?.offsetHeight ?? 0);
}

// Brings a fold into view when its header sits low in the window (or above its
// pin line), so the body unfolds on screen rather than below the edge. The
// glide aims at where the page will end once the body is fully out, so it is
// never clamped half-way.
function reveal(node) {
  if (!node) return;
  const line = pinLine(node), top = node.getBoundingClientRect().top;
  if (top >= line && top <= Math.max(line + 48, innerHeight * 0.4)) return;
  const fold = foldOf(node);
  const growth = fold ? fold.firstElementChild.firstElementChild.offsetHeight - fold.getBoundingClientRect().height : 0;
  glide(Math.max(0, Math.min(scrollY + top - line - (node.classList.contains('area') ? 8 : 12), pageEnd() + growth)), FOLD.open);
}

// Opens or closes one fold (a category or a city) in place, managing the
// scroll so that nothing on screen jumps.
function fold(node, open, bring = true) {
  if (!node) return;
  if (isOpen(node) !== open) {
    if (!open) {
      // Closing from deep inside: the header is pinned at its line while the
      // fold's own top is far above. Put the fold's top where the pinned header
      // already is, so the header stays put and only the body folds away
      // beneath it. When the page will end up too short to keep it there,
      // glide down to the final position on the fold's own curve.
      const line = pinLine(node), top = node.getBoundingClientRect().top;
      if (top < line) scrollTo({ top: scrollY + top - line, behavior: 'instant' });
      const end = pageEnd() - (foldOf(node)?.getBoundingClientRect().height ?? 0);
      const ms = closeMs(scrollY - end);
      node.style.setProperty('--fold-close', ms + 'ms');
      if (scrollY > end) glide(Math.max(0, end), ms);
    }
    setFold(node, open);
  }
  if (open && bring) reveal(node);
}

function toggleSec(key, force, bring = true) {
  const node = secNode(key);
  const open = force ?? !isOpen(node);
  if (!q) { open ? openCats[key] = true : delete openCats[key]; store.set('pr.open', openCats); }
  fold(node, open, bring);
}

function toggleArea(k, force) {
  const node = areaNode(k);
  const open = force ?? !isOpen(node);
  rememberArea(k, open);
  fold(node, open);
}

// All at once is done without animation: thirty heights moving together is
// noise. Collapsing all first puts the list's top under the bar, so it is one
// clean cut. It applies to both levels: categories and the cities inside them.
function foldAll(open) {
  const list = document.getElementById('cats');
  if (!open) { const top = list.getBoundingClientRect().top + scrollY - barBottom() - 12; if (scrollY > top) scrollTo({ top, behavior: 'instant' }); }
  list.classList.add('no-anim');
  for (const [key] of CATS) { if (!q) open ? openCats[key] = true : delete openCats[key]; if (secNode(key)) setFold(secNode(key), open); }
  for (const node of list.querySelectorAll('.area')) { rememberArea(node.dataset.key, open, false); setFold(node, open); }
  if (!q) { store.set('pr.open', openCats); store.set('pr.openAreas', openAreas); }
  void list.offsetWidth;
  list.classList.remove('no-anim');
}

// The city headers pin under their category's header, whose height varies
// (long titles wrap, phones are narrower): each section carries its header's
// height as --head-h for the city headers' sticky offset.
const headObserver = new ResizeObserver(entries => {
  for (const e of entries) e.target.parentElement?.style.setProperty('--head-h', e.target.offsetHeight + 'px');
});

// ---- the page ---------------------------------------------------------------
function card(p){
  const [bg,fg]=PILL[p.location_group];
  const done=!!applied[p.n];
  return h('article',{class:'card'+(done?' done':'')},
    h('div',{class:'tags'},
      h('div',{style:'display:flex;gap:6px;flex-wrap:wrap'},
        h('span',{class:'pill',style:`background:${bg};color:${fg}`},p.city),
        p.employment&&h('span',{class:'emp'},p.employment)),
      h('span',{class:'num'},'#'+p.n)),
    h('div',{},h('h4',{},h('a',{href:p.url,target:'_blank',rel:'noopener'},p.title)),
      p.title_original!==p.title&&h('p',{class:'orig'},p.title_original)),
    h('p',{class:'co'},h('b',{},p.company)),
    p.eligibility_quote_de&&h('div',{class:'proof'},h('p',{},'„'+p.eligibility_quote_de+'“')),
    p.eligibility_en&&h('p',{class:'note'},p.eligibility_en),
    p.note&&h('p',{class:'note'},p.note),
    p.salary&&h('p',{class:'meta'},'Salary: '+p.salary),
    h('div',{class:'acts'},
      h('a',{href:p.url,target:'_blank',rel:'noopener'},'Open posting ↗'),
      h('button',{'aria-pressed':String(done),onclick(){applied[p.n]=!done;if(!applied[p.n])delete applied[p.n];store.set('pr.applied',applied);render()}},done?'✓ Applied':'Mark applied')));
}

// A city inside a category: the same fold one level down, smaller and in the
// city's colour (the colour of the city pill on its cards).
function city(catKey, catName, g, label, inCity, jobs) {
  const k = areaKey(catKey, g), open = isAreaOpen(k), id = 'area-' + catKey + '-' + g, n = inCity.length;
  const name = label + ', ' + catName;
  const btn = h('button', { type: 'button', class: 'atoggle', 'data-toggle': '1', 'data-label': name, 'aria-controls': id + '-body', 'aria-expanded': String(open), 'aria-label': (open ? 'Collapse ' : 'Expand ') + name, onclick(e) { e.stopPropagation(); toggleArea(k); } }, chev(12));
  const count = q ? [h('span', { class: jobs.length ? 'full' : 'short' }, `${jobs.length} of ${n} match`)] : [`${n} open`];
  return h('div', { class: 'area', id, 'data-area': g, 'data-key': k, 'data-collapsed': open ? '0' : '1' },
    h('div', { class: 'area-head', 'data-head': '1', onclick() { toggleArea(k); } },
      h('span', { class: 'area-name' }, label),
      h('span', { class: 'area-count' }, ...count),
      btn),
    h('div', { class: 'fold', 'data-fold': '1', 'data-open': open ? '1' : '0', id: id + '-body', inert: !open },
      h('div', { class: 'fold-i' }, h('div', { class: 'area-body' },
        jobs.length ? h('div', { class: 'grid' }, jobs.map(card)) : h('p', { class: 'empty' }, n ? 'Nothing matches the search.' : 'No live posting here yet.')))));
}

function section(key, name, i, all, mine) {
  const open = q ? true : !!openCats[key];
  const counts = LOCS.map(([g, l], j) => { const n = all.filter(p => p.location_group === g).length; return [j ? ' · ' : '', `${l} ${n}`]; });
  const btn = h('button', { type: 'button', class: 'toggle', 'data-toggle': '1', 'data-label': name, 'aria-controls': 'cat-' + key + '-body', 'aria-expanded': String(open), 'aria-label': (open ? 'Collapse ' : 'Expand ') + name, onclick(e) { e.stopPropagation(); toggleSec(key); } }, chev());
  const body = h('div', { class: 'cat-body' });
  for (const [g, l] of LOCS) {
    if (loc !== 'all' && loc !== g) continue;
    body.append(city(key, name, g, l, all.filter(p => p.location_group === g), mine.filter(p => p.location_group === g)));
  }
  return h('section', { class: 'cat', id: 'cat-' + key, 'data-cat': key, 'data-collapsed': open ? '0' : '1' },
    h('header', { class: 'sec-head', 'data-head': '1', onclick() { toggleSec(key); } },
      h('div', { class: 'head-main' },
        h('h2', {}, h('span', { class: 'num' }, String(i + 1).padStart(2, '0')), name),
        h('p', { class: 'split' }, h('span', { class: 'lead' }, `${all.length} open`), ' · ', ...counts.flat())),
      h('div', { class: 'head-side' }, btn)),
    h('div', { class: 'fold', 'data-fold': '1', 'data-open': open ? '1' : '0', id: 'cat-' + key + '-body', inert: !open },
      h('div', { class: 'fold-i' }, body)));
}

// Filters: an area, one category at a time, and the search. They live in a
// panel behind the Filter button; whatever is on shows as a tag beside it.
const catName = key => (CATS.find(([k]) => k === key) || [])[1];
function setLoc(g) { loc = g; store.set('pr.area', g); filterClosed.clear(); document.querySelectorAll('[data-loc]').forEach(x => { const on = x.dataset.loc === g; x.setAttribute('aria-pressed', String(on)); x.classList.toggle('on', on); }); render(); }
function setCat(key) { cat = key; store.set('pr.cat', key); if (key !== 'all' && !q) { openCats[key] = true; store.set('pr.open', openCats); } render(); }
function setQ(v) { q = v.trim().toLowerCase(); const box = document.getElementById('q'); if (box.value !== v) box.value = v; render(); }
function setPanel(open) { filterOpen = open; const p = document.getElementById('fpanel'); p.setAttribute('data-open', open ? '1' : '0'); p.inert = !open; document.getElementById('fbtn').setAttribute('aria-expanded', String(open)); }
const tag = (text, undo, title) => h('button', { type: 'button', class: 'tag', title, onclick: undo }, text, h('i', { 'aria-hidden': 'true' }, '×'));

function render(){
  if (cat !== 'all' && !CATS.some(([k]) => k === cat)) cat = 'all';
  const live=DATA.filter(p=>!p.removed_on);
  const shown=live.filter(p=>(loc==='all'||p.location_group===loc)&&match(p));
  const figs=document.getElementById('figs');figs.replaceChildren(
    ...[[live.length,'live postings'],[live.filter(p=>p.location_group==='berlin').length,'Berlin'],[live.filter(p=>p.location_group==='leipzig').length,'Leipzig area'],[Object.keys(applied).length,'marked applied']]
      .map(([n,l])=>h('div',{class:'fig'},h('b',{},n),h('span',{},l))));
  // the filter panel: counts under the other filters, so each option says what you will get
  const inCat = p => cat === 'all' || p.category === cat;
  for (const el of document.querySelectorAll('.seg .n')) el.textContent = live.filter(p => (el.dataset.n === 'all' || p.location_group === el.dataset.n) && inCat(p) && match(p)).length;
  const catCount = key => live.filter(p => (key === 'all' || p.category === key) && (loc === 'all' || p.location_group === loc) && match(p)).length;
  document.getElementById('ccats').replaceChildren(
    h('button', { type: 'button', class: 'cchip all' + (cat === 'all' ? ' on' : ''), 'aria-pressed': String(cat === 'all'), onclick: () => setCat('all') }, 'All categories', h('span', { class: 'n' }, catCount('all'))),
    ...CATS.map(([key, name], i) => h('button', { type: 'button', class: 'cchip' + (cat === key ? ' on' : ''), 'data-cat': key, 'aria-pressed': String(cat === key), onclick: () => setCat(cat === key ? 'all' : key) },
      h('span', { class: 'jn' }, String(i + 1).padStart(2, '0')), name, h('span', { class: 'n' }, catCount(key)))));
  const tags = [
    loc !== 'all' && tag(LOCS.find(([g]) => g === loc)[1], () => setLoc('all'), 'Show all areas'),
    cat !== 'all' && tag(catName(cat), () => setCat('all'), 'Show all categories'),
    q && tag('“' + q + '”', () => setQ(''), 'Clear the search'),
  ].filter(Boolean);
  document.getElementById('ftags').replaceChildren(...(tags.length ? tags : [h('span', { class: 'fnote' }, 'Showing everything')]));
  const cats=document.getElementById('cats');
  cats.replaceChildren(...CATS.filter(([key]) => cat === 'all' || key === cat).map(([key,name],i)=>section(key,name,i,live.filter(p=>p.category===key),shown.filter(p=>p.category===key))));
  headObserver.disconnect();
  for (const head of cats.querySelectorAll('.cat > [data-head]')) headObserver.observe(head);
  document.getElementById('foot').textContent=`List updated ${UPDATED} · ${live.length} live postings · "Mark applied" is saved in this browser only.`;
}
document.getElementById('q').addEventListener('input',e=>setQ(e.target.value));
document.querySelectorAll('[data-loc]').forEach(b=>b.addEventListener('click',()=>setLoc(b.dataset.loc)));
document.getElementById('fbtn').append(chev(12));
// Theme: 'auto' follows the system, or 'light' / 'dark' as chosen; stored in this browser. The button cycles the three.
// The <head> sets data-theme before first paint, so a stored choice never flashes.
const THEMES = { auto: ['Auto', 'Theme follows your system. Click for light.'], light: ['Light', 'Light theme. Click for dark.'], dark: ['Dark', 'Dark theme. Click to follow your system.'] };
function themeIcon(kind) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('width', 14); svg.setAttribute('height', 14); svg.setAttribute('aria-hidden', 'true');
  const add = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); svg.append(n); };
  const line = { fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' };
  if (kind === 'light') {
    add('circle', { cx: 8, cy: 8, r: 3, ...line });
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); add('path', { d: `M${8 + 5 * c} ${8 + 5 * s}L${8 + 6.5 * c} ${8 + 6.5 * s}`, ...line }); }
  } else if (kind === 'dark') {
    add('path', { d: 'M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z', ...line, 'stroke-linejoin': 'round' });
  } else {
    add('circle', { cx: 8, cy: 8, r: 5.5, ...line });
    add('path', { d: 'M8 2.5a5.5 5.5 0 0 1 0 11z', fill: 'currentColor' });
  }
  return svg;
}
let theme = store.get('pr.theme', 'auto'); if (!THEMES[theme]) theme = 'auto';
function showTheme() {
  document.documentElement.dataset.theme = theme;
  const b = document.getElementById('theme'), [label, title] = THEMES[theme];
  b.replaceChildren(themeIcon(theme), label); b.title = title; b.setAttribute('aria-label', title);
}
document.getElementById('theme').addEventListener('click', () => { theme = { auto: 'light', light: 'dark', dark: 'auto' }[theme]; store.set('pr.theme', theme); showTheme(); });
showTheme();
document.getElementById('fbtn').addEventListener('click',()=>setPanel(!filterOpen));
document.querySelectorAll('[data-loc]').forEach(x => { const on = x.dataset.loc === loc; x.setAttribute('aria-pressed', String(on)); x.classList.toggle('on', on); });
document.getElementById('expand-all').addEventListener('click',()=>foldAll(true));
document.getElementById('collapse-all').addEventListener('click',()=>foldAll(false));
render();
