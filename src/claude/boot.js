import { readDossier } from './data/transport.js';
import { loadMarks } from './data/marks-repo.js';
import { watchData } from './data/live-refresh.js';
import { renderPage } from './view/page.js';

const mount = document.getElementById('app');

async function main() {
  try {
    const [dossier, marks] = await Promise.all([readDossier(), loadMarks()]);
    const page = renderPage(mount, { ...dossier, marks });
    const stop = watchData(next => page.updateData(next));
    addEventListener('pagehide', stop, { once: true });
  } catch (error) {
    const box = document.createElement('div');
    box.className = 'fatal';
    const title = document.createElement('h1');
    title.textContent = 'Could not load the list';
    const message = document.createElement('p');
    message.textContent = error instanceof Error ? error.message : String(error);
    const retry = document.createElement('button');
    retry.className = 'ubtn';
    retry.textContent = 'Try again';
    retry.onclick = main;
    box.append(title, message, retry);
    mount.replaceChildren(box);
  }
}
main();
