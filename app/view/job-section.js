// Sections 02–08: a foldable section with a card grid, optionally split
// into Berlin / Leipzig / Rest of Germany / Europe subgroups.

import { el } from './dom.js';
import { foldSection } from './fold.js';
import { jobCard } from './job-card.js';

const MONO = "font-family:'IBM Plex Mono',monospace";
const SERIF = "font-family:'Instrument Serif',serif";

export function jobSection(sec, a) {
  const head = el('div', {},
    el('p', { style: `margin:0 0 6px;${MONO};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7a1f2b` }, `${sec.num} · ${sec.kick}`),
    el('h2', { style: `margin:0;${SERIF};font-weight:400;font-size:clamp(30px,3vw,42px);line-height:1.05;letter-spacing:-.015em` }, sec.title));

  const count = el('span', { 'data-sec-count': '1', style: `${MONO};font-size:12px;color:#5a504b` }, `${sec.shown} of ${sec.total} showing`);

  const body = sec.subgroups.filter((sg) => sg.visible).map((sg) => el('div', { style: 'margin-bottom:28px' },
    sg.hasLabel && el('h3', { style: `margin:0 0 12px;display:flex;align-items:baseline;gap:10px;${SERIF};font-weight:400;font-size:22px;color:#3a322e` },
      el('span', { style: `display:inline-block;width:10px;height:10px;border-radius:2px;background:${sg.swatch}` }),
      `${sg.label} `, el('span', { style: `${MONO};font-size:11px;color:#8b8079` }, `${sg.shown} / ${sg.total}`)),
    sg.empty && el('p', { style: 'margin:0;font-size:13.5px;color:#8b8079;font-style:italic;padding:6px 0' }, 'Nothing here matches the current filters.'),
    el('div', { 'data-grid3': '1' }, ...sg.jobs.map((j) => jobCard(j, a)))));

  return foldSection(sec, head, count, sec.summary, body, a, {
    sectionStyle: `scroll-margin-top:110px;margin:0 0 64px;view-transition-name:${sec.vtName}`,
  });
}
