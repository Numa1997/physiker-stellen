// Keeps an open page honest about what the database currently holds.
//
// Two things matter here. First, the whole dataset must refresh, not just
// the journal: an earlier version refreshed only the log, so a page left
// open through a morning run showed the run's progress while the cards
// beneath it went stale — struck-off postings stayed on screen and new
// ones never appeared.
//
// Second, it should not re-download everything to discover that nothing
// changed. The database is static for most of the day and then moves every
// few minutes during the run, so each tick asks a small question first —
// how many postings, when was the list last touched, what state is each
// run in — and only fetches the parts whose answer changed. A quiet tick
// costs well under a kilobyte instead of 212.
//
// Marks are excluded deliberately: they are the one thing the browser
// writes, and overwriting a mark set seconds ago with a slightly older
// server copy would be a visible bug of its own.

import { loadAll, probePostings } from './postings-repo.js';
import { loadJournal, probeJournal } from './journal-repo.js';
import { FAST_POLL_MS, IDLE_POLL_MS } from '../config.js';

/**
 * Calls `onUpdate` whenever the rendered data actually changes.
 * Returns a function that stops the polling.
 */
export function watchData(onUpdate, { fast = FAST_POLL_MS, idle = IDLE_POLL_MS } = {}) {
  let stopped = false, inFlight = false, handle = null;
  let period = null;
  let core = null;                 // postings, companies, boards, meta
  let coreSig = '', journalSig = '';

  const schedule = (ms) => {
    if (stopped || period === ms) return;
    period = ms;
    clearInterval(handle);
    handle = setInterval(tick, ms);
  };

  async function tick() {
    if (stopped || inFlight || document.hidden) return;
    inFlight = true;
    try {
      const [p, j] = await Promise.all([probePostings(), probeJournal()]);

      // A run in flight rewrites its note every few minutes; that is the
      // one time this page has anything to animate, so watch it closely
      // and otherwise check in slowly.
      schedule(j.some((r) => r.status === 'in_progress') ? fast : idle);

      const nextCoreSig = `${p.count}|${p.updated}`;
      const nextJournalSig = JSON.stringify(j);
      if (nextCoreSig === coreSig && nextJournalSig === journalSig) return;

      // Postings, companies and meta only move when the list itself moved.
      if (nextCoreSig !== coreSig || !core) core = await loadAll();
      const journal = await loadJournal();

      coreSig = nextCoreSig;
      journalSig = nextJournalSig;
      onUpdate({ ...core, journal });
    } catch {
      // A failed tick is not worth interrupting the page for; the next one
      // picks the change up, and a persistent failure shows as a stale
      // "list updated" date in the footer.
    } finally {
      inFlight = false;
    }
  }

  // Catch up immediately when the tab comes back to the foreground.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  schedule(idle);
  tick();

  return () => { stopped = true; clearInterval(handle); };
}
