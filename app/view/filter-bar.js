// The sticky bar, markup as in the artifact's template: search, star and
// removed toggles, reset, the Collapse/Expand segmented control, the mobile
// Filters button, counters and sync indicator, then the chip rows.

import { el, chevron } from './dom.js';
import { LOC_OPTS, CAT_OPTS, SORT_OPTS, btn } from '../state/filters.js';

const MONO = "font-family:'IBM Plex Mono',monospace";
const chip = (o, on, onClick) => el('button', {
  onclick: onClick,
  style: `font-size:12.5px;padding:4px 11px;border:1px solid ${on.border};background:${on.bg};color:${on.color};border-radius:999px;cursor:pointer;line-height:1.4`,
}, o);
const legend = (t) => el('span', { style: `${MONO};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8b8079;margin-right:4px` }, t);
const group = (t, ...kids) => el('div', { style: 'display:flex;align-items:center;gap:5px;flex-wrap:wrap' }, legend(t), ...kids);

export function filterBar(v, a) {
  const search = el('input', {
    type: 'search', placeholder: 'Search title, company, skill…',
    style: 'flex:1;border:none;background:transparent;padding:8px 0;font-size:14px;color:#1c1518;outline:none',
  });
  search.value = v.q;
  search.addEventListener('input', () => a.setQ(search.value));

  const pillBtn = (label, on, onClick, extra = {}) => el('button', {
    onclick: onClick, ...extra,
    style: `font-size:13px;padding:6px 12px;border:1px solid ${on.border};background:${on.bg};color:${on.color};border-radius:999px;cursor:pointer`,
  }, label);

  const sep = () => el('span', { style: 'color:#d9d0c2' }, '·');

  const row1 = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center' },
    el('div', { style: 'display:flex;align-items:center;gap:8px;flex:1 1 260px;max-width:440px;background:#fff;border:1px solid #d9d0c2;border-radius:4px;padding:0 10px' },
      el('span', { style: `${MONO};font-size:11px;color:#8b8079` }, '/'), search),
    pillBtn('★ Starred only', btn(v.star), a.toggleStar),
    pillBtn(`Show removed (${v.nRemoved})`, btn(v.showRem), a.toggleShowRemoved),
    el('button', { onclick: a.resetFilters, style: 'font-size:12px;background:none;border:none;color:#8b8079;cursor:pointer;text-decoration:underline;padding:4px' }, 'Reset filters'),
    el('span', { 'data-foldbar': '1' },
      el('button', { type: 'button', 'data-foldbtn': '1', title: 'Fold every section', 'aria-label': 'Collapse all sections', onclick: a.collapseAll }, chevron({ 'data-dir': 'up' }), 'Collapse all'),
      el('button', { type: 'button', 'data-foldbtn': '1', title: 'Unfold every section', 'aria-label': 'Expand all sections', onclick: a.expandAll }, chevron({ 'data-dir': 'down' }), 'Expand all')),
    pillBtn(v.filtersOpen ? 'Filters ▴' : 'Filters ▾', btn(v.filtersOpen), a.toggleFilters, { 'data-mobile-only': '1' }),
    el('div', { style: `margin-left:auto;display:flex;gap:14px;align-items:center;${MONO};font-size:12px;color:#5a504b;white-space:nowrap` },
      el('span', {}, v.funnelLabel), sep(),
      el('span', {}, 'Removed ', el('b', { style: 'color:#7a1f2b;font-weight:500' }, String(v.nRemoved))), sep(),
      el('span', {}, 'Showing ', el('b', { style: 'color:#7a1f2b;font-weight:500' }, String(v.nShown))), sep(),
      el('span', { 'data-sync': '1', 'data-state': v.syncState, onclick: a.syncClick }, v.syncLabel)));

  const row2 = el('div', { 'data-filter-rows': '1', 'data-open': v.filtersOpen ? '1' : '0', style: 'display:flex;flex-wrap:wrap;gap:6px 22px;align-items:center' },
    group('Location', ...LOC_OPTS.map(([k, l]) => chip(l, btn(v.loc === k), () => a.set({ loc: k })))),
    group('Category', ...CAT_OPTS.map(([k, l]) => chip(l, btn(v.cat === k), () => a.set({ cat: k })))),
    group('Stage', ...v.stageOpts.map(([k, l]) => chip(l, btn(v.stageF === k), () => a.set({ stageF: k })))),
    group('Sort', ...SORT_OPTS.map(([k, l]) => chip(l, btn(v.sort === k), () => a.set({ sort: k })))),
    group('View', el('button', {
      onclick: a.toggleDensity, title: 'Switch between full cards and a compact scanning grid',
      style: `font-size:12.5px;padding:4px 11px;border:1px solid ${btn(v.density === 'compact').border};background:${btn(v.density === 'compact').bg};color:${btn(v.density === 'compact').color};border-radius:999px;cursor:pointer;line-height:1.4`,
    }, v.density === 'compact' ? 'Compact' : 'Full cards')));

  return el('div', { 'data-print-hide': '1', style: 'position:sticky;top:env(safe-area-inset-top,0px);z-index:50;background:rgba(245,241,234,.94);backdrop-filter:blur(10px);border-bottom:1px solid #d9d0c2' },
    el('div', { style: 'max-width:1440px;margin:0 auto;padding:10px 28px;display:flex;flex-direction:column;gap:8px' }, row1, row2));
}
