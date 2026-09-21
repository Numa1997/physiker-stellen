// Assembles the blocks in order and owns the small amount of view state
// the page needs: which sections are folded, which note or menu is open,
// and whether the last write reached the database.

import { createFilters, filterPostings, filterCompanies, filterBoards, sortPostings }
  from '../state/filters.js';
import { saveMark, clearMark, clearAllMarks, jobKey } from '../data/marks-repo.js';
import { isRunning } from '../data/journal-repo.js';
import { signOut } from '../auth/password-gate.js';
import { el, fill } from './dom.js';
import { filterBar } from './filter-bar.js';
import { masthead } from './masthead.js';
import { sectionNav } from './section-nav.js';
import { companySection } from './company-section.js';
import { jobSection } from './job-section.js';
import { jobBoards } from './job-boards.js';
import { dailyLog } from './daily-log.js';
import { auditTrail, footer } from './audit-trail.js';

// The page's reading order, which is not the order the sections are stored
// in: the energy block comes before the content block, and the boards go
// last. Section 01 (companies) and 09 (boards) are rendered by their own
// modules, so they are not in this list.
const JOB_SECTIONS = [
  { id: 's2', category: 'sim',     kick: 'Simulation' },
  { id: 's3', category: 'sys',     kick: 'Systems' },
  { id: 's4', category: 'data',    kick: 'Data' },
  { id: 's5', category: 'prod',    kick: 'Production' },
  { id: 's6', category: 'lead',    kick: 'Team Lead' },
  { id: 's8', category: 'energy',  kick: 'Field / Dev / PM' },
  { id: 's9', category: 'content', kick: 'Content & AI' },
];

const FALLBACK_TITLES = {
  s9: 'Physics Content, Education & AI Training',
};

export function renderPage(mount, data) {
  const { postings, companies, boards, meta, marks } = data;
  let journal = data.journal;

  // ---- view state -------------------------------------------------------
  const folded = new Set();
  let openNote = null;
  let openMenu = null;
  let syncError = false;

  const filters = createFilters(() => render());

  const ctx = {
    setFilter: (patch) => filters.set(patch),
    resetFilters: () => filters.reset(),
    isOpen: (id) => !folded.has(id),
    toggleSection: (id) => { folded.has(id) ? folded.delete(id) : folded.add(id); render(); },
    collapseAll: () => { allIds().forEach((id) => folded.add(id)); render(); },
    expandAll: () => { folded.clear(); render(); },
    isNoteOpen: (key) => openNote === key,
    toggleNote: (key) => { openNote = openNote === key ? null : key; render(); },
    isMenuOpen: (key) => openMenu === key,
    toggleMenu: (key) => { openMenu = openMenu === key ? null : key; render(); },
    writeMark: (key, patch) => writeMark(key, patch),
    dropMark: (key) => dropMark(key),
  };

  const allIds = () =>
    ['s1', ...JOB_SECTIONS.map((s) => s.id), 's7'];

  // ---- writes -----------------------------------------------------------
  // Apply locally, render immediately, persist after. If the write fails,
  // put the old value back and raise the sync flag rather than leaving the
  // screen claiming something the database does not hold.
  async function writeMark(key, patch) {
    const before = marks.get(key) ?? null;
    marks.set(key, { ...(before ?? { item_id: key }), ...patch });
    openMenu = null;
    syncError = false;
    render();
    try {
      marks.set(key, await saveMark(key, patch));
    } catch {
      before ? marks.set(key, before) : marks.delete(key);
      syncError = true;
    }
    render();
  }

  async function dropMark(key) {
    const before = marks.get(key) ?? null;
    marks.delete(key);
    openMenu = null;
    render();
    try {
      await clearMark(key);
    } catch {
      if (before) marks.set(key, before);
      syncError = true;
      render();
    }
  }

  async function wipeMarks() {
    const ok = confirm(
      'Clear every stage, note and removal you have marked?\n\n'
      + 'This cannot be undone. Postings removed by the daily task are '
      + 'not affected.');
    if (!ok) return;
    try {
      await clearAllMarks();
      marks.clear();
    } catch {
      syncError = true;
    }
    render();
  }

  // Close an open overflow menu when the click lands anywhere else.
  document.addEventListener('click', () => {
    if (openMenu) { openMenu = null; render(); }
  });

  // ---- render -----------------------------------------------------------
  function render() {
    const state = filters.get();
    const visibleJobs = sortPostings(
      filterPostings(postings, state, marks), state.sort);
    const visibleCompanies = filterCompanies(companies, state, marks);
    const visibleBoards = filterBoards(boards, state);

    const root = el('div', { 'data-density': state.density });

    root.append(filterBar(state, meta, {
      shown: visibleJobs.length,
      removed: countRemoved(postings, marks),
      sync: { running: isRunning(journal), error: syncError },
    }, { ...ctx, collapseAll: ctx.collapseAll, expandAll: ctx.expandAll }));

    const shell = el('div', { class: 'shell' });

    shell.append(masthead(meta, {
      postings: postings.filter((p) => !p.removed_on).length,
      companies: companies.length,
      starred: postings.filter((p) => p.starred && !p.removed_on).length,
      boards: boards.length,
    }));

    shell.append(sectionNav(navItems(state)));

    if (visibleCompanies.length) {
      shell.append(companySection(visibleCompanies, ctx));
    }

    for (const spec of JOB_SECTIONS) {
      const inSection = visibleJobs.filter((j) => j.category === spec.category);
      const total = postings.filter(
        (j) => j.category === spec.category && !j.removed_on).length;
      if (!total) continue;
      shell.append(jobSection(
        { ...spec, ...titleFor(spec), num: numFor(spec.id) },
        inSection, total, marks, ctx));
    }

    if (visibleBoards.length) {
      shell.append(jobBoards(visibleBoards, boards.length, ctx));
    }

    shell.append(dailyLog(enrichJournal(journal, postings), meta));
    const audit = auditTrail(meta);
    if (audit) shell.append(audit);
    shell.append(footer(meta, { postings: postings.length }, wipeMarks));
    shell.append(el('p', {
      style: 'margin-top:18px;font-family:var(--mono);font-size:11px',
    }, el('button', { class: 'link-btn', onclick: signOut }, 'Sign out')));

    root.append(shell);
    fill(mount, root);
  }

  function navItems(state) {
    const items = [];
    if (filterCompanies(companies, state, marks).length) {
      items.push({ id: 's1', short: 'Priority' });
    }
    for (const spec of JOB_SECTIONS) {
      const total = postings.filter(
        (j) => j.category === spec.category && !j.removed_on).length;
      if (total) items.push({ id: spec.id, short: spec.kick });
    }
    items.push({ id: 's7', short: 'Job Boards' });
    return items;
  }

  function titleFor(spec) {
    const stored = (meta.sections ?? []).find((s) => s.id === spec.id);
    return {
      title: stored?.title ?? FALLBACK_TITLES[spec.id] ?? spec.kick,
      subgroups: stored?.subgroups ?? null,
    };
  }

  const numFor = (id) => {
    const order = ['s1', ...JOB_SECTIONS.map((s) => s.id), 's7'];
    return String(order.indexOf(id) + 1).padStart(2, '0');
  };

  render();

  return {
    updateJournal(next) { journal = next; render(); },
  };
}

function countRemoved(postings, marks) {
  return postings.filter(
    (p) => p.removed_on || marks.get(jobKey(p.n))?.removed).length;
}

/**
 * The journal stores only title/company/why per change, plus a link to
 * postings.n. Joining that link back here gives the log block the
 * category it groups by and the url it links to — an exact join, where
 * the artifact had to match on title text.
 */
function enrichJournal(journal, postings) {
  const byN = new Map(postings.map((p) => [p.n, p]));
  const decorate = (c) => {
    const p = c.posting_n != null ? byN.get(c.posting_n) : null;
    return { ...c, category: p?.category ?? null, url: p?.url ?? null };
  };
  return journal.map((run) => ({
    ...run,
    in: run.in.map(decorate),
    out: run.out.map(decorate),
  }));
}
