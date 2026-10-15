// Postings Numa adds with the "+" under a category, kept in this browser
// (localStorage). Same checks as the AppDeploy server: a full https link, a
// title, a city, a known area and category.
import { CATEGORY_KEYS, AREA_KEYS } from './categories.js';

const KEY = 'radar.added.v1';
const clean = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '');

function readAll() {
  try { const rows = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(rows) ? rows : []; } catch { return []; }
}
function writeAll(rows) {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); }
  catch { throw new Error('This browser did not let the page save. Nothing was changed.'); }
}

export function listAdded() {
  return readAll().sort((a, b) => String(b.added_at).localeCompare(String(a.added_at)));
}
export async function addPosting(input) {
  let url;
  try { url = new URL(clean(input.url, 2000)); } catch { url = null; }
  if (!url || !['https:', 'http:'].includes(url.protocol)) throw new Error('The link must be a full web address starting with https://');
  const posting = {
    url: url.href, title: clean(input.title, 300), company: clean(input.company, 200),
    city: clean(input.city, 120), area: input.area, category: input.category,
  };
  if (!posting.title) throw new Error('Enter the job title.');
  if (!posting.city) throw new Error('Enter the city.');
  if (!AREA_KEYS.includes(posting.area)) throw new Error('Choose the area.');
  if (!CATEGORY_KEYS.includes(posting.category)) throw new Error('Unknown category.');
  const rows = readAll();
  const taken = new Set(rows.map(r => r.item_id));
  const at = new Date();
  let stamp = at.getTime();
  while (taken.has('a' + stamp)) stamp++;
  const record = { item_id: 'a' + stamp, ...posting, added_at: at.toISOString() };
  writeAll([record, ...rows]);
  return record;
}
export async function deleteAdded(itemId) {
  writeAll(readAll().filter(r => r.item_id !== itemId));
}
