// Applied / Not relevant, keyed by the card number exactly as on AppDeploy:
// 'j' + n. Two layers:
//   1. data/applied.json: the applied history carried over from AppDeploy
//      (card, status, date; one line per card), shown as Applied with its
//      status.
//   2. This browser (localStorage): every click made here. A click on a card,
//      Undo included, always wins over line 1, so Undo stays undone.
// Same exports as the AppDeploy version, so page.js is unchanged.
const KEY = 'radar.marks.v1';
export const jobKey = n => `j${n}`;
export const companyKey = n => `c${n}`;

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}
function writeAll(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); }
  catch { throw new Error('This browser did not let the page save. Nothing was changed.'); }
}

async function appliedHistory() {
  const response = await fetch('data/applied.json', { cache: 'no-store' });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('data/applied.json: HTTP ' + response.status);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('data/applied.json: expected a list');
  return rows.map(({ card, status, date }) => {
    const at = date + 'T00:00:00.000Z';
    return { item_id: 'j' + card, outcome: 'applied', outcome_at: at, stage: status, stage_at: at };
  });
}

export async function loadMarks() {
  const marks = new Map((await appliedHistory()).map(m => [m.item_id, m]));
  for (const m of Object.values(readAll())) marks.set(m.item_id, m);
  return marks;
}
export async function saveMark(itemId, patch) {
  const all = readAll();
  const mark = { ...(all[itemId] ?? { item_id: itemId }), ...patch, updated_at: new Date().toISOString() };
  all[itemId] = mark;
  writeAll(all);
  return mark;
}
export async function clearMark(itemId) {
  const all = readAll();
  delete all[itemId];
  writeAll(all);
}
export async function clearAllMarks() {
  writeAll({});
}
