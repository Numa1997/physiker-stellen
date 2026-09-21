// Reads postings, companies, job boards and the meta block.
//
// A removed posting is never deleted — it keeps its row and gains
// `removed_on` / `removed_why`, so history survives and the "show removed"
// toggle has something to show. `n` is the permanent id and never changes:
// your marks are keyed to it.

import { supabase } from './supabase-client.js';

/** Every posting, live and removed, in the page's display order. */
export async function loadPostings() {
  const { data, error } = await supabase
    .from('postings')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

/** Tier A/B feature cards and the Tier C table, in tier then sort order. */
export async function loadCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function loadJobBoards() {
  const { data, error } = await supabase
    .from('job_boards')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * The meta block as a plain object: source_file, filter_rule, counts,
 * locations, categories, sections, removed_audit, updated.
 */
export async function loadMeta() {
  const { data, error } = await supabase.from('meta').select('key, value');
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.key, r.value]));
}

/** Everything the first paint needs, in one round trip. */
export async function loadAll() {
  const [postings, companies, boards, meta] = await Promise.all([
    loadPostings(), loadCompanies(), loadJobBoards(), loadMeta(),
  ]);
  return { postings, companies, boards, meta };
}
