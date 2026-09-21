// Start-up order, and nothing else:
//   password gate → load data → render → start the live log poll.
//
// Every step below is deliberately sequential. Nothing is fetched before
// there is a session, because without one the API would hand back empty
// arrays and the page would render a convincing, wrong "no postings".

import { requireSession } from './auth/password-gate.js';
import { loadAll } from './data/postings-repo.js';
import { loadMarks } from './data/marks-repo.js';
import { loadJournal, watchJournal } from './data/journal-repo.js';
import { onAuthChange } from './data/supabase-client.js';
import { renderPage } from './view/page.js';

const mount = document.getElementById('app');

async function main() {
  await requireSession(mount);

  mount.innerHTML = '<p class="boot">Loading postings…</p>';

  let data;
  try {
    const [core, marks, journal] = await Promise.all([
      loadAll(), loadMarks(), loadJournal(),
    ]);
    data = { ...core, marks, journal };
  } catch (err) {
    mount.innerHTML = '';
    mount.append(fatal(err));
    return;
  }

  const page = renderPage(mount, data);

  // The daily task writes its progress straight into the journal, so the
  // page can simply re-read it and show a run happening in real time.
  const stop = watchJournal((journal) => page.updateJournal(journal));
  addEventListener('pagehide', stop, { once: true });

  // A session can expire or be signed out in another tab; when it goes,
  // drop everything on screen rather than leaving stale private data up.
  onAuthChange((session) => { if (!session) location.reload(); });
}

function fatal(err) {
  const el = document.createElement('div');
  el.className = 'fatal';
  const paused = /fetch|network|failed/i.test(String(err?.message ?? ''));
  el.innerHTML = `
    <h1>Could not load the list</h1>
    <p>${paused
      ? 'The database did not answer. A free Supabase project pauses after '
        + 'seven days without activity — open the Supabase dashboard and '
        + 'press Restore, then reload this page.'
      : 'Something went wrong talking to the database.'}</p>
    <pre>${String(err?.message ?? err)}</pre>`;
  return el;
}

main();
