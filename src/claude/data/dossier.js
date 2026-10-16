import { CATEGORIES, BOARDS, AREAS, CATEGORY_KEYS, AREA_KEYS } from './categories.js';

const names = ['postings', 'meta', 'applicationLog'];

function readArray(name, text) {
  const fail = detail => { throw new Error('Invalid backend/data/' + name + '.json: ' + detail); };
  let rows;
  try { rows = JSON.parse(text); } catch { fail('cannot parse JSON'); }
  if (!Array.isArray(rows)) fail('expected an array');
  const end = rows.at(-1);
  if (!end || end._end !== true || Object.keys(end).length !== 1) fail('missing final end marker');
  rows = rows.slice(0, -1);
  if (rows.some(row => !row || typeof row !== 'object' || Array.isArray(row) || '_end' in row)) {
    fail('invalid record');
  }
  return rows;
}

export function buildDossier(texts) {
  // Finish validation of every file before returning any part of the dossier.
  const data = Object.fromEntries(names.map(name => [name, readArray(name, texts[name])]));
  const ns = data.postings.map(p => p.n);
  if (ns.some(n => !Number.isSafeInteger(n) || n <= 0) || new Set(ns).size !== ns.length) {
    throw new Error('Invalid backend/data/postings.json: invalid or duplicate n');
  }
  const bad = data.postings.find(p => !CATEGORY_KEYS.includes(p.category) || !AREA_KEYS.includes(p.location_group) ||
    typeof p.title !== 'string' || typeof p.url !== 'string');
  if (bad) throw new Error('Invalid backend/data/postings.json: posting ' + bad.n + ' has an unknown category, area, title or url');
  const keys = data.meta.map(row => row.key);
  if (keys.some(key => typeof key !== 'string' || !key) || new Set(keys).size !== keys.length) {
    throw new Error('Invalid backend/data/meta.json: invalid or duplicate key');
  }
  if (data.meta.some(row => !Object.hasOwn(row, 'value'))) throw new Error('Invalid backend/data/meta.json: missing value');
  const logIds = new Set();
  const logStatuses = ['rejected', 'confirmed', 'interview', 'portal_invitation', 'unclear'];
  for (const row of data.applicationLog) {
    if (typeof row.id !== 'string' || !row.id || logIds.has(row.id) ||
        !Array.isArray(row.cards) || row.cards.some(n => !ns.includes(n)) ||
        !logStatuses.includes(row.status) ||
        ['company', 'title', 'date', 'note', 'source'].some(k => typeof row[k] !== 'string') ||
        (row.date && (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(row.date))))) {
      throw new Error('Invalid backend/data/applicationLog.json: invalid or duplicate log entry');
    }
    logIds.add(row.id);
  }
  return {
    applicationLog: data.applicationLog,
    postings: data.postings.toSorted((a, b) => b.n - a.n),
    meta: Object.fromEntries(data.meta.map(row => [row.key, row.value])),
    categories: CATEGORIES,
    boards: BOARDS,
    areas: AREAS,
  };
}
