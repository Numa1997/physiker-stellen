// The sticky bar: search, toggles, filter chips, counters, sync indicator.

import { el } from './dom.js';

const LOCATIONS = [
  ['all', 'All'], ['berlin', 'Berlin'], ['leipzig', 'Leipzig'],
  ['de', 'Germany-wide'], ['eu', 'Europe'],
];
const STAGES = [
  ['all', 'All'], ['unmarked', 'Unmarked'], ['applied', 'Applied'],
  ['interview', 'Interview'], ['offer', 'Offer'], ['rejected', 'Rejected'],
];
const SORTS = [
  ['default', 'Section order'], ['newest', 'Newest first'], ['company', 'Company A–Z'],
];

export function filterBar(state, meta, counts, ctx) {
  const categories = [['all', 'All'], ...Object.entries(meta.categories ?? {})
    .filter(([k]) => !['firmen', 'boards'].includes(k))];

  const chips = (options, current, onPick) => options.map(([value, label]) =>
    el('button', {
      class: 'chip',
      'aria-pressed': String(current === value),
      onclick: () => onPick(value),
    }, label));

  const group = (legend, ...children) => el('div', { class: 'bar__group' },
    el('span', { class: 'bar__legend' }, legend), ...children);

  const search = el('input', {
    type: 'search', placeholder: 'Search title, company, skill…',
  });
  search.value = state.q;
  // Input rather than change, so the list narrows as you type.
  search.addEventListener('input', () => ctx.setFilter({ q: search.value }));

  const bar = el('div', { class: 'bar' });
  const inner = el('div', { class: 'bar__inner' });

  inner.append(el('div', { class: 'bar__row' },
    el('div', { class: 'bar__search' },
      el('span', { class: 'bar__slash' }, '/'), search),
    el('button', {
      class: 'chip chip--pill',
      'aria-pressed': String(state.starredOnly),
      onclick: () => ctx.setFilter({ starredOnly: !state.starredOnly }),
    }, '★ Starred only'),
    el('button', {
      class: 'chip chip--pill',
      'aria-pressed': String(state.showRemoved),
      onclick: () => ctx.setFilter({ showRemoved: !state.showRemoved }),
    }, `Show removed (${counts.removed})`),
    el('button', { class: 'link-btn', onclick: ctx.resetFilters }, 'Reset filters'),
    el('button', { class: 'chip', onclick: ctx.collapseAll }, 'Collapse all'),
    el('button', { class: 'chip', onclick: ctx.expandAll }, 'Expand all'),
    el('div', { class: 'bar__counts' },
      el('span', {}, 'Showing ', el('b', {}, String(counts.shown))),
      el('span', { style: 'color:var(--line)' }, '·'),
      el('span', {}, 'Removed ', el('b', {}, String(counts.removed))),
      el('span', { style: 'color:var(--line)' }, '·'),
      syncIndicator(counts.sync))));

  inner.append(el('div', { class: 'bar__row' },
    group('Location', ...chips(LOCATIONS, state.location,
      (location) => ctx.setFilter({ location }))),
    group('Category', ...chips(categories, state.category,
      (category) => ctx.setFilter({ category }))),
    group('Stage', ...chips(STAGES, state.stage,
      (stage) => ctx.setFilter({ stage }))),
    group('Sort', ...chips(SORTS, state.sort,
      (sort) => ctx.setFilter({ sort }))),
    group('View', el('button', {
      class: 'chip',
      title: 'Switch between full cards and a compact scanning grid',
      onclick: () => ctx.setFilter({
        density: state.density === 'full' ? 'compact' : 'full',
      }),
    }, state.density === 'full' ? 'Compact' : 'Full cards'))));

  bar.append(inner);
  return bar;
}

/**
 * Says whether a daily run is happening right now, and reports a failed
 * write rather than letting the page and the database drift apart in
 * silence.
 */
function syncIndicator(sync) {
  if (sync?.error) {
    return el('span', { class: 'sync', style: 'color:var(--accent)' },
      '⚠ not saved');
  }
  if (sync?.running) {
    return el('span', { class: 'sync', 'data-state': 'running' },
      'run in progress');
  }
  return el('span', { class: 'sync' }, 'up to date');
}
