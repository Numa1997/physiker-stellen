# Numa's runbook — moving Physik Radar onto AppDeploy

Your checkpoints, in order. Each one says **when**, **what you do**, **what
you should see**, and **what to send back**. Nothing moves to the next
checkpoint until the current one passes.

## Who is who

| Who | Role | Where |
|---|---|---|
| **You** | Owner. Start each phase, approve deploys, do the checks only a logged-in human can do, make the final call. | — |
| **Opus** (this Claude session) | Data, frontend, the daily prompt, integration, verification. | here |
| **Codex / Astra** (ChatGPT with the AppDeploy connector) | Backend rebuild (Phase 1), cold review (Phase 3). | ChatGPT |
| **Daily agent** (ChatGPT scheduled task) | Every morning: checks the links, searches, edits the list, publishes once. | ChatGPT |
| **AppDeploy** | Hosting, login, your marks. No AI, no cron. | physik-radar-xvy59b |

## The rule that protects you

**The old system keeps running, untouched**, until you say at N8 that the new
one is validated. That means the Supabase project, its data, the GitHub
code, and the existing morning task. Nothing is deleted, paused or moved
before then. The data was **copied** out of Supabase with read-only queries,
and Supabase has not changed.

## Budget you need to know

AppDeploy free tier: **100 credits per UTC day, at least 14 per deploy**. The
budget resets at **02:00 Berlin** (01:00 after the clocks change on 25 Oct).
The build takes about 3 deploys over 2 days; after that it's 1 per day. If a
deploy fails with *credits exhausted*, nothing is broken: it waits for the
reset.

---

## N0 — done (Wed 23 Sep)

You approved the Supabase `execute_sql` calls. They were SELECT only.
Result: the five data files, kept **out of the public GitHub repo** on
purpose (they reach AppDeploy only behind your login), with
115 postings (113 live), 29 companies, 6 boards, 10 meta keys and 10 runs.
Each file matches the database's own md5.

## N1 — start Codex (Thu 24 Sep, any time after 02:00 Berlin)

1. Open ChatGPT where Astra has the AppDeploy connector.
2. Paste everything below the line in `codex-astra-prompt.md`, then add one
   line at the end: **"Do Phase 1 only."**
3. Wait for its report.

**Pass:** the report has all 7 sections; *New snapshot version* is a
number; every box in *Acceptance evidence* has its proof pasted (the 401
response, the route table, the two greps).
**Stop it** if it wants to deploy more than once, edit anything under `src/`,
or delete anything in the old database tables.
**Send me:** its full report, plus "go phase 2".

## N2 — approve my deploy (right after N1)

I load the real data into the app (1 deploy). You get an approval prompt
for `deploy_app`: approve it. I check the deploy status, the public bundle
(no posting text may appear in it) and the page layout.
**Send me:** nothing. I tell you "phase 2 live".

## N3 — the checks only you can do (5 minutes, after "phase 2 live")

I cannot log in as you, so these checks are yours:

1. **Private/incognito window** → open
   https://physik-radar-xvy59b.v2.appdeploy.ai/ → you must see **only a
   login screen**, no postings.
2. Log in as numakoudsie@gmail.com → the page shows the list with the
   count I gave you.
3. **Remove 2 cards. Mark 1 as applied.**
4. Reload → those 2 cards are still gone and the applied mark is still there.
5. Open the site on your phone → same.

**Leave those 3 marks in place.** They are the test that later deploys
don't wipe them.
**Send me:** "N3 ok", or exactly what differed (a screenshot helps).

## N4 — Codex review (after N3 ok)

In the Astra chat: **"Review Opus's deploy — Phase 3 of the prompt."**
**Send me:** its findings, unedited.

## N5 — fixes (after N4)

I fix every critical and major finding. If that needs a deploy, you
approve it as in N2. If Codex found nothing, this checkpoint is skipped.

## N6 — the daily agent's first run (after N5)

1. Open a **new** ChatGPT chat with the AppDeploy connector enabled.
2. Paste the whole of `daily-task-prompt-chatgpt.md`, then add the word
   **FORCE** at the end.
3. Let it run to the end. It will take a while; the search is long by design.

**Pass:** its report ends with a new version id and no line starting
`NOT READY`, `BATON CONFLICT` or `NOT PUBLISHED`.
**Then check yourself:** reload the site. Today's entry is in the daily log,
and **your 3 marks from N3 are still there.**
**Send me:** its report. I verify the deploy from here.

Then schedule it: create a ChatGPT scheduled task, **daily at 08:00
Berlin**, with the same prompt **without** FORCE and the AppDeploy connector
enabled. I cannot see ChatGPT's settings screens. If ChatGPT won't let a
scheduled task use the connector, tell me. The fallback is a scheduled
Claude routine with the AppDeploy connector, which I can create from here.

## N7 — the parallel week (7 mornings after the first scheduled run)

Both systems run side by side. **You don't have to do anything daily.**
If you want to glance, the daily log on the new site shows each morning's
run.
**On day 7, tell me "audit the week".** I check that there are 7 journal
rows with status `done`, 7 deploys that reached `ready`, and that your marks
are intact, and I compare the two lists for anything one found and the other
missed.

## N8 — your decision

Only you declare the new site validated. Only after that, and with your
approval for each step, the old morning task is stopped and the Supabase
project is paused. It is **paused, not deleted**; you can switch it back on.
The GitHub repo stays as the archive of all code and prompts.

---

## Files in this folder

| File | For | Used at |
|---|---|---|
| `numa-runbook.md` | you | all |
| `codex-astra-prompt.md` | Codex / Astra | N1, N4 |
| `daily-task-prompt-chatgpt.md` | the ChatGPT daily agent | N6 |
| `../../appdeploy/export_from_supabase.py` | re-makes the private copy of the list (never committed) | N2 |
