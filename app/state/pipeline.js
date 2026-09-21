// The application pipeline as a small state machine.
//
// Stages advance in one direction under the primary button; everything
// else (offer, rejection, withdrawal, stepping back) is an explicit
// choice from the overflow menu, so a stray click can never quietly
// record an outcome that did not happen.

export const STAGES = {
  applied:   { label: 'Applied',    dot: '#7a4b12', next: 'interview' },
  interview: { label: 'Interview',  dot: '#1f5c7a', next: 'interview' },
  offer:     { label: 'Offer',      dot: '#33543f', next: null },
  rejected:  { label: 'Rejected',   dot: '#7a1f2b', next: null },
  withdrawn: { label: 'Withdrawn',  dot: '#8b8079', next: null },
};

export const ORDER = ['applied', 'interview', 'offer'];
const TERMINAL = new Set(['offer', 'rejected', 'withdrawn']);

export const isTerminal = (stage) => TERMINAL.has(stage);

/** The label for the primary button given the current mark. */
export function advanceLabel(mark) {
  if (!mark?.stage) return '✓ Applied';
  if (mark.stage === 'applied') return '→ Interview';
  if (mark.stage === 'interview') {
    return `→ Interview ${(mark.round ?? 1) + 1}`;
  }
  return null; // terminal: the primary button is hidden
}

/** The mark that results from pressing the primary button. */
export function advance(mark) {
  const now = new Date().toISOString();
  if (!mark?.stage) return { stage: 'applied', round: null, stage_at: now };
  if (mark.stage === 'applied') {
    return { stage: 'interview', round: 1, stage_at: now };
  }
  if (mark.stage === 'interview') {
    return { stage: 'interview', round: (mark.round ?? 1) + 1, stage_at: now };
  }
  return mark;
}

/** One step back down the ladder; from the first stage it clears. */
export function stepBack(mark) {
  const now = new Date().toISOString();
  if (!mark?.stage) return { stage: null, round: null, stage_at: null };
  if (mark.stage === 'interview' && (mark.round ?? 1) > 1) {
    return { stage: 'interview', round: mark.round - 1, stage_at: now };
  }
  if (mark.stage === 'interview') {
    return { stage: 'applied', round: null, stage_at: now };
  }
  if (isTerminal(mark.stage)) {
    return { stage: 'interview', round: 1, stage_at: now };
  }
  return { stage: null, round: null, stage_at: null };
}

/** Whole days elapsed since the stage was set. */
export function waitingDays(mark, now = Date.now()) {
  if (!mark?.stage_at) return null;
  const ms = now - new Date(mark.stage_at).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * How the waiting time should read. Silence is only worth flagging once
 * it has run long enough to mean something: a fortnight after applying,
 * a week after an interview.
 */
export function waitingState(mark) {
  const days = waitingDays(mark);
  if (days === null || isTerminal(mark.stage)) return null;

  const threshold = mark.stage === 'interview' ? 7 : 14;
  return {
    days,
    label: days === 0 ? 'today' : days === 1 ? '1 day' : `${days} days`,
    prefix: mark.stage === 'interview' ? 'waiting since interview' : 'waiting',
    overdue: days >= threshold,
  };
}

/** The stage label for a card, including the interview round. */
export function stageLabel(mark) {
  if (!mark?.stage) return null;
  const base = STAGES[mark.stage]?.label ?? mark.stage;
  if (mark.stage === 'interview' && (mark.round ?? 1) > 1) {
    return `${base} ${mark.round}`;
  }
  return base;
}
