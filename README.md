# Physiker Stellen

Numa's board of physics job postings, as a static GitHub Pages site.
It is a copy of the AppDeploy app `physik-radar-xvy59b` (version v50, 16 Oct 2026): the same page code
(`src/claude/view/page.js`, `dom.js`) and the same design (`src/claude/styles/board.css`, see `DESIGN.md`).

## What differs from the AppDeploy app

| AppDeploy | This site |
|---|---|
| Sign-in limited to Numa's Gmail | No sign-in; the repository and the page are public |
| Applied / Not relevant saved on the server | The applied history from AppDeploy is in `data/applied.json`; new clicks are saved in the browser you use (localStorage) |
| "+ Add posting" saved on the server | Saved in the browser you use |
| Email application log | Not published |

## Files

- `index.html`: mounts the page.
- `data/postings.json`: the list. Append new postings after the highest `n`; never renumber or delete, because marks are keyed by `n`. The last element is the `{"_end": true}` marker.
- Two boards: Germany (areas `berlin`, `leipzig`, `de`) and Europe outside Germany (areas `benelux`, `nordics`, `europe`). The board is chosen by the switch at the top; which area belongs to which board is set in `src/claude/data/categories.js`.
- `data/meta.json`: the list's rule, last update and target per area.
- `data/applied.json`: applied history (card, status, date).
- `src/claude/data/categories.js`: the eleven categories and three areas.
- `src/claude/data/dossier.js`: checks the data files; a broken file shows an error instead of half a list.
- `scripts/design-check.mjs`: `node scripts/design-check.mjs` checks colours, contrast and fonts against `DESIGN.md`.
