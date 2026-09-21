// Section 01, the priority block: Tier A and B as feature cards on the
// dark panel, Tier C as a compact table.

import { el, hostOf } from './dom.js';

export function companySection(companies, ctx) {
  const open = ctx.isOpen('s1');
  const tier = (t) => companies.filter((c) => c.tier === t);
  const [a, b, c] = [tier('A'), tier('B'), tier('C')];

  const section = el('section', {
    class: 'section s1', id: 's1', 'data-collapsed': String(!open),
  });
  const inner = el('div', { class: 's1__inner' });

  inner.append(el('div', {
    class: 'section__head',
    onclick: () => ctx.toggleSection('s1'),
  },
    el('div', {},
      el('p', { class: 'section__kicker' }, '01 · Priority section'),
      el('h2', { class: 'section__title' },
        'Berlin & Surroundings — ', el('em', {}, 'Simulation Software Companies'))),
    el('div', { style: 'display:flex;align-items:center;gap:14px' },
      el('span', { class: 'section__count' },
        `${companies.length} showing`),
      el('button', {
        class: 'chip', 'aria-expanded': String(open),
        onclick: (e) => { e.stopPropagation(); ctx.toggleSection('s1'); },
      }, open ? 'Fold' : 'Unfold'))));

  const body = el('div', {});
  if (a.length) {
    body.append(tierHead('Tier A', 'Build their own solver', a.length));
    body.append(el('div', { class: 'grid2', style: 'margin-bottom:36px' },
      ...a.map((x) => featureCard(x, false))));
  }
  if (b.length) {
    body.append(tierHead('Tier B', 'Berlin research institutes', b.length));
    body.append(el('div', { class: 'grid2', style: 'margin-bottom:36px' },
      ...b.map((x) => featureCard(x, true))));
  }
  if (c.length) {
    body.append(tierHead('Tier C', 'Rest of Germany', c.length));
    body.append(tierCTable(c));
  }

  inner.append(el('div', { class: 'fold', 'data-open': String(open) },
    el('div', {}, body)));
  section.append(inner);
  return section;
}

function tierHead(tag, text, n) {
  return el('h3', { class: 's1__tier' },
    el('em', {}, tag), text, el('span', {}, String(n)));
}

function featureCard(co, compact) {
  const card = el('article', { class: `co-card${compact ? ' co-card--b' : ''}` });

  card.append(el('div', {
    style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:12px',
  },
    el('div', {},
      el('h4', { class: 'co-card__name' }, co.name),
      co.city && el('p', { class: 'co-card__city' }, co.city)),
    el('span', {
      style: 'font-family:var(--mono);font-size:11px;opacity:.6;white-space:nowrap',
    }, `${co.tier} · ${co.id.replace(/^\D+/, '')}`)));

  if (co.description) card.append(el('p', { class: 'co-card__desc' }, co.description));

  if (co.tags?.length && !compact) {
    card.append(el('div', { class: 'skills' },
      ...co.tags.map((t) => el('span', {}, t))));
  }

  const links = Array.isArray(co.links) ? co.links : [];
  if (links.length) {
    card.append(el('div', { class: 'co-card__links' },
      ...links.map((l) => el('a', {
        class: 'co-link', href: l.url, target: '_blank', rel: 'noopener',
      }, `${l.label} ↗`))));
  }
  if (compact && co.tags?.length) {
    card.append(el('div', {
      style: 'font-family:var(--mono);font-size:11px;opacity:.55',
    }, co.tags.join(' · ')));
  }
  return card;
}

function tierCTable(rows) {
  const head = ['Company', 'Location', 'Product', 'Link'];
  return el('div', { class: 'tier-c' },
    el('table', {},
      el('thead', {}, el('tr', {}, ...head.map((h) => el('th', {}, h)))),
      el('tbody', {}, ...rows.map((r) => el('tr', {},
        el('td', {}, r.name),
        el('td', {}, r.city ?? ''),
        el('td', {}, r.product ?? ''),
        el('td', {}, r.url
          ? el('a', { href: r.url, target: '_blank', rel: 'noopener' },
              `${hostOf(r.url)} ↗`)
          : el('span', { style: 'opacity:.35;font-family:var(--mono)' }, '—')))))));
}
