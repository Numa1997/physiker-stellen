// A foldable job section (02–08): heading, counts, and a card grid that
// may be split into Berlin / Leipzig / Rest of Germany subgroups.

import { el } from './dom.js';
import { jobCard } from './job-card.js';

const SWATCH = {
  berlin:  '#4a3566',
  leipzig: '#275045',
  de:      '#6b5233',
  eu:      '#2f4a63',
};

const SUBGROUP_ORDER = [
  ['berlin',  'Berlin'],
  ['leipzig', 'Leipzig'],
  ['de',      'Rest of Germany'],
  ['eu',      'Europe'],
];

/**
 * @param spec   {id, num, kick, title, subgroups?} from the meta sections
 * @param jobs   the postings already filtered and sorted for this section
 * @param total  how many this section holds before filtering
 */
export function jobSection(spec, jobs, total, marks, ctx) {
  const open = ctx.isOpen(spec.id);

  const section = el('section', {
    class: 'section', id: spec.id, 'data-collapsed': String(!open),
  });

  section.append(el('div', {
    class: 'section__head',
    onclick: () => ctx.toggleSection(spec.id),
    title: open ? 'Fold this section' : 'Unfold this section',
  },
    el('div', {},
      el('p', { class: 'section__kicker' }, `${spec.num} · ${spec.kick}`),
      el('h2', { class: 'section__title' }, spec.title)),
    el('div', { style: 'display:flex;align-items:center;gap:10px' },
      el('span', { class: 'section__count' }, `${jobs.length} of ${total} showing`),
      el('button', {
        class: 'chip', 'aria-expanded': String(open),
        onclick: (e) => { e.stopPropagation(); ctx.toggleSection(spec.id); },
      }, open ? 'Fold' : 'Unfold'))));

  const body = el('div', {});
  if (spec.subgroups?.length) {
    for (const [group, label] of SUBGROUP_ORDER) {
      const inGroup = jobs.filter((j) => j.location_group === group);
      // A subgroup this section never uses is absent, not empty.
      if (!inGroup.length && !sectionUses(spec, group)) continue;
      body.append(subgroup(label, group, inGroup, marks, ctx));
    }
  } else {
    body.append(grid(jobs, marks, ctx));
  }

  section.append(el('div', { class: 'fold', 'data-open': String(open) },
    el('div', {}, body)));
  return section;
}

function sectionUses(spec, group) {
  const wanted = { berlin: 'Berlin', leipzig: 'Leipzig', de: 'Rest of Germany' };
  return (spec.subgroups ?? []).includes(wanted[group]);
}

function subgroup(label, group, jobs, marks, ctx) {
  const wrap = el('div', { class: 'subgroup' },
    el('h3', { class: 'subgroup__title' },
      el('span', {
        class: 'subgroup__swatch',
        style: `background:${SWATCH[group] ?? 'var(--muted)'}`,
      }),
      label,
      el('span', { class: 'subgroup__n' }, String(jobs.length))));

  if (!jobs.length) {
    wrap.append(el('p', { class: 'subgroup__empty' },
      'Nothing here matches the current filters.'));
  } else {
    wrap.append(grid(jobs, marks, ctx));
  }
  return wrap;
}

function grid(jobs, marks, ctx) {
  return el('div', { class: 'grid3' },
    ...jobs.map((j) => jobCard(j, marks, ctx)));
}
