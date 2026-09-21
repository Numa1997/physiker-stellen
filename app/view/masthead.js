// Masthead and the section pill row, markup as in the template.

import { el, hover } from './dom.js';

const MONO = "font-family:'IBM Plex Mono',monospace";
const SERIF = "font-family:'Instrument Serif',serif";

export function masthead(v) {
  const figure = (n, label, color) => el('div', {},
    el('div', { style: `${SERIF};font-size:34px;line-height:1${color ? `;color:${color}` : ''}` }, String(n)),
    el('div', { style: `${MONO};font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8b8079;margin-top:4px` }, label));

  return el('header', { 'data-mast': '1', style: 'display:grid;grid-template-columns:1.3fr 1fr;gap:40px;padding:56px 0 36px;border-bottom:1px solid #1c1518;align-items:end' },
    el('div', {},
      el('p', { style: `margin:0 0 14px;${MONO};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7a1f2b` }, 'Job dossier · Numa · BSc Physics, Leipzig'),
      el('h1', { style: `margin:0;${SERIF.replace('serif', 'Georgia,serif')};font-weight:400;font-size:clamp(44px,5.4vw,78px);line-height:.98;letter-spacing:-.02em` }, 'Simulation, systems & data roles')),
    el('div', { style: 'display:flex;flex-direction:column;gap:18px;padding-bottom:6px' },
      el('p', { style: 'margin:0;font-size:15px;line-height:1.55;color:#5a504b;max-width:46ch' },
        `${v.filterRule} Every card carries the posting's own German wording as proof. Scan weekly, open, mark applied, strike off what's dead.`),
      el('div', { style: 'display:grid;grid-template-columns:repeat(4,auto);gap:22px;justify-content:start' },
        figure(v.nJobs, 'postings'), figure(v.nCompanies, 'companies'),
        figure(v.nStarred, '★ top matches', '#7a1f2b'), figure(v.nBoards, 'job boards'))));
}

export function sectionNav(items) {
  return el('nav', { 'data-print-hide': '1', style: 'display:flex;flex-wrap:wrap;gap:6px;padding:16px 0 40px' },
    ...items.map((s) => hover(el('a', {
      href: `#${s.id}`, onclick: s.onClick,
      style: `${MONO};font-size:11.5px;padding:5px 11px;border:1px solid #d9d0c2;border-radius:999px;color:#5a504b;background:transparent`,
    }, `${s.num} · ${s.short}`), 'border-color:#7a1f2b;color:#7a1f2b;text-decoration:none')));
}
