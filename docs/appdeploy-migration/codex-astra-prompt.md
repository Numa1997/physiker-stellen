# Prompt for Codex (Astra) — Phase 1 build, Phase 3 review

Paste everything below the line into Codex. It is self-contained.

---

You are the **backend owner** of the AppDeploy app `physik-radar-xvy59b`
(live at https://physik-radar-xvy59b.v2.appdeploy.ai/). You wrote most of its
backend already. A second agent (Claude, "Opus") owns the data and the
frontend. The two of you must never edit the same files and must never deploy
at the same time. Read this whole prompt before touching anything.

## 0. The decision that has been made — do not reopen it

The owner, Numa, has decided the architecture. AppDeploy's job is **hosting
only**: serve the site, run the login, and store Numa's personal marks
(applied / interview / removed / notes). **AppDeploy does no research.**

Finding, verifying and removing job postings is done by an **exterior AI
agent** (a scheduled ChatGPT task) that edits data files in this app through
the AppDeploy connector and deploys once a day — exactly like someone editing
a file in a repo and publishing. Numa said it in these words: *"THE APPDEPLOY
JOB IS SIMPLY TO HOST OUR WORK."*

Consequences for you:

- The in-app crawler goes. Every `ai.extract`, `ai.scrape`, `ai.*` call, every
  `fetch()` to an employer site, `policy.mjs`, `seed.mjs`, `imported.mjs`, the
  `maintainVacancies` handler and `cron.json` are removed. Evidence that this is
  right, from `get_app_status` today: the cron `vacancy-maintenance` shows
  `last_status: timeout` ("App handler exceeded 30000ms runtime limit") and
  `disabled_reason: credits_exhausted`. It could not finish and it burned the
  daily credit budget that deploys need.
- The deploy `features` list becomes exactly `["api", "auth", "database"]`.
  Nothing else.

**Parallel run — do not touch the old system.** Numa's previous version
(a static page plus a Supabase database, updated each morning by an existing
scheduled task) keeps running, unchanged, until Numa personally declares this
AppDeploy version fully built, tested and working on its own. You have no
access to it and no task there. Nothing in this project deletes, pauses or
migrates away from it; the data below was *copied* out of it, read-only.

## 1. Hard facts about the platform (verified today, 2026-09-23)

- Free tier: **100 credits per UTC day. A deploy needs at least 14.** Today's
  budget is spent; deploys are paused until **2026-09-24 00:00 UTC**
  (02:00 Berlin). Do not attempt `deploy_app` before then. You may read
  (`src_read`, `src_glob`, `src_grep`, `get_app_status`, `get_app_versions`,
  `get_appdeploy_sdk_reference`) — reading worked today while deploys were
  paused.
- `deploy_app` accepts `diffs` (exact `from` → `to` replacements) per file and
  `deletePaths`. Use diffs for edits, `content` only for new files.
- `db`: `add/get/list/update/delete`, 256 KiB per stored item, per-app
  read/write quotas. `requireAuth()` puts `ctx.user` = `{ userId, email?, name?, scope }`
  on the router context.
- Current snapshot version: `1790089050451`. That number is your baton check
  (section 6).

## 2. File ownership — the one rule that prevents a mess

| Owner | Paths |
|---|---|
| **You (Codex)** | `backend/**` **except** `backend/data/**`, `cron.json` (delete), `appdeploy.auth-login.json`, `tests/tests.json`, `package.json`, `HANDOFF.md` |
| **Opus** | `backend/data/**` (content), `src/**`, `index.html`, all CSS |
| **Exterior daily agent** (ChatGPT scheduled task) | `backend/data/postings.json`, `meta.json`, `journal.json` only, via diffs |

You create `backend/data/*` **once**, as small fixtures in the exact format
below, so your backend runs. After that you never edit them — Opus replaces
them with the real data (115 postings) in the next deploy. You do not edit
anything under `src/`. If you find a frontend bug, write it in your report;
do not fix it.

## 3. The data contract (field names are the real database columns)

Five files under `backend/data/`. Each is a JSON array written **one record
per line**, and the last element is always the sentinel `{"_end":true}`:

```
[
{"n":17,"title":"…", … },
{"n":18,"title":"…", … },
{"_end":true}
]
```

Why this shape: the daily agent updates the site by sending small diffs. One
record per line makes every record a unique, single-line diff anchor
(`{"n":317,` appears once). The sentinel line is the anchor for *adding*: the
agent replaces `{"_end":true}` with `{new record},\n{"_end":true}`. Your
loader must drop every element that has `_end` and must tolerate trailing
whitespace. Fail loudly (500 with a clear message, logged) if a file does not
parse — never serve a half-read list.

**`postings.json`** — one object per posting, keys exactly:
`n` (int, permanent id, never reused), `title`, `title_original`, `company`,
`city`, `location_group`, `location_label`, `category`, `category_label`,
`target_category`, `employment`, `starred` (bool), `url`,
`eligibility_quote_de`, `eligibility_en`, `skills` (string array), `salary`,
`note`, `duplicate_of` (int|null), `direct_employer_link` (bool),
`added_on` (YYYY-MM-DD), `removed_on` (YYYY-MM-DD|null), `removed_why`
(string|null), `sort_order` (int).
A removed posting keeps its line and gets `removed_on`/`removed_why` set. It
is never deleted — the page has a "show removed" toggle.

**`companies.json`** — `id` (text), `tier`, `name`, `city`, `description`,
`tags` (string array), `links` (JSON), `product`, `url`, `sort_order`.

**`job_boards.json`** — `id` (int), `label`, `url`, `location_group`,
`sort_order`.

**`meta.json`** — `key` (text), `value` (any JSON). Keys include `updated`,
`counts`, `filter_rule`, `locations`, `categories`, `sections`,
`removed_audit`, `source_file`.

**`journal.json`** — one object per daily run: `id` (int), `run_date`
(YYYY-MM-DD), `started_at`, `finished_at` (ISO timestamps), `status`
(`done` | `did_not_finish` | `in_progress`), `checked`, `live`, `transient`
(ints), `per_category`, `evaluated`, `widened` (JSON), `note` (text), and
`changes`: array of `{ direction: "in"|"out", posting_n, title, company, why }`.

Facts from the real export (already done by Opus, md5-verified against the
source database; kept out of the public GitHub repo on purpose — it reaches
the app only in Opus's deploy, behind the login):
115 postings (113 live), `n` from 1 up to 319 with gaps, 29 companies, 6
boards, 10 meta keys, 10 journal runs with 32 changes. Lines are compact JSON
(`separators=(',',':')`), keys in the order listed above, so every posting
line starts with `{"n":<n>,`. **Company ids are `c1`–`c14` (tiers A/B) and
`tc1`–`tc15` (tier C).**

Fixtures: 2 postings (one live, one with `removed_on` set), 1 company,
1 job board, the `updated` and `counts` meta keys, 1 journal run with 1
change. Invent plainly fake values ("Fixture GmbH"); nothing that could be
mistaken for a real vacancy.

## 4. What you build (Phase 1)

1. **Delete** the crawler: `backend/policy.mjs`, `backend/seed.mjs`,
   `backend/imported.mjs`, `cron.json`, and everything in `backend/index.ts`
   that fetches, scrapes, extracts, queues, archives or schedules. Leave the
   old db tables `radar-current-v1` / `radar-archive-v1` **untouched** (do not
   delete data you did not create in this task); just stop reading them.
   Report how many records they hold.

2. **Access control — the whole site is for one person.**
   - Allowlist in `backend/access.ts`: `const ALLOWED = ['numakoudsie@gmail.com']`.
   - One guard `requireOwner()` = `requireAuth()` plus
     `ctx.user.email` lower-cased ∈ `ALLOWED`, else **403**. Missing session →
     **401**.
   - **Every** route uses `requireOwner()`. No exceptions, no public health
     endpoint that returns data.
   - Check `appdeploy.auth-login.json` and the `auth` SDK reference: if the
     platform supports restricting sign-up/sign-in to an allowlist, configure
     it too (defence in depth). If it does not, say so in the report — the
     backend guard is then the only gate, and that must be airtight.

3. **`GET /api/dossier`** → built from the five data files, behind
   `requireOwner()`. Its **response shape must stay exactly what the
   frontend already consumes today**: read `src/claude/data/transport.js`,
   `postings-repo.js`, `journal-repo.js`, `marks-repo.js`,
   `live-refresh.js` and `src/claude/boot.js` and match every property they
   destructure. If the frontend reads something the contract above cannot
   supply, map it in the backend and list the mapping in your report.
   The data files must be imported **only** from `backend/`. Nothing in
   `src/` may import them — otherwise the whole job list ships in the public
   JS bundle and the login protects nothing.
   Set `Cache-Control: no-store`.

4. **Marks** — keep `backend/marks.ts` and its storage
   (`'dossier-marks:' + userId`), switch its guards to `requireOwner()`.
   The current key regex `^[jc]\d{1,10}$` **rejects `tc1`–`tc15`**. Read
   `src/claude/view/company-section.js` to see whether tier-C rows can be
   marked at all. If they can, the regex becomes exactly
   `^(j\d{1,6}|c\d{1,3}|tc\d{1,3})$`; if they cannot, keep `j`/`c` and say
   so in the report. No wider.

5. **`tests/tests.json`** — replace crawler tests with: login page reachable;
   `/api/dossier` 401 without session; after login the page shows the
   fixture posting title; toggling "remove" on the fixture card hides it and
   it stays hidden after a full reload.

6. **`HANDOFF.md`** at the app root: who holds the baton, the snapshot
   version you produced, the ownership table from section 2, the data
   contract from section 3 verbatim.

## 5. Acceptance — prove each, with the evidence, in your report

- [ ] `src_grep` for `ai\.|fetch\(|scrape|cron|maintainVacancies` in
      `backend/` returns nothing. `cron.json` is gone. `get_app_status` shows
      no crons.
- [ ] `/api/dossier` without session → 401 (show the response).
- [ ] Every route in the router table is wrapped in `requireOwner()` (paste
      the table).
- [ ] No file under `src/` imports anything from `backend/data` (paste the
      grep).
- [ ] Deploy `features` = `["api","auth","database"]`.
- [ ] `get_app_status` → `ready`, zero frontend/backend errors, QA screenshot
      shows the fixture card.
- [ ] Credits: state the credit balance before and after your deploy if the
      dashboard or the error messages expose it.

## 6. Deploy discipline — one deploy, with a baton check

- Exactly **one** `deploy_app` in Phase 1, after 2026-09-24 00:00 UTC.
- Immediately before it: `get_app_versions`. If the newest version is not
  `1790089050451`, **stop** — someone else deployed; re-read what changed and
  report instead of overwriting.
- If the deploy fails validation, fix and retry — at most two retries. If it
  still fails, stop and report; do not burn the day's budget.
- A deploy cannot record its own version id, so after `ready` put the new
  version id in your report; Opus writes it into `HANDOFF.md` in the next
  deploy. From that moment the baton is Opus's. You do not deploy again
  unless Numa hands the baton back.

## 7. Report format (Phase 1)

Short. Sections: *Deleted*, *Built*, *Frontend shape mapping*, *Acceptance
evidence* (the checklist, each with its proof), *Old tables* (record counts),
*New snapshot version*, *Anything you could not verify*. No marketing
language, no "should work" — either you checked it or you say you did not.

---

## Phase 3 — review Opus's deploy (only when Numa says "review Opus's deploy")

Read-only. You do not deploy, you do not edit. Use `src_read`, `src_grep`,
`get_app_status`, and the live site.

Review as a stranger who has not seen why any decision was made. Look for:

1. **Data integrity** — `backend/data/postings.json`: every line parses; `n`
   unique; no `n` reused; live count = records with `removed_on == null`;
   every `duplicate_of` points to an existing `n`; every `url` is `https://`;
   `meta.counts` agrees with the file. Expected at export: 115 postings,
   113 live, 29 companies, 6 boards, 10 journal runs, 32 journal changes.
2. **Leak check** — fetch the live site's JS/CSS bundle without logging in
   and search it for a real posting title from `postings.json`. Any hit is a
   critical finding.
3. **Frontend ↔ contract** — anything the frontend reads that the backend
   no longer sends (renders as `undefined`, empty sections, NaN counts).
4. **Mark persistence across a deploy** — marks set before Opus's deploy
   must still be there after it. Say whether you could verify this.
5. **The daily agent's prompt** (`docs/appdeploy-migration/daily-task-prompt-chatgpt.md`
   in the GitHub repo `numa1997/physiker-stellen`, or pasted by Numa): can its
   diffs ever touch a file outside `backend/data/`? Can a failed run leave a
   half-written file? Does it check the baton before deploying? Does it deploy
   at most once per day?

Report every finding as: **severity** (critical / major / minor), **file:line**,
**what breaks, for whom, when**, **the fix**. Skip style opinions. If you find
nothing in a category, say "checked, nothing" — do not pad.
