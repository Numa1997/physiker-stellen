// One posting card, markup as in the artifact's template.

import { el, hover } from './dom.js';
import { noteBtn, advance, stepBack, setStage, clearStage } from '../state/pipeline.js';
import { eligibilityLabel } from '../state/eligibility.js';

const MONO = "font-family:'IBM Plex Mono',monospace";
const SERIF = "font-family:'Instrument Serif',serif";

export function jobCard(j, a) {
  const key = j.key;
  const card = el('article', {
    'data-card': '1', 'data-removed': j.removedAttr,
    style: `background:${j.bg};border:1px solid #cdc1ae;border-left:${j.borderLeft};border-radius:6px;padding:16px 16px 12px;display:flex;flex-direction:column;gap:10px;opacity:${j.opacity};border-style:${j.borderStyle}`,
  });

  // top row: pills + number
  const pills = el('div', { style: 'display:flex;gap:6px;align-items:center;flex-wrap:wrap' },
    el('span', { style: `${MONO};font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:500;padding:2px 7px;border-radius:3px;background:${j.pillBg};color:${j.pillColor}` }, j.locLabel),
    el('span', { style: `${MONO};font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#8b8079` }, j.catLabel),
    j.hasEmp && el('span', { style: `${MONO};font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#7a4b12;border:1px solid #e3d2b0;padding:1px 6px;border-radius:3px` }, j.emp),
    j.isDup && el('span', { style: `${MONO};font-size:10px;color:#8b8079;border:1px dashed #d9d0c2;padding:1px 6px;border-radius:3px` }, `mirror of #${j.dupOf}`));
  card.append(el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:8px' },
    pills, el('span', { style: `${MONO};font-size:11px;color:#8b8079;white-space:nowrap` }, `#${j.n}`)));

  if (j.starred) card.append(el('div', { style: `${MONO};font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#7a1f2b;font-weight:500` }, '★ Top match'));

  // title block
  const titleWrap = el('div', {},
    el('h4', { style: `margin:0;${SERIF};font-weight:400;font-size:21px;line-height:1.15;text-decoration:${j.strike};color:${j.titleColor}` },
      hover(el('a', { href: j.url, target: '_blank', rel: 'noopener', style: 'color:inherit' }, j.title), 'color:#7a1f2b;text-decoration:underline')),
    j.showOriginal && el('p', { 'data-cardsub': '1', style: `margin:3px 0 0;${MONO};font-size:11px;color:#8b8079;line-height:1.4` }, j.titleOriginal),
    el('p', { style: 'margin:6px 0 0;font-size:13.5px;color:#3a322e' },
      el('span', { style: 'font-weight:500' }, j.company), el('span', { style: 'color:#8b8079' }, ` · ${j.city ?? ''}`)));
  card.append(titleWrap);

  // eligibility box — the payload. Label derived from the posting's wording,
  // never asserted (see state/eligibility.js).
  if (j.hasElig) {
    const { label, tone } = eligibilityLabel(j.raw);
    const lc = tone === 'warn' ? '#7a4b12' : '#7a1f2b';
    card.append(el('div', { 'data-cardelig': '1', style: `background:#fbf6ee;border-left:2px solid ${lc};padding:8px 10px;border-radius:0 4px 4px 0` },
      el('div', { style: `${MONO};font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:${lc};margin-bottom:3px;font-weight:500` }, label),
      j.hasEligEn && el('p', { style: 'margin:0;font-size:13px;line-height:1.45;color:#1c1518' }, j.eligEn),
      el('p', { style: `margin:3px 0 0;${MONO};font-size:11px;line-height:1.5;color:#5a504b` }, `„${j.eligDe}“`)));
  }

  if (j.hasSkills) {
    card.append(el('div', { 'data-cardskills': '1', style: 'display:flex;flex-wrap:wrap;gap:4px' },
      ...j.skills.map((t) => el('span', { style: `${MONO};font-size:11px;padding:1px 6px;border:1px solid #e3dccf;border-radius:3px;color:#5a504b;background:#f5f1ea` }, t))));
  }
  if (j.hasSalary) {
    card.append(el('p', { style: `margin:0;${MONO};font-size:12px;color:#1c1518` },
      el('span', { style: 'font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:#8b8079;margin-right:6px' }, 'Salary'), j.salary));
  }
  if (j.hasNote) card.append(el('p', { 'data-cardnote': '1', style: 'margin:0;font-size:13px;line-height:1.5;color:#5a504b' }, j.note));

  if (j.removed) {
    card.append(el('div', { 'data-print-hide': '1', style: `display:flex;justify-content:space-between;align-items:center;gap:8px;background:#efe9df;border-radius:4px;padding:6px 10px;${MONO};font-size:11px;color:#5a504b;margin-top:auto` },
      el('span', {}, j.removedByTask ? `Removed ${j.removedOn}${j.removedWhy ? ` — ${j.removedWhy}` : ''}` : 'Removed from list'),
      !j.removedByTask && el('button', { onclick: () => a.writeMark(key, { removed: false }), style: `${MONO};font-size:11px;border:1px solid #7a1f2b;background:#fff;color:#7a1f2b;border-radius:3px;padding:2px 9px;cursor:pointer` }, 'Restore')));
    return card;
  }

  // stage line
  if (j.hasStage) {
    const line = el('div', { 'data-stageline': '1', 'data-print-hide': '1' },
      el('span', { style: `color:${j.stageDot}` }, '●'),
      el('span', { style: `background:${j.stageLabelBg};color:${j.stageLabelColor};padding:${j.stageLabelPad};border-radius:${j.stageLabelRadius};text-decoration:${j.stageLabelStrike};font-weight:500` }, j.stageLabel));
    if (j.hasWait) {
      line.append(el('span', { style: 'color:#8b8079' }, `· ${j.waitPrefixLabel}`), el('span', { style: `color:${j.waitColor}` }, j.waitDaysLabel));
    }
    card.append(line);
  }

  // actions
  const nb = noteBtn(a.isNoteOpen(key), j.noteText);
  const mark = j.mark;
  const menuOpen = a.isMenuOpen(key);
  const menu = el('div', { 'data-menu': '1' },
    el('button', { 'data-menubtn': '1', title: 'More stage actions', 'aria-label': 'More stage actions', onclick: (e) => { e.stopPropagation(); a.toggleMenu(key); } }, '⋯'),
    menuOpen && el('div', { 'data-menupop': '1' },
      el('button', { 'data-menuitem': '1', onclick: () => a.writeMark(key, setStage('offer')) }, 'Offer'),
      el('button', { 'data-menuitem': '1', onclick: () => a.writeMark(key, setStage('rejected')) }, 'Rejected'),
      el('button', { 'data-menuitem': '1', onclick: () => a.writeMark(key, setStage('withdrawn')) }, 'Withdrawn'),
      el('button', { 'data-menuitem': '1', onclick: () => { const p = stepBack(mark); if (p) a.writeMark(key, p); } }, 'Step back'),
      el('button', { 'data-menuitem': '1', onclick: () => a.writeMark(key, clearStage()) }, 'Clear stage')));

  const actions = el('div', { 'data-print-hide': '1', style: 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:auto;padding-top:10px;border-top:1px solid #e3dccf' },
    j.hasAdvance && el('button', { 'data-advance': '1', onclick: () => { const p = advance(mark); if (p) a.writeMark(key, p); } }, j.advanceLabel),
    menu,
    el('button', { onclick: () => a.toggleNote(key), style: `${MONO};font-size:11px;padding:4px 10px;border:1px solid ${nb.ntBorder};background:${nb.ntBg};color:${nb.ntColor};border-radius:3px;cursor:pointer` }, 'Notes'),
    hover(el('button', { title: 'Remove from list', onclick: () => a.writeMark(key, { removed: true }), style: `margin-left:auto;${MONO};font-size:11px;padding:4px 9px;border:1px solid #e3dccf;background:transparent;color:#8b8079;border-radius:3px;cursor:pointer` }, '✕'), 'border-color:#7a1f2b;color:#7a1f2b'));
  card.append(actions);

  if (a.isNoteOpen(key)) {
    const ta = el('textarea', { 'data-print-hide': '1', rows: '3', placeholder: 'Your notes…', style: 'width:100%;font-size:13px;padding:8px;border:1px solid #d9d0c2;border-radius:4px;resize:vertical;background:#fff;color:#1c1518' });
    ta.value = j.noteText;
    ta.addEventListener('change', () => a.writeMark(key, { note: ta.value }));
    card.append(ta);
  }
  return card;
}
