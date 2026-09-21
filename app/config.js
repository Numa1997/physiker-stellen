// The only file you edit after setup.
//
// The publishable key below is public by design. It is safe to commit and
// safe to serve from a public GitHub Pages site: on its own it lets the
// browser do exactly one thing — talk to the login endpoint. Every table is
// guarded by Row-Level Security, so without a valid session the API returns
// zero rows. The key identifies the project; it does not grant access to it.

export const SUPABASE_URL = 'https://xphyzmxaliamksjwxoue.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_KsJJ7mSMyzAOcCyfD6wnLQ_8sZj4nXA';

// How often the page re-reads the journal so a running daily task shows up
// as live progress. The task runs for the better part of an hour, so a
// minute of latency costs nothing and keeps the request count negligible.
export const POLL_INTERVAL_MS = 60_000;
