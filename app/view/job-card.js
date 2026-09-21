// One posting card: pills, the eligibility quote, skills, the stage line
// and its actions. Every mark written here is applied locally first so the
// click lands instantly, then persisted; a failed write is rolled back and
// reported rather than left to diverge silently.

import { jobKey } from '../data/marks-repo.js';
import {
  STAGES, advance, advanceLabel, stepBack, stageLabel, waitingState,
} from '../state/pipeline.js';
import { el } from './dom.js';

export function jobCard(job, marks, ctx) {
  const key = jobKey(job.n);
  const mark = marks.get(key) ?? null;
  const removed = Boolean(job.removed_on) || Boolean(mark?.removed);

  const card = el('article', {
    class: 'card',
    'data-removed': String(removed),
    'data-starred': String(Boolean(job.starred)),
  });

  card.append(topRow(job));
  if (job.starred) card.append(el('div', { class: 'card__star' }, '★ Top match'));
  card.append(titleBlock(job));
  if (job.eligibility_quote_de || job.eligibility_en) card.append(eligBlock(job));
  if (job.skills?.length) {
    card.append(el('div', { class: 'skills' },
      ...job.skills.map((s) => el('span', {}, s))));
  }
  if (job.salary) {
    card.append(el('p', { class: 'card__salary' },
      el('span', {}, 'Salary'), job.salary));
  }
  if (job.note) card.append(el('p', { class: 'card__note' }, job.note));

  if (removed) {
    card.append(removedBanner(job, mark, ctx, key));
  } else {
    if (mark?.stage) card.append(stageLine(mark));
    card.append(actionRow(job, mark, ctx, key));
  }
  return card;
}

function topRow(job) {
  const pills = el('div', { class: 'card__pills' });
  pills.append(el('span',
    { class: `pill pill--${job.location_group ?? 'de'}` },
    job.location_label ?? job.location_group ?? ''));
  pills.append(el('span', { class: 'pill--cat' }, job.category_label ?? ''));
  if (job.employment) pills.append(el('span', { class: 'pill--emp' }, job.employment));
  if (job.duplicate_of) {
    pills.append(el('span', { class: 'pill--dup' }, `mirror of #${job.duplicate_of}`));
  }
  return el('div', { class: 'card__top' },
    pills, el('span', { class: 'card__n' }, `#${job.n}`));
}

function titleBlock(job) {
  const wrap = el('div', {});
  wrap.append(el('h4', { class: 'card__title' },
    el('a', { href: job.url, target: '_blank', rel: 'noopener' }, job.title)));
  // The German original is worth showing only when it differs from the
  // translated title we display.
  if (job.title_original && job.title_original !== job.title) {
    wrap.append(el('p', { class: 'card__original' }, job.title_original));
  }
  wrap.append(el('p', { class: 'card__where' },
    el('b', {}, job.company),
    el('span', {}, ` · ${job.city ?? ''}`)));
  return wrap;
}

function eligBlock(job) {
  const box = el('div', { class: 'elig' },
    el('div', { class: 'elig__label' }, 'Bachelor accepted'));
  if (job.eligibility_en) box.append(el('p', { class: 'elig__en' }, job.eligibility_en));
  if (job.eligibility_quote_de) {
    box.append(el('p', { class: 'elig__de' }, `„${job.eligibility_quote_de}“`));
  }
  return box;
}

function stageLine(mark) {
  const meta = STAGES[mark.stage] ?? {};
  const line = el('div', { class: 'stage' },
    el('span', { style: `color:${meta.dot ?? 'var(--muted)'}` }, '●'),
    el('span', {
      class: 'stage__label',
      style: `background:${meta.dot ?? 'var(--muted)'}1f;color:${meta.dot ?? 'var(--muted)'}`,
    }, stageLabel(mark)));

  const wait = waitingState(mark);
  if (wait) {
    line.append(el('span',
      { class: `stage__wait${wait.overdue ? ' stage__wait--overdue' : ''}` },
      `· ${wait.prefix} `, el('b', {}, wait.label)));
  }
  return line;
}

function actionRow(job, mark, ctx, key) {
  const row = el('div', { class: 'actions' });
  const label = advanceLabel(mark);

  if (label) {
    row.append(el('button', {
      class: 'btn btn--advance',
      onclick: () => ctx.writeMark(key, advance(mark)),
    }, label));
  }

  row.append(overflowMenu(mark, ctx, key));

  const notesBtn = el('button', {
    class: 'btn',
    'aria-pressed': String(Boolean(mark?.note)),
    onclick: () => ctx.toggleNote(key),
  }, 'Notes');
  row.append(notesBtn);

  row.append(el('button', {
    class: 'btn btn--remove',
    title: 'Remove from list',
    onclick: () => ctx.writeMark(key, { removed: true }),
  }, '✕'));

  const wrap = el('div', {});
  wrap.append(row);
  if (ctx.isNoteOpen(key)) wrap.append(noteBox(mark, ctx, key));
  return wrap;
}

function noteBox(mark, ctx, key) {
  const box = el('textarea', {
    class: 'note-box', rows: '3', placeholder: 'Your notes…',
  });
  box.value = mark?.note ?? '';
  // Persist on blur rather than per keystroke: one row write per edit.
  box.addEventListener('blur', () => {
    if ((mark?.note ?? '') !== box.value) ctx.writeMark(key, { note: box.value });
  });
  return box;
}

function overflowMenu(mark, ctx, key) {
  const open = ctx.isMenuOpen(key);
  const wrap = el('div', { class: 'menu' });
  wrap.append(el('button', {
    class: 'btn', title: 'More stage actions',
    'aria-label': 'More stage actions', 'aria-expanded': String(open),
    onclick: (e) => { e.stopPropagation(); ctx.toggleMenu(key); },
  }, '⋯'));

  if (!open) return wrap;

  const item = (text, patch) => el('button',
    { onclick: () => ctx.writeMark(key, patch) }, text);
  const now = () => new Date().toISOString();

  const pop = el('div', { class: 'menu__pop' },
    item('Offer', { stage: 'offer', stage_at: now() }),
    item('Rejected', { stage: 'rejected', stage_at: now() }),
    item('Withdrawn', { stage: 'withdrawn', stage_at: now() }),
    item('Step back', stepBack(mark)),
    el('button', { onclick: () => ctx.dropMark(key) }, 'Clear stage'));
  wrap.append(pop);
  return wrap;
}

function removedBanner(job, mark, ctx, key) {
  // Two different kinds of "removed" meet here: the daily task struck it
  // off because the posting died, or you struck it off yourself. Only the
  // second is yours to undo, so say which one it is.
  const byTask = Boolean(job.removed_on);
  const why = byTask
    ? `Removed ${job.removed_on}${job.removed_why ? ` — ${job.removed_why}` : ''}`
    : 'Removed from list';

  const banner = el('div', { class: 'removed-banner' }, el('span', {}, why));
  if (!byTask) {
    banner.append(el('button', {
      class: 'btn', onclick: () => ctx.writeMark(key, { removed: false }),
    }, 'Restore'));
  }
  return banner;
}
