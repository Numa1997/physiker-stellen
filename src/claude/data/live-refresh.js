import { readDossier } from './transport.js';
export function watchData(onUpdate) {
  let stopped = false, busy = false, signature = '';
  async function tick() {
    if (stopped || busy || document.hidden) return;
    busy = true;
    try {
      const next = await readDossier(true);
      const nextSignature = JSON.stringify(next);
      if (nextSignature !== signature) { signature = nextSignature; onUpdate(next); }
    } catch { /* Retain the last successful view during a transient outage. */ }
    finally { busy = false; }
  }
  const visible = () => { if (!document.hidden) tick(); };
  document.addEventListener('visibilitychange', visible);
  const interval = setInterval(tick, 60000);
  return () => { stopped = true; clearInterval(interval); document.removeEventListener('visibilitychange', visible); };
}
