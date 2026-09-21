// The audit trail: what was rejected for demanding a Master's or a PhD.
// Folded away by default — it is evidence that the filter was applied,
// not something to read daily.

import { el } from './dom.js';

export function auditTrail(meta) {
  const audit = meta.removed_audit ?? {};
  const masters = audit.masters_required;
  const phd = audit.phd_required;
  if (!masters && !phd) return null;

  const body = el('div', { class: 'audit__body' });
  if (masters) {
    body.append(el('h4', { class: 'audit__h' }, "Master's required"));
    body.append(el('p', {}, masters));
  }
  if (phd) {
    body.append(el('h4', { class: 'audit__h' }, 'PhD required'));
    body.append(el('p', {}, phd));
  }

  return el('details', { class: 'audit' },
    el('summary', {},
      "Audit trail — postings removed for requiring a Master's or PhD"),
    body);
}

export function footer(meta, stats, onClearMarks) {
  return el('footer', { class: 'foot' },
    el('span', {},
      `Source: ${meta.source_file ?? '—'} · ${stats.postings} postings, `
      + `links unmodified · list updated ${meta.updated ?? '—'}`),
    el('button', { class: 'link-btn', onclick: onClearMarks },
      'Clear all marks (stage · removed · notes)'));
}
