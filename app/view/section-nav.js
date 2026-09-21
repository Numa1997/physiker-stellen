// The "01 · Priority … 09 · Job Boards" pill row.

import { el } from './dom.js';

export function sectionNav(sections) {
  return el('nav', { class: 'nav' },
    ...sections.map((s, i) => el('a', {
      href: `#${s.id}`,
      onclick: () => queueMicrotask(() => s.onJump?.()),
    }, `${String(i + 1).padStart(2, '0')} · ${s.short}`)));
}

/** Short labels for the pill row, derived from the stored section titles. */
export function shortLabel(title) {
  return String(title)
    .replace(/\s*[—–-]\s*.*$/, '')  // drop everything after a dash
    .replace(/\s*\(.*\)$/, '')       // and any trailing parenthetical
    .trim();
}
