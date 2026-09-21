// Section 09: the portals worth re-running by hand.

import { el, hostOf } from './dom.js';

export function jobBoards(boards, total, ctx) {
  const open = ctx.isOpen('s7');

  const section = el('section', {
    class: 'section', id: 's7', 'data-collapsed': String(!open),
  });

  section.append(el('div', {
    class: 'section__head',
    onclick: () => ctx.toggleSection('s7'),
  },
    el('div', {},
      el('p', { class: 'section__kicker' }, '09 · Re-run weekly'),
      el('h2', { class: 'section__title' }, 'Live Job Boards')),
    el('div', { style: 'display:flex;align-items:center;gap:10px' },
      el('span', { class: 'section__count' }, `${boards.length} of ${total} showing`),
      el('button', {
        class: 'chip', 'aria-expanded': String(open),
        onclick: (e) => { e.stopPropagation(); ctx.toggleSection('s7'); },
      }, open ? 'Fold' : 'Unfold'))));

  const list = el('ul', { class: 'boards' },
    ...boards.map((b) => el('li', {},
      el('span', { class: `pill pill--${b.location_group ?? 'de'}` },
        labelFor(b.location_group)),
      el('a', { href: b.url, target: '_blank', rel: 'noopener' }, b.label),
      el('span', { class: 'boards__host' }, `${hostOf(b.url)} ↗`))));

  section.append(el('div', { class: 'fold', 'data-open': String(open) },
    el('div', {}, list)));
  return section;
}

const LABELS = { berlin: 'Berlin', leipzig: 'Leipzig', de: 'Germany-wide', eu: 'Europe' };
const labelFor = (g) => LABELS[g] ?? 'Germany-wide';
