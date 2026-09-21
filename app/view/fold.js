// The collapsible section scaffold shared by sections 01–09, emitting the
// template's exact markup so the artifact's stylesheet drives it: the
// header row as hit target, the rotating chevron, the folded-paper summary
// strip, and the two grid-template-rows folds.

import { el, chevron } from './dom.js';

/**
 * @param sec  {id, vtName, collapsed, dark?, s1?}
 * @param head the <div> content left of the count (kicker + title)
 * @param countText e.g. "12 of 40 showing"
 * @param summary [lead, rest]
 * @param body the section's content node(s) when open
 * @param a    {toggle(id)} fold handler
 * @param extraSectionStyle appended to the <section> style
 */
export function foldSection(sec, head, countText, summary, body, a, opts = {}) {
  const { dark = false, s1 = false, countStyle = '', sectionStyle = '' } = opts;
  const collapsed = Boolean(sec.collapsed);
  const openAttr = collapsed ? '0' : '1', foldedAttr = collapsed ? '1' : '0';
  const title = collapsed ? 'Expand this section' : 'Collapse this section';
  const toggle = () => a.toggle(sec.id);
  const toggleBtn = (e) => { e.stopPropagation(); toggle(); };

  const section = el('section', {
    id: sec.id, 'data-sec': '1', 'data-collapsed': foldedAttr, 'data-print-visible': '1',
    ...(dark ? { 'data-dark': '1', 'data-s1sec': '1' } : {}),
    style: sectionStyle,
  });

  const headRow = el('div', {
    'data-sec-head': '1', ...(dark ? { 'data-dark-head': '1' } : {}),
    onclick: toggle, title,
    style: 'display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:' + (s1 ? '16px' : '12px'),
  },
    head,
    el('div', { style: s1 ? 'display:flex;flex-wrap:wrap;align-items:center;gap:14px' : 'display:flex;align-items:center;gap:10px' },
      countText,
      el('button', {
        type: 'button', 'data-toggle': '1', ...(dark ? { 'data-dark-toggle': '1' } : {}), 'data-print-hide': '1',
        'aria-expanded': collapsed ? 'false' : 'true', title, onclick: toggleBtn,
      }, chevron({ 'data-open': openAttr }), el('span', { 'data-toggle-label': '1' }, collapsed ? 'Expand' : 'Collapse'))));

  const strip = el('div', { 'data-fold': '1', 'data-open': foldedAttr },
    el('div', { 'data-fold-i': '1' },
      el('div', { 'data-folded': '1', ...(dark ? { 'data-dark-folded': '1' } : {}), 'data-print-hide': '1', onclick: toggle, title },
        el('span', { 'data-folded-sum': '1' },
          el('span', { 'data-folded-lead': '1' }, summary[0] ?? ''),
          el('span', { 'data-folded-rest': '1' }, summary[1] ?? '')),
        el('span', { 'data-folded-hint': '1' }, chevron({ 'data-dir': 'down' }), 'Expand'))));

  const fold = el('div', { 'data-fold': '1', 'data-open': openAttr },
    el('div', { 'data-fold-i': '1' },
      el('div', { 'data-sec-body': '1', ...(dark ? { 'data-dark-body': '1' } : {}) }, body)));

  if (s1) {
    section.append(el('div', { style: 'max-width:1384px;margin:0 auto' }, headRow, strip, fold));
  } else {
    section.append(headRow, strip, fold);
  }
  return section;
}

/**
 * What a folded section still tells you: how much is in there, and how it
 * splits. Returns [lead, rest].
 */
export function foldSummary(items, noun, subgroups) {
  const n = items.length, parts = [];
  if (subgroups) subgroups.forEach((g) => { if (g.hasLabel && g.shown) parts.push(`${g.label} ${g.shown}`); });
  const prog = items.filter((x) => x.hasStage && !x.terminal).length; if (prog) parts.push(`${prog} in progress`);
  const off = items.filter((x) => x.stage === 'offer').length; if (off) parts.push(`${off} offer${off === 1 ? '' : 's'}`);
  const st = items.filter((x) => x.starred).length; if (st) parts.push(`${st} starred`);
  return [`${n} ${n === 1 ? noun : noun + 's'}`, parts.length ? `· ${parts.join(' · ')}` : ''];
}
