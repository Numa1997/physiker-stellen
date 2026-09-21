// Assembles the page. This is the artifact's `renderVals()` — the same
// derived values under the same names — feeding the same markup, with the
// data coming from Supabase instead of a JSON file and the marks written
// to the `marks` table instead of the artifact's store.

import { matchWords, stageOk, applySort, pill, DEFAULTS } from '../state/filters.js';
import { entryView } from '../state/pipeline.js';
import { loadPrefs, savePrefs, SECTION_IDS, withViewTransition } from '../state/prefs.js';
import { saveMark, clearAllMarks, loadMarks, jobKey, companyKey } from '../data/marks-repo.js';
import { isRunning } from '../data/journal-repo.js';
import { signOut } from '../auth/password-gate.js';
import { el, fill, hostOf, longDate } from './dom.js';
import { filterBar } from './filter-bar.js';
import { masthead, sectionNav } from './masthead.js';
import { foldSummary } from './fold.js';
import { companySection } from './company-section.js';
import { jobSection } from './job-section.js';
import { jobBoards } from './job-boards.js';
import { dailyLog, auditTrail, footer } from './daily-log.js';

// [id, category, title, kicker, hasSubgroups, numberOverride] — verbatim.
const DEFS = [
  ['s2', 'sim', 'Simulation / CFD / FEM / Computational', 'Computational', true],
  ['s3', 'sys', 'Systems Engineer / Physicist', 'Systems', true],
  ['s4', 'data', 'Data Analysis / Data Science', 'Berlin & Europe', false],
  ['s5', 'prod', 'Production / Manufacturing', 'Berlin, Brandenburg & Europe', false],
  ['s6', 'lead', 'Team Lead', 'Berlin & Europe', false],
  ['s8', 'energy', 'Field, Development & Project Roles', 'Energy · AI · Niche tech', false, '07'],
  ['s9', 'content', 'Content, Education & AI Training', 'Editorial · Learning content · Evals', true, '08'],
];
const NAV = [['s1', '01', 'Companies'], ['s2', '02', 'Simulation'], ['s3', '03', 'Systems'], ['s4', '04', 'Data'], ['s5', '05', 'Production'], ['s6', '06', 'Team Lead'], ['s8', '07', 'Field/Dev/PM'], ['s9', '08', 'Content/AI'], ['s7', '09', 'Job Boards']];

export function renderPage(mount, data) {
  const { marks } = data;
  let { postings, companies, boards, meta, journal } = data;

  // ---- state ------------------------------------------------------------
  const prefs = loadPrefs();
  let f = { ...DEFAULTS };
  let filtersOpen = false;
  let noteOpen = {}, menuOpen = {};
  let sync = { state: 'synced', at: Date.now() };

  const persistPrefs = () => savePrefs({ collapsed: prefs.collapsed, density: prefs.density });

  // ---- actions ----------------------------------------------------------
  const a = {
    set: (patch) => { f = { ...f, ...patch }; render(); },
    setQ: (q) => { f.q = q; render(); },
    toggleStar: () => a.set({ star: !f.star }),
    toggleShowRemoved: () => a.set({ showRem: !f.showRem }),
    resetFilters: () => a.set({ ...DEFAULTS }),
    toggleFilters: () => { filtersOpen = !filtersOpen; render(); },
    toggleDensity: () => { prefs.density = prefs.density === 'compact' ? 'full' : 'compact'; persistPrefs(); render(); },
    toggle: (id) => withViewTransition(() => {
      if (prefs.collapsed[id]) delete prefs.collapsed[id]; else prefs.collapsed[id] = true;
      persistPrefs(); render();
    }),
    expand: (id) => { if (!prefs.collapsed[id]) return; withViewTransition(() => { delete prefs.collapsed[id]; persistPrefs(); render(); }); },
    collapseAll: () => withViewTransition(() => { prefs.collapsed = Object.fromEntries(SECTION_IDS.map((id) => [id, true])); persistPrefs(); render(); }),
    expandAll: () => withViewTransition(() => { prefs.collapsed = {}; persistPrefs(); render(); }),
    isNoteOpen: (k) => Boolean(noteOpen[k]),
    toggleNote: (k) => { noteOpen[k] = !noteOpen[k]; render(); },
    isMenuOpen: (k) => Boolean(menuOpen[k]),
    toggleMenu: (k) => { menuOpen = { [k]: !menuOpen[k] }; render(); },
    writeMark, clearMarks, signOut,
    syncClick: async () => { sync = { state: 'syncing' }; render(); try { const m = await loadMarks(); marks.clear(); m.forEach((v, k) => marks.set(k, v)); sync = { state: 'synced', at: Date.now() }; } catch { sync = { state: 'offline' }; } render(); },
  };

  // Local first, always, then persist. On failure restore and say so.
  async function writeMark(key, patch) {
    const before = marks.get(key) ?? null;
    marks.set(key, { ...(before ?? { item_id: key }), ...patch });
    menuOpen = {};
    sync = { state: 'syncing' };
    render();
    try {
      const stored = await saveMark(key, patch);
      marks.set(key, stored);
      sync = { state: 'synced', at: Date.now() };
    } catch {
      before ? marks.set(key, before) : marks.delete(key);
      sync = { state: 'offline' };
    }
    render();
  }

  async function clearMarks() {
    if (!confirm('Clear all stage marks, removals and notes?')) return;
    try { await clearAllMarks(); marks.clear(); sync = { state: 'synced', at: Date.now() }; }
    catch { sync = { state: 'offline' }; }
    render();
  }

  document.addEventListener('click', () => { if (Object.keys(menuOpen).length) { menuOpen = {}; render(); } });

  // ---- derived values (the artifact's renderVals) ----------------------
  function entry(key, base) {
    const mark = marks.get(key) ?? null;
    return { ...base, key, mark, ...entryView(mark) };
  }

  function compute() {
    const { loc, cat, q, star, showRem, stageF, sort } = f;
    const ql = q.trim().toLowerCase();
    const locLabels = meta.locations ?? {}, catLabels = meta.categories ?? {};

    // funnel + stage buckets
    const stageCounts = { applied: 0, confirmed: 0, interview: 0, offer: 0 };
    let cActive = 0, cStale = 0, cOffer = 0, cClosed = 0;
    for (const m of marks.values()) {
      const st = m.stage; if (!st) continue;
      if (stageCounts[st] !== undefined) stageCounts[st]++;
      if (st === 'offer') { cOffer++; continue; }
      if (st === 'rejected' || st === 'withdrawn') { cClosed++; continue; }
      cActive++;
      const at = m.stage_at ? new Date(m.stage_at).getTime() : 0;
      if (at && (Date.now() - at) / 86_400_000 >= 14) cStale++;
    }
    const funnelLabel = ['applied', 'confirmed', 'interview', 'offer'].filter((k) => stageCounts[k]).map((k) => `${stageCounts[k]} ${k}`).join(' · ') || 'Nothing marked yet';
    const cnt = (n) => (n ? ` (${n})` : '');
    const stageOpts = [['all', 'All'], ['none', 'Untouched'], ['active', `In progress${cnt(cActive)}`], ['stale', `Stale >14d${cnt(cStale)}`], ['offer', `Offer${cnt(cOffer)}`], ['closed', `Closed${cnt(cClosed)}`]];

    const view = (list) => applySort(sort, list.filter((e) => stageOk(stageF, e)));
    const vis = (e) => showRem || !e.removed;
    let shown = 0;

    // ---- section 01 -------------------------------------------------------
    const compMatch = (c) => !star && matchWords(ql, c.name, c.city, c.tags, c.description);
    const company = (tier, c) => entry(companyKey(c.id.replace(/^\D+/, '')), { ...c, n: c.id.replace(/^\D+/, ''), tier });
    const tierA = view(companies.filter((c) => c.tier === 'A' && compMatch(c)).map((c) => company('A', c)).filter(vis));
    const tierB = view(companies.filter((c) => c.tier === 'B' && compMatch(c)).map((c) => company('B', c)).filter(vis));
    const tierC = (stageF === 'all' || stageF === 'none')
      ? companies.filter((c) => c.tier === 'C' && !star && matchWords(ql, c.name, c.city, c.product)).map((r) => ({ ...r, location: r.city, hasUrl: Boolean(r.url), host: r.url ? hostOf(r.url) : '' }))
      : [];
    const catOk = cat === 'all' || cat === 'firmen';
    const tierABVisible = catOk && (loc === 'all' || loc === 'berlin') && tierA.length + tierB.length > 0;
    const tierCVisible = catOk && (loc === 'all' || loc === 'de') && tierC.length > 0;
    const s1Visible = tierABVisible || tierCVisible;
    const s1Count = (tierABVisible ? tierA.length + tierB.length : 0) + (tierCVisible ? tierC.length : 0);
    if (s1Visible) shown += s1Count;
    const s1Parts = [];
    if (tierABVisible) { if (tierA.length) s1Parts.push(`Tier A ${tierA.length}`); if (tierB.length) s1Parts.push(`Tier B ${tierB.length}`); }
    if (tierCVisible && tierC.length) s1Parts.push(`Tier C ${tierC.length}`);
    const s1Applied = tierA.concat(tierB).filter((c) => c.applied).length;
    if (s1Applied) s1Parts.push(`${s1Applied} applied`);
    const s1 = { visible: s1Visible, tierA, tierB, tierC, tierABVisible, tierCVisible, s1Count, collapsed: Boolean(prefs.collapsed.s1),
      summary: [`${s1Count}${s1Count === 1 ? ' company' : ' companies'}`, s1Parts.length ? `· ${s1Parts.join(' · ')}` : ''] };

    // ---- job sections -------------------------------------------------------
    const jobView = (j) => {
      const [pillBg, pillColor] = pill(j.location_group);
      const e = entry(jobKey(j.n), { raw: j, n: j.n, title: j.title, titleOriginal: j.title_original, showOriginal: Boolean(j.title_original) && j.title_original !== j.title,
        company: j.company, city: j.city, locLabel: locLabels[j.location_group] ?? j.location_label, catLabel: j.category_label ?? catLabels[j.category],
        pillBg, pillColor, starred: Boolean(j.starred), hasElig: Boolean(j.eligibility_quote_de), eligDe: j.eligibility_quote_de, hasEligEn: Boolean(j.eligibility_en), eligEn: j.eligibility_en,
        skills: j.skills ?? [], hasSkills: Boolean(j.skills?.length), hasSalary: Boolean(j.salary), salary: j.salary, hasNote: Boolean(j.note), note: j.note,
        isDup: Boolean(j.duplicate_of), dupOf: j.duplicate_of, url: j.url, hasEmp: Boolean(j.employment), emp: j.employment ?? '',
        removedByTask: Boolean(j.removed_on), removedOn: j.removed_on, removedWhy: j.removed_why });
      // A posting the daily task struck off is removed too, and not yours to restore.
      if (e.removedByTask) { e.removed = true; e.removedAttr = '1'; e.active = false; e.opacity = .5; e.strike = 'line-through'; }
      e.bg = e.removed ? '#f5f1ea' : j.starred ? '#fffaf3' : '#fff';
      e.borderLeft = j.starred ? '3px solid #7a1f2b' : e.stage === 'offer' ? '2px solid #7a1f2b' : '1px solid #cdc1ae';
      e.borderStyle = e.removed ? 'dashed' : 'solid';
      e.titleColor = (e.removed || e.stage === 'rejected' || e.stage === 'withdrawn') ? '#8b8079' : '#1c1518';
      if (j.duplicate_of && !e.hasStage && !e.removed) e.opacity = .78;
      return e;
    };
    const live = postings.filter((j) => !j.removed_on);
    const sections = DEFS.map(([id, key, title, kick, hasSub, numOverride], i) => {
      const all = postings.filter((j) => j.category === key);
      const filt = view(all.filter((j) => (loc === 'all' || j.location_group === loc) && (!star || j.starred) && matchWords(ql, j.title, j.title_original, j.company, j.skills)).map(jobView).filter(vis));
      const groups = hasSub ? [['berlin', 'Berlin'], ['leipzig', 'Leipzig'], ['de', 'Rest of Germany'], ['eu', 'Europe (outside Germany)']] : [[null, null]];
      const subgroups = groups.map(([g, label]) => {
        const total = g ? all.filter((j) => j.location_group === g && !j.removed_on).length : all.filter((j) => !j.removed_on).length;
        const jobs = g ? filt.filter((j) => j.raw.location_group === g) : filt;
        return { label, hasLabel: Boolean(label), swatch: g ? pill(g)[1] : 'transparent', total, shown: jobs.length, jobs, empty: jobs.length === 0, visible: !g || loc === 'all' || loc === g };
      });
      const visible = (cat === 'all' || cat === key) && !(loc !== 'all' && all.every((j) => j.location_group !== loc));
      if (visible) shown += filt.length;
      return { id, num: numOverride ?? `0${i + 2}`, kick, title, vtName: `vt${id.toUpperCase()}`, total: all.filter((j) => !j.removed_on).length, shown: filt.length, subgroups, visible,
        collapsed: Boolean(prefs.collapsed[id]), summary: foldSummary(filt, 'posting', hasSub ? subgroups : null) };
    });

    // ---- boards --------------------------------------------------------------
    const bs = boards.filter((b) => (loc === 'all' || b.location_group === loc) && !star && matchWords(ql, b.label)).map((b) => { const [pillBg, pillColor] = pill(b.location_group); return { ...b, pillBg, pillColor, locLabel: locLabels[b.location_group] ?? b.location_group, host: hostOf(b.url) }; });
    const boardsVisible = cat === 'all' && stageF === 'all' && bs.length > 0;
    if (boardsVisible) shown += bs.length;
    const s7Parts = [];
    ['berlin', 'leipzig', 'de'].forEach((g) => { const n = bs.filter((b) => b.location_group === g).length; if (n) s7Parts.push(`${locLabels[g] ?? g} ${n}`); });
    const s7 = { visible: boardsVisible, boards: bs, nBoards: boards.length, collapsed: Boolean(prefs.collapsed.s7), summary: [`${bs.length}${bs.length === 1 ? ' job board' : ' job boards'}`, s7Parts.length ? `· ${s7Parts.join(' · ')}` : ''] };

    // ---- counters ---------------------------------------------------------
    const nRemoved = postings.filter((p) => p.removed_on || marks.get(jobKey(p.n))?.removed).length
      + companies.filter((c) => marks.get(companyKey(c.id.replace(/^\D+/, '')))?.removed).length;
    const syncLabel = sync.state === 'syncing' ? 'Syncing…' : sync.state === 'offline' ? 'Not synced'
      : sync.state === 'synced' && sync.at ? `Synced ${new Date(sync.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';

    return {
      ...f, filtersOpen, density: prefs.density, funnelLabel, stageOpts, nRemoved, nShown: shown,
      syncState: isRunning(journal) ? 'syncing' : sync.state, syncLabel: isRunning(journal) ? 'Run in progress' : syncLabel,
      nJobs: live.length, nCompanies: companies.length, nStarred: live.filter((j) => j.starred).length, nBoards: boards.length,
      nUrls: new Set(postings.map((p) => p.url)).size,
      filterRule: String(meta.filter_rule ?? '').split('||')[0].trim(), sourceFile: meta.source_file ?? '—', updatedLabel: meta.updated ?? '—',
      removedMasters: meta.removed_audit?.masters_required ?? '', removedPhd: meta.removed_audit?.phd_required ?? '',
      s1, sections, s7,
      navItems: NAV.map(([id, num, short]) => ({ id, num, short, onClick: () => queueMicrotask(() => a.expand(id)) })),
      ...journalVals(),
    };
  }

  function journalVals() {
    const byN = new Map(postings.map((p) => [p.n, p]));
    const labels = meta.categories ?? {};
    const runs = journal.map((r, i) => {
      const dec = (c) => { const p = c.posting_n != null ? byN.get(c.posting_n) : null; return { title: c.title ?? '', company: c.company ?? '', why: c.why ?? '', hasUrl: Boolean(p?.url), url: p?.url, hasLoc: Boolean(p?.location_label), loc: p?.location_label, hasEmp: Boolean(p?.employment), emp: p?.employment, category: p?.category }; };
      const inList = r.in.map(dec), outList = r.out.map(dec);
      const buckets = new Map();
      for (const x of inList) { const lab = labels[x.category] ?? 'Added'; if (!buckets.has(lab)) buckets.set(lab, []); buckets.get(lab).push(x); }
      const running = r.status === 'in_progress', unfinished = r.status === 'did_not_finish';
      const pc = r.per_category ? Object.entries(r.per_category).map(([k, v]) => `${k} ${v}`).join(' · ') : '';
      const ev = r.evaluated ? Object.entries(r.evaluated).map(([k, v]) => `${k} ${v}`).join(' · ') : '';
      const n = (v) => (v == null ? '—' : v);
      return { dateLabel: longDate(r.run_date), isLatest: i === 0 || running, nIn: inList.length, nOut: outList.length,
        hasStatus: running || unfinished, status: running ? 'In progress' : 'Did not finish', statusBg: running ? '#7a4b12' : '#7a1f2b', unfinished,
        stats: `checked ${n(r.checked)} · live ${n(r.live)} · transient ${n(r.transient)}`,
        groups: [...buckets].map(([label, items]) => ({ label, n: items.length, items })), hasOut: outList.length > 0, outList,
        noChanges: r.status === 'done' && !inList.length && !outList.length,
        widenedList: r.widened ?? [], hasCats: Boolean(pc), catText: pc, hasEval: Boolean(ev), evalText: ev, notes: r.note ? [r.note] : [] };
    });
    return { journal: runs, nJournal: new Set(journal.map((r) => r.run_date)).size, nRuns: journal.length, noJournal: runs.length === 0 };
  }

  // ---- render -----------------------------------------------------------
  function render() {
    const v = compute();
    const root = el('div', { style: 'min-height:100vh', 'data-print-visible': '1', 'data-density': v.density });
    root.append(filterBar(v, a));

    const shell = el('div', { style: 'max-width:1440px;margin:0 auto;padding:0 28px 96px' });
    shell.append(masthead(v), sectionNav(v.navItems));

    const sections = el('div', { 'data-sections': '1' });
    if (v.s1.visible) sections.append(companySection(v.s1, a));
    for (const sec of v.sections) if (sec.visible) sections.append(jobSection(sec, a));
    if (v.s7.visible) sections.append(jobBoards(v.s7, a));
    shell.append(sections);

    shell.append(dailyLog(v), auditTrail(v), footer(v, a));
    root.append(shell);
    fill(mount, root);
  }

  render();

  return {
    updateData(next) {
      if (next.postings) postings = next.postings;
      if (next.companies) companies = next.companies;
      if (next.boards) boards = next.boards;
      if (next.meta) meta = next.meta;
      if (next.journal) journal = next.journal;
      render();
    },
  };
}
