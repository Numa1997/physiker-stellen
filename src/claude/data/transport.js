// The static copy has no server: the list is read from the JSON files in
// data/ and checked by the same buildDossier the AppDeploy server used, so a
// broken file fails loudly instead of showing half a list. Postings added
// with "+" live in this browser only (see added-repo.js).
import { buildDossier } from './dossier.js';
import { listAdded } from './added-repo.js';

// The email application log is private and not published with this copy.
const FILES = ['postings', 'meta'];
const NO_EMAIL_LOG = '[{"_end": true}]';

async function text(name) {
  const response = await fetch('data/' + name + '.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('data/' + name + '.json: HTTP ' + response.status);
  return response.text();
}

let cached;
let pending;
export async function readDossier(force = false) {
  if (!force && cached && Date.now() - cached.at < 3000) return cached.data;
  if (pending) return pending;
  pending = Promise.all(FILES.map(text)).then(texts => {
    const dossier = buildDossier({ ...Object.fromEntries(FILES.map((name, i) => [name, texts[i]])), applicationLog: NO_EMAIL_LOG });
    const data = { ...dossier, added: listAdded() };
    cached = { at: Date.now(), data };
    return data;
  }).finally(() => { pending = null; });
  return pending;
}
