// The daily log: one row per run of the scheduled task, plus the exact
// set of postings that came in or went out on that run.
//
// A run writes its own row as it goes, so a run still in flight shows up
// here with status 'in_progress' and a note that updates while you watch.
// That is the live progress the artifact could never give: there, a
// checkpoint meant republishing the whole page.

import { supabase } from './supabase-client.js';
import { POLL_INTERVAL_MS } from '../config.js';

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
 * Re-reads the journal on an interval and calls `onUpdate` when anything
 * changed. Returns a function that stops the polling.
 *
 * Polling rather than Realtime: the thing being watched moves on the scale
 * of minutes, so a websocket buys nothing and costs a moving part.
 */
export function watchJournal(onUpdate, intervalMs = POLL_INTERVAL_MS) {
  let stopped = false;
  let previous = '';

  const tick = async () => {
    if (stopped) return;
    try {
      const journal = await loadJournal();
      const signature = JSON.stringify(
        journal.map((r) => [r.id, r.status, r.note, r.in.length, r.out.length]),
      );
      if (signature !== previous) {
        previous = signature;
        onUpdate(journal);
      }
    } catch {
      // A failed poll is not worth interrupting the page for; the next
      // tick will pick the change up.
    }
  };

  const handle = setInterval(tick, intervalMs);
  tick();
  return () => { stopped = true; clearInterval(handle); };
}
