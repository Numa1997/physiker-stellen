// The whole page: ten categories, each with a "+" to add a posting, the
// open cards sorted by area, and the record of what was removed and why.
// A card leaves the list in one of two ways, Applied or Not relevant, and
// both are kept and counted in "Your record".
//
// Every category (and the record) is a fold-out card: the header is the
// control, the body unfolds beneath it. Folding happens in place, without
// rebuilding the page, so the height really animates, and the scroll
// position is managed so that nothing on screen ever jumps: a section that
// opens low is brought up into view; a section closed from deep inside
// keeps its pinned header exactly where it is. Which sections are open is
// remembered in this browser. Each posting card can also be opened for its
// details (full note, salary, English eligibility line).

import { saveMark } from '../data/marks-repo.js';
import { addPosting, deleteAdded } from '../data/added-repo.js';
import { signOut } from '../auth/password-gate.js';
import { el, fill, hostOf } from './dom.js';

const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } },
};
const errorText = (error, fallback) =>
  error?.response?.data?.error ?? error?.data?.error ?? error?.body?.error ?? fallback;
const cut = (value, max = 300) => (value == null ? null : String(value).slice(0, max));
const dateLabel = iso => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};
const motion = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

// One curve and two durations for everything that moves: the fold (CSS),
// the chevron (CSS) and the scroll glide (JS) all follow these, so a section
// and the window move as one. The CSS reads them from these variables.
const FOLD = { open: 320, close: 240, curve: [0.4, 0, 0.2, 1] };
for (const [k, v] of [['--fold-open', FOLD.open + 'ms'], ['--fold-close', FOLD.close + 'ms'], ['--fold-ease', 'cubic-bezier(' + FOLD.curve.join(',') + ')']]) {
  document.documentElement.style.setProperty(k, v);
}
const bezier = ([x1, y1, x2, y2]) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    let t = x;
    for (let i = 0; i < 6; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-5) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    return sy(Math.min(1, Math.max(0, t)));
  };
};
const ease = bezier(FOLD.curve);
// A close that also has to drop the page (a section near the end of the page,
// closed from deep inside) gets a little longer, in step with the distance,
// so a window-high drop never has to happen in a quarter of a second.
const closeMs = dist => dist > 0 ? Math.round(Math.min(420, Math.max(FOLD.close, dist * 0.45))) : FOLD.close;

// Moves the window to `to` on the fold's own curve and clock, one frame at
// a time, so that the scroll and the unfolding height stay in step and the
// browser never has to clamp or re-anchor. A wheel or touch cancels it.
let glideId = 0;
function glide(to, ms) {
  const id = ++glideId;
  const from = scrollY;
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

// Marks saved before Applied / Not relevant existed carry a stage or a
// removed flag; they read as outcomes. An explicit `outcome` (even null,
// after Undo) always wins.
export function outcomeOf(mark) {
  if (!mark) return null;
  if (Object.hasOwn(mark, 'outcome')) return mark.outcome ?? null;
  if (mark.stage) return 'applied';
  if (mark.removed) return 'not_relevant';
  return null;
}

/** A chevron that turns 180° about its own centre when its parent opens. */
function chev(size = 14) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'chev'); svg.setAttribute('viewBox', '0 0 14 14');
  svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', 'M3 5l4 4 4-4'); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

/** Opens or closes a rendered fold (section or card) without a rebuild. */
function setFold(node, open) {
  if (!node) return;
  node.setAttribute('data-collapsed', open ? '0' : '1');
  const fold = node.querySelector(':scope > [data-fold]');
  if (fold) { fold.setAttribute('data-open', open ? '1' : '0'); fold.toggleAttribute('inert', !open); }
  const btn = node.querySelector(':scope > [data-head] [data-toggle], :scope > .actions [data-toggle]');
  if (btn) {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? btn.dataset.labelOpen : btn.dataset.labelClosed);
    if (btn.dataset.textOpen) btn.firstChild.textContent = open ? btn.dataset.textOpen : btn.dataset.textClosed;
  }
}

export function renderPage(mount, data) {
  const { marks } = data;
  let postings = data.postings ?? [];
  let added = data.added ?? [];
  let meta = data.meta ?? {};
  let categories = data.categories ?? [];
  let areas = data.areas ?? [];

  let area = store.get('radar.area', 'all');
  let cat = store.get('radar.cat', 'all');   // 'all' or one category key: the board then shows only that category
  let filterOpen = false;                    // the filter panel starts closed; it is only needed to change the view
  let form = null;          // { category, url, title, company, city, area, error, busy }
  let choosing = null;      // key of the card whose Remove choice is open
  let banner = '';          // last save problem, shown at the top
  let pendingData = null;   // a refresh that arrived while a form was open

  // Everything starts folded: the page opens as a column of category cards
  // and you open the one you want.
  const openSecs = new Set(store.get('radar.open', []));
  const openCards = new Set();
  const saveOpen = () => store.set('radar.open', [...openSecs]);

  const target = Number(meta.target_per_area) || 3;
  const catLabel = key => categories.find(([k]) => k === key)?.[1] ?? key;
  const areaLabel = key => areas.find(([k]) => k === key)?.[1] ?? key;

  function cards() {
    const listed = postings.filter(p => !p.removed_on).map(p => ({
      key: 'j' + p.n, n: p.n, title: p.title, original: p.title_original, company: p.company, city: p.city,
      area: p.location_group, category: p.category, url: p.url, quote: p.eligibility_quote_de, note: p.note,
      eligEn: p.eligibility_en, salary: p.salary, employment: p.employment, addedOn: p.added_on,
      mine: false, sortKey: 'b' + String(p.n).padStart(8, '0'),
    }));
    const mine = added.map(p => ({
      key: p.item_id, n: null, title: p.title, company: p.company, city: p.city, area: p.area,
      category: p.category, url: p.url, mine: true, addedAt: p.added_at, sortKey: 'c' + p.added_at,
    }));
    return [...mine, ...listed];
  }

  function recordItems(all) {
    const byKey = new Map(all.map(c => [c.key, c]));
    const byN = new Map(postings.map(p => [p.n, p]));
    const items = [];
    for (const mark of marks.values()) {
      const outcome = outcomeOf(mark);
      if (!outcome) continue;
      const key = mark.item_id;
      const card = byKey.get(key);
      const old = key.startsWith('j') ? byN.get(Number(key.slice(1))) : null;
      const snap = mark.snapshot ?? (card ? card : old ? { title: old.title, company: old.company, city: old.city,
        area: old.location_group, category: old.category, url: old.url } : null);
      items.push({
        key, outcome, at: mark.outcome_at ?? mark.stage_at ?? mark.updated_at ?? '',
        title: snap?.title ?? (key.startsWith('j') ? 'Posting #' + key.slice(1) + ' (earlier list)' : 'Earlier record ' + key),
        company: snap?.company ?? '', url: snap?.url ?? null, category: snap?.category ?? null, area: snap?.area ?? null,
      });
    }
    return items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }

  // ---- folding -------------------------------------------------------------
  // Two levels fold: the categories, and inside each open category its three
  // cities. A city's state is remembered per category; when the area chips
  // narrow the list to one city, that city opens by itself (until closed).
  const openAreas = new Set(store.get('radar.openAreas', []));
  const filterClosed = new Set();
  const saveAreas = () => store.set('radar.openAreas', [...openAreas]);
  const areaKey = (cat, a) => cat + ':' + a;
  const isAreaOpen = k => (area === 'all' ? openAreas.has(k) : !filterClosed.has(k));
  function rememberArea(k, open, save = true) {
    if (area === 'all') { open ? openAreas.add(k) : openAreas.delete(k); if (save) saveAreas(); }
    else open ? filterClosed.delete(k) : filterClosed.add(k);
  }

  const secNode = id => document.getElementById(id === 'record' ? 'record' : 'cat-' + id);
  const areaNode = k => document.getElementById('area-' + k.replace(':', '-'));
  const foldOf = node => node?.querySelector(':scope > [data-fold]');
  const isOpen = node => node?.getAttribute('data-collapsed') === '0';
  const pageEnd = () => document.documentElement.scrollHeight - innerHeight;

  // Where a fold's header pins while you scroll inside it: a category's at
  // the top of the window, a city's just under its category's header.
  function pinLine(node) {
    if (!node?.classList.contains('area')) return 0;
    const sec = node.closest('.cat');
    return pinLine(sec) + (sec?.querySelector(':scope > [data-head]')?.offsetHeight ?? 0);
  }

  // Brings a fold into view when its header sits low in the window (or above
  // its pin line), so the body unfolds on screen rather than below the edge.
  // The glide runs on the fold's clock and aims at where the page will end
  // once the body is fully out, so it is never clamped half-way.
  function reveal(node) {
    if (!node) return;
    const line = pinLine(node), top = node.getBoundingClientRect().top;
    if (top >= line && top <= Math.max(line + 48, innerHeight * 0.4)) return;
    const fold = foldOf(node);
    const growth = fold ? fold.firstElementChild.firstElementChild.offsetHeight - fold.getBoundingClientRect().height : 0;
    glide(Math.max(0, Math.min(scrollY + top - line - (line ? 8 : 12), pageEnd() + growth)), FOLD.open);
  }

  // Opens or closes one fold (a category or a city) in place, managing the
  // scroll so that nothing on screen jumps.
  function fold(node, open, bring = true) {
    if (!node) return;
    if (isOpen(node) !== open) {
      if (!open) {
        // Closing from deep inside: the header is pinned at its line while
        // the fold's own top is far above it. Put the fold's top where the
        // pinned header already is, so the header stays put and only the
        // body folds away beneath it. When the page will end up too short to
        // keep it there, glide down to the final position on the fold's own
        // curve rather than letting the browser snap at the end.
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

  function toggleSec(id, force, bring = true) {
    const open = force ?? !openSecs.has(id);
    open ? openSecs.add(id) : openSecs.delete(id);
    saveOpen();
    fold(secNode(id), open, bring);
  }

  function toggleArea(k, force) {
    const node = areaNode(k);
    const open = force ?? !isOpen(node);
    rememberArea(k, open);
    fold(node, open);
  }

  // All at once is done without animation: thirty heights moving together
  // is noise, not information. Collapsing all first puts the list's top at
  // the top of the window, so the result is one clean cut, not a jump.
  // It applies to both levels: categories and the cities inside them.
  function foldAll(open) {
    const list = mount.querySelector('.sections');
    if (!open && list) {
      const top = list.getBoundingClientRect().top + scrollY - 12;
      if (scrollY > top) scrollTo({ top, behavior: 'instant' });
    }
    list?.classList.add('no-anim');
    for (const id of [...categories.map(([k]) => k), 'record']) {
      open ? openSecs.add(id) : openSecs.delete(id);
      if (secNode(id)) setFold(secNode(id), open);
    }
    for (const node of list?.querySelectorAll('.area') ?? []) { rememberArea(node.dataset.key, open, false); setFold(node, open); }
    saveOpen(); saveAreas();
    void list?.offsetWidth; // commit the new state before transitions return
    list?.classList.remove('no-anim');
  }

  // The city headers pin under their category's header, whose height varies
  // (long titles wrap, phones are narrower): each section carries its
  // header's height as --head-h for the city headers' sticky offset.
  const headObserver = new ResizeObserver(entries => {
    for (const e of entries) e.target.parentElement?.style.setProperty('--head-h', e.target.offsetHeight + 'px');
  });

  function toggleCard(key, node) {
    const open = !openCards.has(key);
    open ? openCards.add(key) : openCards.delete(key);
    setFold(node, open);
  }

  // A fold-out section: a header (title, counts, chevron) and a body beneath.
  function foldSection(id, attrs, headMain, body, label) {
    const open = openSecs.has(id);
    const bodyId = (attrs.id ?? id) + '-body';
    const section = el('section', { ...attrs, 'data-sec': '1', 'data-collapsed': open ? '0' : '1' });
    const btn = el('button', {
      type: 'button', class: 'toggle', 'data-toggle': '1', 'aria-controls': bodyId, 'aria-expanded': String(open),
      'data-label-open': 'Collapse ' + label, 'data-label-closed': 'Expand ' + label,
      'aria-label': (open ? 'Collapse ' : 'Expand ') + label,
      onclick: e => { e.stopPropagation(); toggleSec(id); },
    }, chev());
    section.append(
      el('header', { class: 'sec-head', 'data-head': '1', onclick: () => toggleSec(id) },
        el('div', { class: 'head-main' }, ...headMain),
        el('div', { class: 'head-side' }, btn)),
      el('div', { class: 'fold', 'data-fold': '1', 'data-open': open ? '1' : '0', id: bodyId, inert: !open },
        el('div', { class: 'fold-i' }, el('div', { class: 'sec-body' }, ...body))));
    return section;
  }

  // A city inside a category: the same fold one level down, smaller and in
  // the city's colour (the colour of the city pill on its cards).
  function foldArea(catKey, a, label, list) {
    const k = areaKey(catKey, a);
    const open = isAreaOpen(k);
    const id = 'area-' + catKey + '-' + a;
    const n = list.length;
    const name = label + ', ' + catLabel(catKey);
    const btn = el('button', {
      type: 'button', class: 'atoggle', 'data-toggle': '1', 'aria-controls': id + '-body', 'aria-expanded': String(open),
      'data-label-open': 'Collapse ' + name, 'data-label-closed': 'Expand ' + name,
      'aria-label': (open ? 'Collapse ' : 'Expand ') + name,
      onclick: e => { e.stopPropagation(); toggleArea(k); },
    }, chev(12));
    return el('div', { class: 'area', id, 'data-area': a, 'data-key': k, 'data-collapsed': open ? '0' : '1' },
      el('div', { class: 'area-head', 'data-head': '1', onclick: () => toggleArea(k) },
        el('span', { class: 'area-name' }, label),
        el('span', { class: 'area-count' }, n + ' open'),
        btn),
      el('div', { class: 'fold', 'data-fold': '1', 'data-open': open ? '1' : '0', id: id + '-body', inert: !open },
        el('div', { class: 'fold-i' }, el('div', { class: 'area-body' },
          n ? el('div', { class: 'grid' }, ...list.map(card)) : el('p', { class: 'empty' }, 'Nothing open here yet.')))));
  }

  // ---- actions -----------------------------------------------------------
  async function setOutcome(card, outcome) {
    const key = card.key;
    const before = marks.get(key) ?? null;
    const patch = outcome
      ? { outcome, outcome_at: new Date().toISOString(), snapshot: {
          title: cut(card.title), company: cut(card.company), city: cut(card.city), area: card.area,
          category: card.category, url: cut(card.url, 2000), n: card.n ?? null } }
      : { outcome: null, outcome_at: null };
    marks.set(key, { ...(before ?? { item_id: key }), ...patch });
    choosing = null; banner = '';
    render();
    try {
      marks.set(key, await saveMark(key, patch));
    } catch (error) {
      before ? marks.set(key, before) : marks.delete(key);
      banner = errorText(error, 'Could not save. Nothing was changed. Check the connection and try again.');
    }
    render();
  }

  async function removeMistake(card) {
    if (!confirm('Delete "' + card.title + '"? It will not be counted anywhere.')) return;
    const before = added;
    added = added.filter(p => p.item_id !== card.key);
    choosing = null; banner = '';
    render();
    try { await deleteAdded(card.key); }
    catch (error) { added = before; banner = errorText(error, 'Could not delete. Try again.'); }
    render();
  }

  function openForm(category) {
    form = { category, url: '', title: '', company: '', city: '', area: area === 'all' ? '' : area, error: '', busy: false };
    choosing = null;
    openSecs.add(category); saveOpen();
    render();
    reveal(secNode(category));
    requestAnimationFrame(() => mount.querySelector('[data-addform] input[name=url]')?.focus({ preventScroll: true }));
  }

  function closeForm() {
    form = null;
    render();
  }

  async function submitForm(event) {
    event.preventDefault();
    if (!form || form.busy) return;
    const input = { url: form.url.trim(), title: form.title.trim(), company: form.company.trim(),
      city: form.city.trim(), area: form.area, category: form.category };
    let problem = '';
    try { const u = new URL(input.url); if (!['https:', 'http:'].includes(u.protocol)) problem = 'x'; } catch { problem = 'x'; }
    if (problem) problem = 'Paste the full link, starting with https://';
    else if (!input.title) problem = 'Enter the job title as it is advertised.';
    else if (!input.city) problem = 'Enter the city.';
    else if (!input.area) problem = 'Choose the area.';
    else if (cards().some(c => c.url === input.url)) problem = 'This link is already on the list.';
    if (problem) { form.error = problem; render(); return; }
    form.busy = true; form.error = ''; render();
    try {
      const posting = await addPosting(input);
      added = [posting, ...added.filter(p => p.item_id !== posting.item_id)];
      closeForm();
    } catch (error) {
      if (form) { form.busy = false; form.error = errorText(error, 'Could not save. Check the connection and try again.'); }
      render();
    }
  }

  function applyData(next) {
    if (next.postings) postings = next.postings;
    if (next.added) added = next.added;
    if (next.meta) meta = next.meta;
    if (next.categories) categories = next.categories;
    if (next.areas) areas = next.areas;
  }

  // ---- view --------------------------------------------------------------
  function card(c) {
    const open = choosing === c.key;
    const expanded = openCards.has(c.key);
    const details = !c.mine && [
      c.eligEn && el('p', { class: 'more-row' }, el('span', { class: 'lbl' }, 'In short'), c.eligEn),
      c.salary && el('p', { class: 'more-row' }, el('span', { class: 'lbl' }, 'Salary'), c.salary),
      c.employment && el('p', { class: 'more-row' }, el('span', { class: 'lbl' }, 'Contract'), c.employment),
      c.addedOn && el('p', { class: 'more-row' }, el('span', { class: 'lbl' }, 'Added'), dateLabel(c.addedOn)),
    ].filter(Boolean);
    const hasMore = !c.mine && (details.length > 0 || (c.note && c.note.length > 160));
    const node = el('article', { class: 'card' + (c.mine ? ' mine' : ''), 'data-card': c.key, 'data-collapsed': expanded ? '0' : '1' },
      el('div', { class: 'card-top' },
        el('span', { class: 'pill area-' + c.area }, areaLabel(c.area)),
        el('span', { class: 'city' }, c.city ?? ''),
        el('span', { class: 'num' }, c.mine ? 'added by you' : '#' + c.n)),
      el('h4', {}, el('a', { href: c.url, target: '_blank', rel: 'noopener noreferrer' }, c.title)),
      c.original && c.original !== c.title && el('p', { class: 'orig' }, c.original),
      el('p', { class: 'co' }, c.company || hostOf(c.url)),
      c.quote && el('blockquote', {}, '„' + c.quote + '“'),
      c.note && el('p', { class: 'note' }, c.note),
      hasMore && el('div', { class: 'fold card-more', 'data-fold': '1', 'data-open': expanded ? '1' : '0', inert: !expanded },
        el('div', { class: 'fold-i' }, el('div', { class: 'more-in' }, ...details))),
      el('div', { class: 'actions' },
        el('a', { class: 'open', href: c.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open posting ↗'),
        hasMore && el('button', {
          type: 'button', class: 'more', 'data-toggle': '1', 'aria-expanded': String(expanded),
          'data-label-open': 'Hide details', 'data-label-closed': 'Show details',
          'data-text-open': 'Less', 'data-text-closed': 'More',
          'aria-label': expanded ? 'Hide details' : 'Show details',
          onclick: () => toggleCard(c.key, node),
        }, expanded ? 'Less' : 'More', chev(12)),
        !open && el('button', { type: 'button', class: 'remove', onclick: () => { choosing = c.key; render(); } }, 'Remove')),
      open && el('div', { class: 'choose', role: 'group', 'aria-label': 'Why remove this posting?' },
        el('p', {}, 'Remove because…'),
        el('div', { class: 'choose-buttons' },
          el('button', { type: 'button', class: 'applied', onclick: () => setOutcome(c, 'applied') }, 'Applied'),
          el('button', { type: 'button', class: 'notrel', onclick: () => setOutcome(c, 'not_relevant') }, 'Not relevant'),
          el('button', { type: 'button', class: 'cancel', onclick: () => { choosing = null; render(); } }, 'Cancel')),
        c.mine && el('button', { type: 'button', class: 'mistake', onclick: () => removeMistake(c) }, 'Added by mistake: delete without counting')));
    return node;
  }

  function addForm(catKey) {
    const f = form;
    const bind = name => ({ name, value: f[name], oninput: e => { f[name] = e.target.value; } });
    return el('form', { class: 'addform', 'data-addform': '1', onsubmit: submitForm, novalidate: true },
      el('p', { class: 'form-title' }, 'Add a posting to ' + catLabel(catKey)),
      el('label', {}, el('span', {}, 'Link'), el('input', { type: 'url', inputmode: 'url', placeholder: 'https://…', autocomplete: 'off', ...bind('url') })),
      el('label', {}, el('span', {}, 'Job title, as advertised'), el('input', { type: 'text', ...bind('title') })),
      el('label', {}, el('span', {}, 'Company (optional)'), el('input', { type: 'text', ...bind('company') })),
      el('label', {}, el('span', {}, 'City'), el('input', { type: 'text', ...bind('city') })),
      el('fieldset', {}, el('legend', {}, 'Area'),
        ...areas.map(([key, label]) => el('label', { class: 'radio' },
          el('input', { type: 'radio', name: 'area', value: key, checked: f.area === key, onchange: () => { f.area = key; } }), label))),
      f.error && el('p', { class: 'form-error', role: 'alert' }, f.error),
      el('div', { class: 'form-buttons' },
        el('button', { type: 'submit', class: 'save', disabled: f.busy }, f.busy ? 'Saving…' : 'Add posting'),
        el('button', { type: 'button', class: 'cancel', onclick: closeForm }, 'Cancel')));
  }

  function render() {
    if (pendingData && !form && !choosing) { applyData(pendingData); pendingData = null; }
    const all = cards();
    const openList = all.filter(c => !outcomeOf(marks.get(c.key)));
    const record = recordItems(all);
    const applied = record.filter(r => r.outcome === 'applied');
    const notRelevant = record.filter(r => r.outcome === 'not_relevant');
    const shownAreas = area === 'all' ? areas : areas.filter(([k]) => k === area);
    const toRecord = e => { e.preventDefault(); toggleSec('record', true); };

    if (cat !== 'all' && !categories.some(([k]) => k === cat)) cat = 'all';
    const areaCount = key => openList.filter(c => (key === 'all' || c.area === key) && (cat === 'all' || c.category === cat)).length;
    const catCount = key => openList.filter(c => (key === 'all' || c.category === key) && (area === 'all' || c.area === area)).length;
    const setArea = key => { area = key; store.set('radar.area', key); filterClosed.clear(); render(); };
    const setCat = key => {
      cat = key; store.set('radar.cat', key);
      if (key !== 'all') { openSecs.add(key); saveOpen(); }   // the one category you picked is shown open
      render();
    };
    const tag = (text, undo, title) => el('button', { type: 'button', class: 'tag', title, onclick: undo },
      text, el('i', { 'aria-hidden': 'true' }, '×'));
    const tags = [
      area !== 'all' && tag(areaLabel(area), () => setArea('all'), 'Show all areas'),
      cat !== 'all' && tag(catLabel(cat), () => setCat('all'), 'Show all categories'),
    ].filter(Boolean);

    const panel = el('div', { class: 'fpanel', id: 'fpanel', 'data-open': filterOpen ? '1' : '0', inert: !filterOpen },
      el('div', { class: 'fpanel-i' }, el('div', { class: 'fcard' },
        el('div', {},
          el('p', { class: 'flabel' }, 'Area'),
          el('div', { class: 'seg', role: 'group', 'aria-label': 'Area' },
            ...[['all', 'All areas'], ...areas].map(([key, label]) => el('button', {
              type: 'button', class: 'segbtn' + (area === key ? ' on' : ''), 'aria-pressed': String(area === key),
              onclick: () => setArea(key) }, label, el('span', { class: 'n' }, areaCount(key)))))),
        el('div', {},
          el('p', { class: 'flabel' }, 'Category · pick one to show only that'),
          el('div', { class: 'cchips', role: 'group', 'aria-label': 'Category' },
            el('button', { type: 'button', class: 'cchip all' + (cat === 'all' ? ' on' : ''), 'aria-pressed': String(cat === 'all'),
              onclick: () => setCat('all') }, 'All categories', el('span', { class: 'n' }, catCount('all'))),
            ...categories.map(([key, label], i) => el('button', {
              type: 'button', class: 'cchip' + (cat === key ? ' on' : ''), 'data-cat': key, 'aria-pressed': String(cat === key),
              onclick: () => setCat(cat === key ? 'all' : key) },
              el('span', { class: 'jn' }, String(i + 1).padStart(2, '0')), label, el('span', { class: 'n' }, catCount(key)))))))));
    const fbtn = el('button', { type: 'button', class: 'fbtn', 'aria-expanded': String(filterOpen), 'aria-controls': 'fpanel',
      onclick: () => {
        filterOpen = !filterOpen;
        panel.setAttribute('data-open', filterOpen ? '1' : '0');
        panel.inert = !filterOpen;
        fbtn.setAttribute('aria-expanded', String(filterOpen));
      } }, 'Filter', chev(12));

    const root = el('div', { class: 'board' });
    root.append(el('header', { class: 'top' },
      el('div', { class: 'topline' },
        el('p', { class: 'kicker' }, 'Physiker Stellen · private'),
        el('div', { class: 'utility', role: 'group', 'aria-label': 'Open or close all sections' },
          el('button', { type: 'button', class: 'ubtn', onclick: () => foldAll(true) }, 'Expand all'),
          el('button', { type: 'button', class: 'ubtn', onclick: () => foldAll(false) }, 'Collapse all'),
          el('button', { type: 'button', class: 'ubtn quiet signout', onclick: signOut }, 'Sign out'))),
      el('div', { class: 'titlerow' },
        el('h1', {}, 'Open postings'),
        el('div', { class: 'tally' },
          el('span', { class: 't open' }, el('b', {}, openList.length), el('span', {}, 'Open')),
          el('a', { href: '#record', class: 't applied', onclick: toRecord }, el('b', {}, applied.length), el('span', {}, 'Applied')),
          el('a', { href: '#record', class: 't notrel', onclick: toRecord }, el('b', {}, notRelevant.length), el('span', {}, 'Not relevant')))),
      el('div', { class: 'filterrow' }, fbtn, ...tags, !tags.length && el('span', { class: 'fnote' }, 'Showing everything')),
      panel));

    if (banner) root.append(el('p', { class: 'banner', role: 'alert' }, banner));

    const main = el('main', { class: 'sections' });
    categories.forEach(([key, label], i) => {
      if (cat !== 'all' && key !== cat) return;
      const inCat = openList.filter(c => c.category === key);
      const shown = inCat.filter(c => area === 'all' || c.area === area).length;
      const counts = areas.map(([a, l]) => {
        const n = inCat.filter(c => c.area === a).length;
        return el('span', {}, l + ' ' + n);
      });
      const formHere = form && form.category === key;
      const body = [
        formHere ? addForm(key)
          : el('div', { class: 'sec-tools' }, el('button', { type: 'button', class: 'add', onclick: () => openForm(key) }, '+ Add posting')),
      ];
      for (const [a, l] of shownAreas) {
        body.push(foldArea(key, a, l, inCat.filter(c => c.area === a).sort((x, y) => y.sortKey.localeCompare(x.sortKey))));
      }
      main.append(foldSection(key, { class: 'cat', id: 'cat-' + key, 'data-cat': key },
        [el('h2', {}, el('span', { class: 'num' }, String(i + 1).padStart(2, '0')), label),
         el('p', { class: 'counts' }, el('span', { class: 'lead' }, shown + ' open'), ' · ',
           ...counts.flatMap((c, j) => (j ? [' · ', c] : [c])))],
        body, label));
    });

    const recordList = (items, empty) => items.length
      ? el('ul', {}, ...items.map(r => el('li', {},
          el('span', { class: 'when' }, dateLabel(r.at)),
          el('span', { class: 'what' },
            r.url ? el('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer' }, r.title) : r.title,
            el('span', { class: 'meta' }, [r.company, r.category && catLabel(r.category), r.area && areaLabel(r.area)].filter(Boolean).join(' · '))),
          el('button', { type: 'button', class: 'undo', title: 'Put this posting back on the list',
            onclick: () => setOutcome({ key: r.key }, null) }, 'Undo'))))
      : el('p', { class: 'empty' }, empty);
    main.append(foldSection('record', { class: 'cat record', id: 'record', 'data-cat': 'record' },
      [el('h2', {}, 'Your record'),
       el('p', { class: 'counts' }, el('span', { class: 'lead' }, applied.length + ' applied'), ' · ', notRelevant.length + ' not relevant')],
      [el('div', { class: 'record-cols' },
        el('div', {}, el('h3', {}, 'Applied ', el('span', { class: 'count' }, applied.length)), recordList(applied, 'Nothing yet.')),
        el('div', {}, el('h3', {}, 'Not relevant ', el('span', { class: 'count' }, notRelevant.length)), recordList(notRelevant, 'Nothing yet.')))],
      'your record'));
    root.append(main);
    root.append(el('footer', {}, el('p', {}, meta.rule ?? ''), el('p', {}, 'List updated ' + (meta.updated ?? '—'))));
    fill(mount, root);
    headObserver.disconnect();
    for (const head of mount.querySelectorAll('.cat > [data-head]')) headObserver.observe(head);
  }

  render();

  return {
    updateData(next) {
      // Never redraw under a half-typed form or an open Remove choice.
      if (form || choosing) { pendingData = next; return; }
      applyData(next);
      render();
    },
  };
}
