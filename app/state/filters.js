// Filter state and the pure functions that apply it — the artifact's
// semantics, kept exactly: every typed word must appear somewhere in the
// joined fields; the stage filter reads the pipeline buckets; sorts are
// "Default", "Waiting longest" and "Company A-Z".

export const DEFAULTS = Object.freeze({
  loc: 'all', cat: 'all', q: '', star: false, showRem: false,
  stageF: 'all', sort: 'default',
});

export function matchWords(q, ...fields) {
  if (!q) return true;
  const s = fields.flat().filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every((w) => s.includes(w));
}

export function stageOk(stageF, e) {
  if (stageF === 'all') return true;
  if (stageF === 'none') return !e.hasStage;
  if (stageF === 'active') return e.hasStage && !e.terminal;
  if (stageF === 'stale') return Boolean(e.stale);
  if (stageF === 'offer') return e.stage === 'offer';
  if (stageF === 'closed') return e.stage === 'rejected' || e.stage === 'withdrawn';
  return true;
}

export function applySort(sort, list) {
  if (sort === 'waiting') {
    return list.slice().sort((a, b) =>
      (b.waitDays === undefined ? -1 : b.waitDays) - (a.waitDays === undefined ? -1 : a.waitDays));
  }
  if (sort === 'company') {
    return list.slice().sort((a, b) =>
      String(a.company || a.name || '').localeCompare(String(b.company || b.name || '')));
  }
  return list;
}

/** Location pill colours: [background, foreground]. */
export function pill(loc) {
  return {
    berlin: ['#f3dcdc', '#7a1f2b'], leipzig: ['#f4e3c1', '#7a4b12'],
    de: ['#dfe3e8', '#3b4551'], eu: ['#dde7e0', '#33543f'],
  }[loc] ?? ['#eee', '#333'];
}

/** Chip colours for an on/off filter button. */
export function btn(on) {
  return on ? { border: '#7a1f2b', bg: '#7a1f2b', color: '#fff' }
            : { border: '#d9d0c2', bg: '#fff', color: '#5a504b' };
}

export const LOC_OPTS = [['all', 'All'], ['berlin', 'Berlin'], ['leipzig', 'Leipzig'], ['de', 'Germany-wide'], ['eu', 'Europe']];
export const CAT_OPTS = [['all', 'All'], ['sim', 'Simulation'], ['sys', 'Systems Eng.'], ['data', 'Data'], ['prod', 'Production'], ['lead', 'Team Lead'], ['energy', 'Field/Dev/PM'], ['content', 'Content/AI'], ['firmen', 'Companies']];
export const SORT_OPTS = [['default', 'Default'], ['waiting', 'Waiting longest'], ['company', 'Company A-Z']];
