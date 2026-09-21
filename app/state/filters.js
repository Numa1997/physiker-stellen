// Pure filter state. No DOM, no network — it takes the current settings
// and a list, and returns what should be visible. Keeping it free of side
// effects is what makes the filter bar testable by reading it.

import { jobKey } from '../data/marks-repo.js';

export const DEFAULTS = Object.freeze({
  q: '',
  location: 'all',   // all | berlin | leipzig | de | eu
  category: 'all',   // all | sim | sys | data | prod | lead | energy | content
  stage: 'all',      // all | unmarked | applied | interview | offer | rejected
  sort: 'default',   // default | newest | company
  density: 'full',   // full | compact
  starredOnly: false,
  showRemoved: false,
});

export function createFilters(onChange) {
  let state = { ...DEFAULTS };

  const set = (patch) => {
    state = { ...state, ...patch };
    onChange(state);
  };

  return {
    get: () => state,
    set,
    reset: () => set({ ...DEFAULTS }),
    toggle: (key) => set({ [key]: !state[key] }),
    isDefault: () =>
      Object.keys(DEFAULTS).every((k) => state[k] === DEFAULTS[k]),
  };
}

/** Case- and accent-insensitive substring test across several fields. */
function matchesQuery(q, ...fields) {
  if (!q) return true;
  const needle = fold(q);
  return fields.some((f) => {
    if (!f) return false;
    const hay = Array.isArray(f) ? f.join(' ') : String(f);
    return fold(hay).includes(needle);
  });
}

// „Müller" should be found by typing "muller"; German postings make this
// worth doing rather than a plain toLowerCase.
const fold = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function matchesStage(filter, mark) {
  if (filter === 'all') return true;
  if (filter === 'unmarked') return !mark?.stage;
  return mark?.stage === filter;
}

/** Applies every active filter to the postings. */
export function filterPostings(postings, state, marks) {
  return postings.filter((p) => {
    const mark = marks.get(jobKey(p.n));
    const removed = Boolean(p.removed_on) || Boolean(mark?.removed);

    if (removed && !state.showRemoved) return false;
    if (state.starredOnly && !p.starred) return false;
    if (state.location !== 'all' && p.location_group !== state.location) return false;
    if (state.category !== 'all' && p.category !== state.category) return false;
    if (!matchesStage(state.stage, mark)) return false;

    return matchesQuery(
      state.q, p.title, p.title_original, p.company, p.city,
      p.skills, p.note, p.eligibility_en, p.eligibility_quote_de,
      p.target_category,
    );
  });
}

export function filterCompanies(companies, state, marks) {
  // The company section answers a different question from the job filters,
  // so only the text search, the star and the removed toggle apply to it.
  if (state.category !== 'all' && state.category !== 'firmen') return [];
  if (state.starredOnly) return [];

  return companies.filter((c) => {
    const mark = marks.get(`c${c.id.replace(/^c/, '')}`);
    if (mark?.removed && !state.showRemoved) return false;
    return matchesQuery(state.q, c.name, c.city, c.description, c.tags, c.product);
  });
}

export function filterBoards(boards, state) {
  if (state.starredOnly) return [];
  if (state.category !== 'all' && state.category !== 'boards') return [];
  return boards.filter((b) => {
    if (state.location !== 'all' && b.location_group !== state.location) return false;
    return matchesQuery(state.q, b.label, b.url);
  });
}

/** Sorts in place-safe fashion, returning a new array. */
export function sortPostings(postings, sort) {
  const out = [...postings];
  if (sort === 'newest') {
    return out.sort((a, b) =>
      String(b.added_on ?? '').localeCompare(String(a.added_on ?? '')) ||
      b.n - a.n);
  }
  if (sort === 'company') {
    return out.sort((a, b) =>
      a.company.localeCompare(b.company, 'de') || a.sort_order - b.sort_order);
  }
  return out.sort((a, b) => a.sort_order - b.sort_order);
}
