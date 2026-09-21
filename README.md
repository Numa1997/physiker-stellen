# Physiker Stellen

A private job dossier: physics roles in Berlin, Leipzig and the rest of
Germany that a BSc physicist can actually apply to. A scheduled agent
re-checks every posting each morning, strikes off the dead ones, searches
for new ones, and writes what it did into a daily log.

## The three boxes

```
┌──────────────────────────┐        ┌──────────────────────────────┐
│  GitHub Pages            │        │  Supabase (Frankfurt)        │
│  static files only:      │  HTTPS │  Postgres tables:            │
│  HTML + CSS + JS         │◄──────►│   postings, journal,         │
│  ZERO data, ZERO secrets │        │   journal_changes, marks,    │
└──────────────────────────┘        │   companies, job_boards, meta│
            ▲                       │  Auth: one user              │
            │ opens in browser      │  Row-Level Security          │
            │                       └──────────────┬───────────────┘
        ┌───┴────┐                                 ▲
        │  You   │                                 │ SQL, every morning
        │ laptop │                    ┌────────────┴────────────┐
        │ phone  │                    │  the daily agent        │
        └────────┘                    │  (search rules in task/)│
                                      └─────────────────────────┘
```

**The rule that makes this safe:** this repository contains no job data, no
marks and no password. The browser fetches everything from Supabase, and
Supabase hands out nothing without a valid login. So the repo can be public
— which GitHub Pages on the free plan requires — and it does not matter.

The publishable key in `app/config.js` is public by design. On its own it
lets a browser talk to the login endpoint and nothing else; every table is
guarded by Row-Level Security, so without a session the API returns zero
rows.

## Layout

```
index.html                 mounts the app and stops. No logic, no data.
app/
  boot.js                  start-up order: gate → load → render → poll
  config.js                Supabase URL + publishable key
  auth/password-gate.js    login form, session reuse, sign-out
  data/                    everything that talks to Supabase; nothing else may
    supabase-client.js     the single connection object
    postings-repo.js       postings, companies, job boards, meta
    journal-repo.js        daily log + the live-progress poll
    marks-repo.js          your stage marks and notes — the only table we write
  state/
    filters.js             search, location, category, stage, sort — pure
    pipeline.js            the stage machine and the waiting-days maths
  view/                    one file per visible block, top to bottom
    dom.js                 a 30-line element builder; the whole "framework"
    page.js                assembles the blocks and owns view state
    filter-bar.js  masthead.js  section-nav.js
    company-section.js  job-section.js  job-card.js  job-boards.js
    daily-log.js  audit-trail.js
  styles/                  tokens · layout · cards · daily-log · print
supabase/migrations/       the schema, as applied
task/daily-task-prompt.md  the daily agent's rules, versioned
docs/                      ARCHITECTURE.md · RUNBOOK.md
```

No framework, no bundler, no build step. Plain ES modules, served as they
are written — which is the point: you can open any file and read what it
does.

## Running it locally

Any static server will do; ES modules need `http://`, not `file://`.

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

It talks to the live Supabase project, so you see real data and your marks
sync with the deployed page.

## The daily agent

The search rules live in [`task/daily-task-prompt.md`](task/daily-task-prompt.md)
— ten target categories, the four tests a posting must pass (link, role,
background, level), and the Berlin-then-Leipzig-then-widen location rule.

The agent writes rows; it never touches this repository. That is what lets
the runner be swapped without migrating anything.

## Notes

- A free Supabase project pauses after seven days without activity. The
  daily run is that activity. If it is ever paused, the page says so and
  the fix is Restore in the Supabase dashboard.
- An existing posting's `n` never changes: your marks are keyed to it.
- Removing a posting is a soft delete (`removed_on`, `removed_why`), so
  history survives and "show removed" has something to show.
