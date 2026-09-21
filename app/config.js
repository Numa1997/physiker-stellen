// The only file you edit after setup.
//
// The publishable key below is public by design. It is safe to commit and
// safe to serve from a public GitHub Pages site: on its own it lets the
// browser do exactly one thing — talk to the login endpoint. Every table is
// guarded by Row-Level Security, so without a valid session the API returns
// zero rows. The key identifies the project; it does not grant access to it.

export const SUPABASE_URL = 'https://xphyzmxaliamksjwxoue.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_KsJJ7mSMyzAOcCyfD6wnLQ_8sZj4nXA';

// How often the page checks whether anything changed.
//
// Two speeds, because the thing being watched is bursty: the database sits
// still for most of the day and then changes every few minutes during the
// morning run. Each tick asks a small question first and only refetches
// what changed, so the page can check in often without re-downloading a
// list that has not moved.
export const FAST_POLL_MS = 60_000;   // a run is in flight — show it moving
export const IDLE_POLL_MS = 300_000;  // nothing happening — just check in
