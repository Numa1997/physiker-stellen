// Section 01, the dark priority panel: Tier A and B feature cards, Tier C
// as a compact table. Markup as in the template.

import { el, hover } from './dom.js';
import { foldSection } from './fold.js';
import { noteBtn } from '../state/pipeline.js';

const MONO = "font-family:'IBM Plex Mono',monospace";
const SERIF = "font-family:'Instrument Serif',serif";

export function companySection(v, a) {
  const head = el('div', {},
    el('p', { style: `margin:0 0 8px;${MONO};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#e2a2aa` }, '01 · Priority section'),
    el('h2', { style: `margin:0;${SERIF};font-weight:400;font-size:clamp(34px,3.6vw,52px);line-height:1.02;letter-spacing:-.015em` },
      'Berlin & Surroundings — ', el('em', {}, 'Simulation Software Companies')));

  const count = el('p', { 'data-sec-count': '1', style: 'margin:0;max-width:44ch;font-size:13.5px;line-height:1.5;color:rgba(245,241,234,.7)' },
    'Companies, not job ads. Tier A build their own solvers, Tier B are Berlin research institutes, Tier C is the rest of Germany. ',
    el('span', { style: `${MONO};color:#e2a2aa` }, `${v.s1Count} showing`));

  const tierH = (tag, text, n) => el('h3', { style: `margin:0 0 14px;display:flex;align-items:baseline;gap:12px;${SERIF};font-weight:400;font-size:24px` },
    el('span', { style: `${MONO};font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#e2a2aa` }, tag), `${text} `,
    el('span', { style: `${MONO};font-size:11px;color:rgba(245,241,234,.55)` }, String(n)));

  const body = [];
  if (v.tierABVisible) {
    body.push(tierH('Tier A', 'Build their own solver', v.tierA.length),
      el('div', { 'data-grid2': '1', style: 'margin-bottom:36px' }, ...v.tierA.map((c) => tierACard(c, a))),
      tierH('Tier B', 'Berlin research institutes', v.tierB.length),
      el('div', { 'data-grid2': '1', style: 'margin-bottom:36px' }, ...v.tierB.map((c) => tierBCard(c, a))));
  }
  if (v.tierCVisible) {
    body.push(tierH('Tier C', 'Rest of Germany', v.tierC.length), tierCTable(v.tierC));
  }

  return foldSection({ id: 's1', collapsed: v.collapsed }, head, count, v.summary, body, a, {
    dark: true, s1: true,
    sectionStyle: 'scroll-margin-top:110px;margin:0 -28px 64px;background:#1c1518;color:#f5f1ea;border-radius:2px;view-transition-name:vtS1',
  });
}

const linkBtn = (l) => hover(el('a', { href: l.url, target: '_blank', rel: 'noopener', style: 'font-size:12.5px;padding:5px 11px;border:1px solid #7a1f2b;border-radius:4px;color:#7a1f2b;background:#fff' }, `${l.label} ↗`), 'background:#7a1f2b;color:#fff;text-decoration:none');
const linkBtnDk = (l) => hover(el('a', { href: l.url, target: '_blank', rel: 'noopener', style: 'font-size:12.5px;padding:4px 10px;border:1px solid rgba(245,241,234,.4);border-radius:4px;color:#f5f1ea' }, `${l.label} ↗`), 'background:#f5f1ea;color:#1c1518;text-decoration:none');

function marksRow(c, a, dark) {
  const key = c.key;
  const nb = noteBtn(a.isNoteOpen(key), c.noteText);
  const parts = [];
  if (c.removed) {
    parts.push(el('div', { 'data-print-hide': '1', style: dark
      ? `display:flex;justify-content:space-between;align-items:center;gap:8px;background:rgba(245,241,234,.1);border-radius:4px;padding:6px 10px;${MONO};font-size:11px`
      : `display:flex;justify-content:space-between;align-items:center;gap:8px;background:#e9e2d6;border-radius:4px;padding:6px 10px;${MONO};font-size:11px;color:#5a504b` },
      el('span', {}, 'Removed from list'),
      el('button', { onclick: () => a.writeMark(key, { removed: false }), style: dark
        ? `${MONO};font-size:11px;border:1px solid #f5f1ea;background:transparent;color:#f5f1ea;border-radius:3px;padding:2px 9px;cursor:pointer`
        : `${MONO};font-size:11px;border:1px solid #7a1f2b;background:#fff;color:#7a1f2b;border-radius:3px;padding:2px 9px;cursor:pointer` }, 'Restore')));
    return parts;
  }
  const ap = dark ? [c.apBorderDk, c.apBgDk, c.apColorDk] : [c.apBorder, c.apBg, c.apColor];
  const toggleApplied = () => a.writeMark(key, c.hasStage
    ? { stage: null, round: 0, stage_at: null } : { stage: 'applied', round: 0, stage_at: new Date().toISOString() });
  parts.push(el('div', { 'data-print-hide': '1', style: dark
    ? 'display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:8px;border-top:1px solid rgba(245,241,234,.15)'
    : 'display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:10px;border-top:1px solid #d9d0c2' },
    el('button', { onclick: toggleApplied, style: `${MONO};font-size:11px;padding:${dark ? '3px 9px' : '4px 10px'};border:1px solid ${ap[0]};background:${ap[1]};color:${ap[2]};border-radius:3px;cursor:pointer` }, '✓ Applied'),
    el('button', { onclick: () => a.toggleNote(key), style: dark
      ? `${MONO};font-size:11px;padding:3px 9px;border:1px solid rgba(245,241,234,.35);background:transparent;color:rgba(245,241,234,.8);border-radius:3px;cursor:pointer`
      : `${MONO};font-size:11px;padding:4px 10px;border:1px solid ${nb.ntBorder};background:${nb.ntBg};color:${nb.ntColor};border-radius:3px;cursor:pointer` }, 'Notes'),
    hover(el('button', { title: 'Remove from list', onclick: () => a.writeMark(key, { removed: true }), style: dark
      ? `margin-left:auto;${MONO};font-size:11px;padding:3px 8px;border:1px solid rgba(245,241,234,.25);background:transparent;color:rgba(245,241,234,.55);border-radius:3px;cursor:pointer`
      : `margin-left:auto;${MONO};font-size:11px;padding:4px 9px;border:1px solid #d9d0c2;background:transparent;color:#8b8079;border-radius:3px;cursor:pointer` }, '✕'),
      dark ? 'border-color:#e2a2aa;color:#e2a2aa' : 'border-color:#7a1f2b;color:#7a1f2b')));
  if (a.isNoteOpen(key)) {
    const ta = el('textarea', { 'data-print-hide': '1', rows: '3', placeholder: 'Your notes…', style: dark
      ? 'width:100%;font-size:13px;padding:8px;border:1px solid rgba(245,241,234,.3);border-radius:4px;resize:vertical;background:rgba(245,241,234,.08);color:#f5f1ea'
      : 'width:100%;font-size:13px;padding:8px;border:1px solid #d9d0c2;border-radius:4px;resize:vertical;background:#fff;color:#1c1518' });
    ta.value = c.noteText;
    ta.addEventListener('change', () => a.writeMark(key, { note: ta.value }));
    parts.push(ta);
  }
  return parts;
}

function tierACard(c, a) {
  return el('article', { 'data-card': '1', 'data-removed': c.removedAttr, style: `background:#f5f1ea;color:#1c1518;border-radius:6px;padding:20px 22px 16px;display:flex;flex-direction:column;gap:12px;opacity:${c.opacity};border:${c.border}` },
    el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:12px' },
      el('div', {},
        el('h4', { style: `margin:0;${SERIF};font-weight:400;font-size:26px;line-height:1.1;text-decoration:${c.strike}` }, c.name),
        el('p', { style: 'margin:6px 0 0;font-size:13px;color:#5a504b' }, c.city ?? '')),
      el('span', { style: `${MONO};font-size:11px;color:#8b8079;white-space:nowrap` }, `A · ${c.n}`)),
    el('p', { 'data-cardnote': '1', style: 'margin:0;font-size:14px;line-height:1.55;color:#3a322e' }, c.description ?? ''),
    el('div', { 'data-cardskills': '1', style: 'display:flex;flex-wrap:wrap;gap:5px' },
      ...(c.tags ?? []).map((t) => el('span', { style: `${MONO};font-size:11px;padding:2px 7px;border:1px solid #d9d0c2;border-radius:3px;color:#5a504b;background:#fff` }, t))),
    el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' }, ...(c.links ?? []).map(linkBtn)),
    ...marksRow(c, a, false));
}

function tierBCard(c, a) {
  return el('article', { 'data-card': '1', 'data-removed': c.removedAttr, style: `background:rgba(245,241,234,.06);border:1px solid rgba(245,241,234,.32);color:#f5f1ea;border-radius:6px;padding:16px 18px 14px;display:flex;flex-direction:column;gap:10px;opacity:${c.opacity}` },
    el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:12px' },
      el('div', {},
        el('h4', { style: `margin:0;${SERIF};font-weight:400;font-size:21px;line-height:1.15;text-decoration:${c.strike}` }, c.name),
        el('p', { style: 'margin:4px 0 0;font-size:12.5px;color:rgba(245,241,234,.6)' }, c.city ?? '')),
      el('span', { style: `${MONO};font-size:11px;color:rgba(245,241,234,.5);white-space:nowrap` }, `B · ${c.n}`)),
    el('p', { 'data-cardnote': '1', style: 'margin:0;font-size:13.5px;line-height:1.5;color:rgba(245,241,234,.82)' }, c.description ?? ''),
    el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:center' },
      ...(c.links ?? []).map(linkBtnDk),
      ...(c.tags ?? []).map((t) => el('span', { style: `${MONO};font-size:11px;color:rgba(245,241,234,.55);margin-left:4px` }, t))),
    ...marksRow(c, a, true));
}

function tierCTable(rows) {
  const th = (t) => el('th', { style: `text-align:left;${MONO};font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:500;color:#e2a2aa;padding:10px 14px;border-bottom:1px solid rgba(245,241,234,.25)` }, t);
  const td = (extra, ...k) => el('td', { style: `padding:9px 14px;border-bottom:1px solid rgba(245,241,234,.1);${extra}` }, ...k);
  return el('div', { 'data-print-visible': '1', style: 'overflow-x:auto;border:1px solid rgba(245,241,234,.2);border-radius:6px' },
    el('table', { style: 'border-collapse:collapse;width:100%;font-size:13.5px;min-width:600px' },
      el('thead', {}, el('tr', {}, th('Company'), th('Location'), th('Product'), th('Link'))),
      el('tbody', {}, ...rows.map((r) => el('tr', {},
        td('font-weight:500', r.name),
        td('color:rgba(245,241,234,.7)', r.location ?? ''),
        td('color:rgba(245,241,234,.7)', r.product ?? ''),
        td('', r.hasUrl
          ? hover(el('a', { href: r.url, target: '_blank', rel: 'noopener', style: `color:#e2a2aa;${MONO};font-size:12px` }, `${r.host} ↗`), 'color:#fff')
          : el('span', { style: `color:rgba(245,241,234,.35);${MONO};font-size:12px` }, '—')))))));
}
