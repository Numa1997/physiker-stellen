// The daily log: one block per run, newest first, with the postings that
// came in grouped by category and the run's own details folded away.
//
// A run still in flight renders with a pulsing badge and whatever note it
// has written so far, which is the live progress the artifact could not
// give.

import { el, longDate } from './dom.js';

export function dailyLog(journal, meta) {
  const wrap = el('section', { class: 'log' });

  wrap.append(el('div', { class: 'log__head' },
    el('h3', {}, 'Daily log'),
    el('span', { class: 'log__meta' },
      `${countDays(journal)} days · ${journal.length} runs · `
      + `list updated ${meta.updated ?? '—'}`)));

  if (!journal.length) {
    wrap.append(el('p', { class: 'log__empty' },
      'No daily runs logged yet. Each 06:30 check adds one entry: postings '
      + 'added, postings removed, and the reason for each.'));
    return wrap;
  }

  journal.forEach((run, i) => wrap.append(runBlock(run, i === 0, meta)));
  return wrap;
}

const countDays = (journal) => new Set(journal.map((r) => r.run_date)).size;

function runBlock(run, isLatest, meta) {
  const running = run.status === 'in_progress';
  const unfinished = run.status === 'did_not_finish';

  const details = el('details', { class: 'day' });
  if (isLatest || running) details.setAttribute('open', '');

  const summary = el('summary', {},
    el('span', { class: 'day__date' }, longDate(run.run_date)),
    el('span', { class: 'jpill jpill--in' }, `+${run.in.length} added`),
    el('span', { class: 'jpill jpill--out' }, `−${run.out.length} removed`));

  if (running) {
    summary.append(el('span', { class: 'jpill jpill--status jpill--running' },
      'In progress'));
  } else if (unfinished) {
    summary.append(el('span', { class: 'jpill jpill--status jpill--unfinished' },
      'Did not finish'));
  }

  summary.append(el('span', { class: 'day__stats' },
    `${run.checked ?? 0} checked · ${run.live ?? 0} live`
    + (run.transient ? ` · ${run.transient} transient` : '')));
  details.append(summary);

  const body = el('div', { class: 'day__body' });

  for (const [label, items] of groupByCategory(run.in, meta)) {
    body.append(group(label, items, 'in'));
  }
  if (run.out.length) body.append(group('Removed', run.out, 'out'));

  if (!run.in.length && !run.out.length && !running) {
    body.append(el('p', { class: 'day__note' },
      'No postings added or removed. Every listed posting was re-checked '
      + 'and is still live.'));
  }

  body.append(runDetails(run));
  details.append(body);
  return details;
}

/**
 * Groups the additions by the posting's category. Because journal_changes
 * links to postings.n, this is an exact grouping rather than the title
 * matching the artifact had to fall back on.
 */
function groupByCategory(items, meta) {
  const labels = meta.categories ?? {};
  const buckets = new Map();
  for (const item of items) {
    const key = item.category ?? 'added';
    const label = labels[key] ?? (key === 'added' ? 'Added' : key);
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label).push(item);
  }
  return [...buckets];
}

function group(label, items, dir) {
  return el('div', { class: 'day__group' },
    el('div', {
      class: `day__grouplabel${dir === 'out' ? ' day__grouplabel--out' : ''}`,
    }, `${label} · ${items.length}`),
    ...items.map((x) => el('div', { class: `entry entry--${dir}` },
      el('span', { class: 'entry__sign' }, dir === 'in' ? '+' : '−'),
      el('div', {},
        x.url
          ? el('a', { href: x.url, target: '_blank', rel: 'noopener' }, x.title)
          : x.title,
        el('span', { class: 'entry__co' }, ` · ${x.company ?? ''}`),
        x.why && el('span', { class: 'entry__why' }, x.why)))));
}

function runDetails(run) {
  const box = el('details', { class: 'day__details' },
    el('summary', {}, 'Run details'));

  for (const w of run.widened ?? []) {
    box.append(el('p', { class: 'day__widened' },
      `Widened beyond Berlin/Leipzig — ${w}`));
  }
  if (run.per_category) {
    box.append(el('p', { class: 'day__cats' },
      `Live per category: ${pairs(run.per_category)}`));
  }
  if (run.evaluated) {
    box.append(el('p', { class: 'day__cats' },
      `Ads evaluated: ${pairs(run.evaluated)}`));
  }
  if (run.note) box.append(el('p', { class: 'day__note' }, run.note));
  return box;
}

const pairs = (obj) =>
  Object.entries(obj).map(([k, v]) => `${k} ${v}`).join(' · ');
