# Moving to AppDeploy: plan and split of work

Target: one platform. AppDeploy hosts the site, handles the login and stores
Numa's marks. An exterior agent (the Cowork scheduled task) edits the data
files each morning and deploys. AppDeploy runs no AI and no cron.
Supabase is used once, to copy the current list out, and is then dropped.

## Facts this plan rests on (checked 2026-09-23)

- AppDeploy free tier: 100 credits per UTC day, at least 14 per deploy.
  Today's budget is spent, so no deploys until 2026-09-24 00:00 UTC.
- The in-app crawler cron timed out at the 30 s limit and was auto-disabled
  (`credits_exhausted`).
- `deploy_app` takes per-file diffs, so a daily update is a few KB.
- Supabase now: 115 postings (113 live), 29 companies, 6 boards,
  10 journal runs, 32 journal changes, 0 marks. Nothing personal to migrate.
- One daily deploy is about 14 of 100 credits once nothing else in the app
  uses credits.

## Who does what

| Phase | Owner | Work | Deploys |
|---|---|---|---|
| 0 | Opus | One-time copy of the current list out of Supabase into the 5-file contract, checked against the counts above. Rewrite the daily prompt to send diffs through AppDeploy. | 0 |
| 1 | Codex | Remove the crawler, add an owner-only guard on every route, serve `/api/dossier` from the data files, keep marks, add fixtures, update tests. | 1 |
| 2 | Opus | Swap the fixtures for the real data, check the frontend against the artifact (Playwright), check that marks survive a deploy, update `HANDOFF.md`. | 1 |
| 3 | Codex | Read-only review of phase 2 and the daily prompt. | 0 |
| 4 | Opus | Fix the review findings, then cut over: point the Cowork task at AppDeploy and run it once by hand. | 1–2 |
| 5 | Numa | Attach the AppDeploy connector to the Cowork task (if that needs the UI). Pause Supabase. | 0 |

That is 3–4 deploys in total over 2 days, then 1 per day.

## Why the work is split this way

- Codex gets the backend. It is a well-scoped task with a checklist, and
  Codex wrote this backend, so it already knows the code.
- Opus gets the data, the frontend and the daily prompt. Only Opus has the
  Supabase connector and the history of the schema. The frontend files are
  Opus's port of the artifact. The daily prompt holds the judgment rules
  (the team-lead exception, eligibility read from the German quote only),
  which is the least clear-cut work.
- Codex reviews. It reads the finished work cold, without knowing why each
  decision was made.
- Two rules prevent collisions: each file has exactly one owner, and only the
  agent holding the baton deploys, after checking the version number.
