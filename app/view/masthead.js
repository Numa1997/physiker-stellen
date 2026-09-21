// Title block and the four figures.

import { el } from './dom.js';

export function masthead(meta, stats) {
  const figure = (n, label, accent = false) => el('div', {},
    el('div', { class: `figure__n${accent ? ' figure__n--accent' : ''}` }, n),
    el('div', { class: 'figure__label' }, label));

  return el('header', { class: 'mast' },
    el('div', {},
      el('p', { class: 'mast__kicker' },
        `Job dossier · ${meta.candidate ?? 'Numa'}`),
      el('h1', { class: 'mast__title' }, 'Simulation, systems & data roles')),
    el('div', { class: 'mast__side' },
      el('p', { class: 'mast__rule' },
        `${shortRule(meta.filter_rule)} Every card carries the posting's own `
        + 'German wording as proof. Scan weekly, open, mark applied, strike '
        + 'off what’s dead.'),
      el('div', { class: 'mast__figures' },
        figure(stats.postings, 'postings'),
        figure(stats.companies, 'companies'),
        figure(stats.starred, '★ top matches', true),
        figure(stats.boards, 'job boards'))));
}

// The stored rule carries the whole audit history after a "||" separator;
// the masthead only wants the opening statement.
function shortRule(rule) {
  if (!rule) return '';
  return String(rule).split('||')[0].trim();
}
