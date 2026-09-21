// The single connection object. Everything that talks to Supabase goes
// through this module; nothing else in the app may import supabase-js.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Keep the session in this browser and let the library refresh the
    // access token before it expires. The previous dashboard hand-rolled
    // both of these and that is precisely what kept breaking.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** Resolves to the current session, or null when nobody is signed in. */
export async function currentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Runs `fn` whenever the signed-in state changes (login, logout, expiry). */
export function onAuthChange(fn) {
  return supabase.auth.onAuthStateChange((_event, session) => fn(session));
}
