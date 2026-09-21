// The application pipeline, exactly as the artifact had it.
//
//   (none) → applied → confirmed → interview 1 → interview 2 → …
//   and from anywhere via the ⋯ menu: offer · rejected · withdrawn
//
// One primary button always moves forward one step; everything sideways or
// backwards is an explicit menu choice, so a stray click never records an
// outcome that did not happen.

export const TERMINAL = new Set(['offer', 'rejected', 'withdrawn']);
export const isTerminal = (stage) => TERMINAL.has(stage);

const DOT = {
  applied: '#8b8079', confirmed: '#7a4b12', interview: '#7a1f2b',
  offer: '#7a1f2b', rejected: '#8b8079', withdrawn: '#8b8079',
};
const STAGE_LABEL = { applied: 'Confirmation received ›', confirmed: 'Interview 1 done ›' };

/** The mark after pressing the primary button. */
export function advance(mark) {
  const s = mark?.stage ?? null, r = mark?.round ?? 0;
  if (!s) return { stage: 'applied', round: 0, stage_at: now() };
  if (s === 'applied') return { stage: 'confirmed', round: 0, stage_at: now() };
  if (s === 'confirmed') return { stage: 'interview', round: 1, stage_at: now() };
  if (s === 'interview') return { stage: 'interview', round: r + 1, stage_at: now() };
  return null;
}

/** Reverses one advance() step. Terminal stages step back to interview 1. */
export function stepBack(mark) {
  const s = mark?.stage ?? null, r = mark?.round ?? 0;
  if (!s) return null;
  if (isTerminal(s)) return { stage: 'interview', round: 1, stage_at: now() };
  if (s === 'interview' && r > 1) return { stage: 'interview', round: r - 1, stage_at: now() };
  if (s === 'interview') return { stage: 'confirmed', round: 0, stage_at: now() };
  if (s === 'confirmed') return { stage: 'applied', round: 0, stage_at: now() };
  return { stage: null, round: 0, stage_at: null };
}

export const setStage = (stage) => ({ stage, round: 0, stage_at: now() });
export const clearStage = () => ({ stage: null, round: 0, stage_at: null });

const now = () => new Date().toISOString();

/**
 * Everything a card needs to know about its mark: the same fields the
 * artifact's `entry()` computed, under the same names, so the template
 * markup binds to them unchanged.
 */
export function entryView(mark) {
  const stage = mark?.stage ?? null;
  const round = mark?.round ?? 0;
  const removed = Boolean(mark?.removed);
  const noteText = mark?.note ?? '';
  const hasStage = Boolean(stage);
  const terminal = isTerminal(stage);
  const at = mark?.stage_at ? new Date(mark.stage_at).getTime() : 0;
  const days = at ? Math.floor((Date.now() - at) / 86_400_000) : null;
  const stale = hasStage && !terminal && days !== null && days >= 14;
  const dot = DOT[stage] ?? '#8b8079';
  const dimmed = removed || stage === 'rejected' || stage === 'withdrawn';
  const hasWait = hasStage && !terminal && days !== null;

  let stageLabel = '';
  if (stage === 'interview') stageLabel = `INTERVIEW ${round}`;
  else if (stage) stageLabel = stage.toUpperCase();

  const advanceLabel = !stage ? 'Mark applied ›'
    : stage === 'interview' ? `Interview ${round + 1} done ›`
    : (STAGE_LABEL[stage] ?? '');

  return {
    stage, round, hasStage, terminal, stale, removed, noteText,
    applied: hasStage, active: !removed,
    removedAttr: removed ? '1' : '0',
    opacity: dimmed ? .5 : 1,
    strike: removed ? 'line-through' : 'none',
    border: removed ? '1px dashed #cdc1ae' : '1px solid #cdc1ae',
    // company-card "Applied" toggle colours
    apBorder: hasStage ? '#7a1f2b' : '#d9d0c2', apBg: hasStage ? '#7a1f2b' : 'transparent', apColor: hasStage ? '#fff' : '#5a504b',
    apBorderDk: hasStage ? '#e2a2aa' : 'rgba(245,241,234,.35)', apBgDk: hasStage ? '#e2a2aa' : 'transparent', apColorDk: hasStage ? '#1c1518' : 'rgba(245,241,234,.8)',
    // stage line
    stageLabel, stageDot: dot,
    stageLabelBg: stage === 'offer' ? '#7a1f2b' : 'transparent',
    stageLabelColor: stage === 'offer' ? '#fff' : dot,
    stageLabelPad: stage === 'offer' ? '2px 8px' : '0',
    stageLabelRadius: stage === 'offer' ? '3px' : '0',
    stageLabelStrike: stage === 'rejected' ? 'line-through' : 'none',
    hasWait, waitPrefixLabel: hasWait ? 'waiting ' : '', waitDaysLabel: hasWait ? `${days}d` : '',
    waitColor: stale ? '#7a4b12' : '#8b8079', waitDays: hasWait ? days : -1,
    hasAdvance: !terminal, advanceLabel,
  };
}

/** Colours for a notes button: lit when a note exists or the box is open. */
export function noteBtn(noteOpen, noteText) {
  const lit = noteOpen || Boolean(noteText);
  return {
    ntBorder: lit ? '#7a1f2b' : '#d9d0c2',
    ntBg: noteOpen ? '#f3dcdc' : 'transparent',
    ntColor: lit ? '#7a1f2b' : '#5a504b',
  };
}
