// Per-device preferences: which sections are folded, card density, whether
// the mobile filter rows are open. These are conveniences, not data, so
// they live in this browser only — exactly where the artifact kept them.
// Marks (stages, notes, removals) are data and live in Supabase.

const KEY = 'numa.jobs.v2';

// Everything starts folded: the page opens as a grid of tiles, one per
// section, and you open the one you want. Section ids in reading order.
export const SECTION_IDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's8', 's9', 's7'];
const ALL_COLLAPSED = Object.fromEntries(SECTION_IDS.map((id) => [id, true]));

export function loadPrefs() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      collapsed: s.collapsed ?? { ...ALL_COLLAPSED },
      density: s.density === 'compact' ? 'compact' : 'full',
    };
  } catch {
    return { collapsed: { ...ALL_COLLAPSED }, density: 'full' };
  }
}

export function savePrefs(prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode etc. */ }
}

/**
 * Fold changes reflow the tile grid. A View Transition animates every tile
 * to its new slot; without it they would jump. Falls back to a plain call.
 */
export function withViewTransition(run) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) { run(); return; }
  const root = document.documentElement;
  root.classList.add('vt-run');
  const t = document.startViewTransition(() => { run(); });
  t.finished.catch(() => {}).then(() => root.classList.remove('vt-run'));
}
