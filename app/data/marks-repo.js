// Your marks: what stage each posting is at, whether you struck it off,
// and your notes. This is the only table the browser may write to — RLS
// grants the signed-in user SELECT everywhere and INSERT/UPDATE/DELETE
// here and nowhere else.
//
// Keys are 'j<n>' for a posting and 'c<n>' for a company, exactly as the
// artifact keyed them, so nothing is orphaned by the move.

import { supabase } from './supabase-client.js';

export const jobKey = (n) => `j${n}`;
export const companyKey = (n) => `c${n}`;

/** Every mark, as a Map keyed by item_id. */
export async function loadMarks() {
  const { data, error } = await supabase.from('marks').select('*');
  if (error) throw error;
  return new Map(data.map((m) => [m.item_id, m]));
}

/**
 * Writes one mark and returns the stored row.
 *
 * Callers update their local copy first and call this after, so the click
 * feels instant; if the write fails the caller restores the old value and
 * surfaces it in the sync indicator rather than silently diverging.
 */
export async function saveMark(itemId, patch) {
  const row = { item_id: itemId, ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('marks')
    .upsert(row, { onConflict: 'item_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Drops a mark entirely, returning the item to its unmarked state. */
export async function clearMark(itemId) {
  const { error } = await supabase.from('marks').delete().eq('item_id', itemId);
  if (error) throw error;
}

/** Clears every mark — the footer's "clear all" action. */
export async function clearAllMarks() {
  const { error } = await supabase.from('marks').delete().neq('item_id', '');
  if (error) throw error;
}
