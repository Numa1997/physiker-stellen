// The daily log: one row per run of the scheduled task, plus the exact
// set of postings that came in or went out on that run.
//
// A run writes its own row as it goes, so a run still in flight shows up
// here with status 'in_progress' and a note that updates while you watch.
// That is the live progress the artifact could never give: there, a
// checkpoint meant republishing the whole page.

import { supabase } from './supabase-client.js';

/** One entry per run, newest first, each with its in/out changes attached. */
export async function loadJournal() {
  const { data, error } = await supabase
    .from('journal')
    .select(`
      id, run_date, started_at, finished_at, status,
      checked, live, transient, per_category, evaluated, widened, note,
      journal_changes ( direction, posting_n, title, company, why )
    `)
    .order('run_date', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw error;

  return data.map((run) => ({
    ...run,
    in: run.journal_changes.filter((c) => c.direction === 'in'),
    out: run.journal_changes.filter((c) => c.direction === 'out'),
  }));
}

/** The pre-grouped per-day rollup, so the page does no arithmetic. */
export async function loadJournalByDay() {
  const { data, error } = await supabase
    .from('journal_by_day')
    .select('*')
    .order('run_date', { ascending: false });
  if (error) throw error;
  return data;
}

/** True while a run is still working, which drives the "live" indicator. */
export function isRunning(journal) {
  return journal.some((r) => r.status === 'in_progress');
}

/**
 * Just enough of the journal to tell whether anything changed: one short
 * row per run. The notes — which are the bulk of this table — are left
 * behind and only fetched when this says they are worth fetching.
 */
export async function probeJournal() {
  const { data, error } = await supabase
    .from('journal')
    .select('id, status, finished_at')
    .order('id', { ascending: false });
  if (error) throw error;
  return data;
}
