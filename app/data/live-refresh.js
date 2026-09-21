// Keeps an open page honest about what the database currently holds.
//
// The first version polled only the journal, so a page left open through
// a morning run showed the run's progress while the cards beneath it went
// quietly stale — struck-off postings stayed on screen and new ones never
// appeared. The daily log said "updated", the list was not. That is the
// worst possible failure for a page whose entire job is to be current.
//
// So the refresh covers every table the page renders. Marks are excluded
// deliberately: they are the one thing the browser writes, and clobbering
// a mark set seconds ago with a slightly older server copy would be a
// visible bug of its own.

import { loadAll } from './postings-repo.js';
import { loadJournal } from './journal-repo.js';
import { POLL_INTERVAL_MS } from '../config.js';

/**
 * Re-reads postings, companies, boards, meta and the journal on an
 * interval, calling `onUpdate` only when something actually changed.
 * Returns a function that stops the polling.
 */
export function watchData(onUpdate, intervalMs = POLL_INTERVAL_MS) {
  let stopped = false;
  let previous = '';
  let inFlight = false;

  const tick = async () => {
    // A slow round trip must not stack up behind the interval.
    if (stopped || inFlight || document.hidden) return;
    inFlight = true;
    try {
      const [core, journal] = await Promise.all([loadAll(), loadJournal()]);
      const next = { ...core, journal };

      // Compare on the fields the page actually renders, so an unrelated
      // column change does not force a re-render that would close an open
      // note or menu.
      const signature = JSON.stringify({
        p: next.postings.map((x) => [x.n, x.removed_on, x.sort_order, x.title]),
        m: next.meta?.updated,
        c: next.companies.length,
        b: next.boards.length,
        j: next.journal.map((r) => [r.id, r.status, r.note, r.in.length, r.out.length]),
      });

      if (signature !== previous) {
        previous = signature;
        onUpdate(next);
      }
    } catch {
      // A failed poll is not worth interrupting the page for; the next
      // tick picks the change up. A failure that persists shows up as a
      // stale `meta.updated` in the footer.
    } finally {
      inFlight = false;
    }
  };

  const handle = setInterval(tick, intervalMs);
  // Catch up immediately when the tab comes back to the foreground.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
  tick();

  return () => { stopped = true; clearInterval(handle); };
}
