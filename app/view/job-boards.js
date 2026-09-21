// Section 09: the portals worth re-running by hand. Markup as in the template.

import { el, hover } from './dom.js';
import { foldSection } from './fold.js';

const MONO = "font-family:'IBM Plex Mono',monospace";
const SERIF = "font-family:'Instrument Serif',serif";

export function jobBoards(v, a) {
  const head = el('div', {},
    el('p', { style: `margin:0 0 6px;${MONO};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7a1f2b` }, '09 · Re-run weekly'),
    el('h2', { style: `margin:0;${SERIF};font-weight:400;font-size:clamp(30px,3vw,42px);line-height:1.05;letter-spacing:-.015em` }, 'Live Job Boards'));
  const count = el('span', { 'data-sec-count': '1', style: `${MONO};font-size:12px;color:#5a504b` }, `${v.boards.length} of ${v.nBoards} showing`);

  const list = el('ul', { 'data-boards': '1', style: 'list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:#e3dccf;border:1px solid #e3dccf;border-radius:6px;overflow:hidden' },
    ...v.boards.map((b) => el('li', { style: 'background:#fff;padding:11px 14px;display:flex;align-items:center;gap:10px;font-size:14px' },
      el('span', { style: `${MONO};font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:500;padding:2px 7px;border-radius:3px;background:${b.pillBg};color:${b.pillColor};white-space:nowrap` }, b.locLabel),
      hover(el('a', { href: b.url, target: '_blank', rel: 'noopener', style: 'color:#1c1518' }, b.label), 'color:#7a1f2b'),
      el('span', { style: `margin-left:auto;${MONO};font-size:11px;color:#8b8079;white-space:nowrap` }, `${b.host} ↗`))));

  return foldSection({ id: 's7', collapsed: v.collapsed }, head, count, v.summary, list, a, {
    sectionStyle: 'scroll-margin-top:110px;margin:0 0 56px;view-transition-name:vtS7',
  });
}
