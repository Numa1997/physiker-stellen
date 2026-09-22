# Physiker Stellen — daily check + search

You maintain Numa's physicist job list. It lives in a Supabase Postgres
database (project ref `xphyzmxaliamksjwxoue`, region eu-central-1) and is
rendered by a static page on GitHub Pages.

This runs in the cloud at 06:30 Berlin time with nobody watching. Do not
ask questions — apply the rules below, decide, and record what you did.

**THE GOAL:** at least 10 live qualifying postings in EACH of the ten
categories. This is a long job — do not stop searching early to save time.
A run that adds 1 posting while categories sit under 10 is a failed run
unless the journal proves the search was exhaustive (see `evaluated` in
STEP 5).

**THE JOURNAL IS THE MONITOR.** Numa cannot see inside this run. What he
can see is the page, and the page re-reads the `journal` table every 60
seconds. So open today's journal row early (STEP 3b) and keep updating it
(STEP 4). Unlike the old artifact, a checkpoint here is a single UPDATE
and costs milliseconds — so checkpoint *often*, not sparingly.

---

## STEP 0 — TIME GUARD

This task is scheduled twice so that one run lands on 06:30 Berlin in both
summer and winter time. First run `TZ=Europe/Berlin date +%H`. If the
result is not `06` and this run's message does not contain the word
**FORCE**: stop immediately — read nothing, change nothing, write nothing
— and report one line: `Skipped: not 06:xx in Berlin.`

## STEP 0b — CHECK THE WRITE PATH

Call the Supabase connector's `execute_sql` against project
`xphyzmxaliamksjwxoue` with:

```sql
select count(*) from public.postings where removed_on is null;
```

- **If it succeeds** → Supabase is the write path. Continue from STEP 1.
  This is the normal case.
- **If the Supabase tools are not in your toolset, or the call errors** →
  do not abandon the run. Fall back to the old artifact at
  `https://claude.ai/artifact/Mqu3unj2Ze572b6qMUKwZb`, follow the
  pre-migration mechanics, and make the FIRST LINE of your final report:
  `SUPABASE UNREACHABLE — fell back to the artifact. Reason: <exact error>`
  That line is the signal that the migration is not finished.

## STEP 1 — LOAD

```sql
select * from public.postings where removed_on is null order by sort_order;
select key, value from public.meta;
select id, run_date, status, note from public.journal
 order by run_date desc, id desc limit 5;
```

If the most recent journal row still has `status = 'in_progress'` — a
previous run died before finishing — mark it so Numa sees it on the page,
and carry on:

```sql
update public.journal set status = 'did_not_finish'
 where id = <that id> and status = 'in_progress';
```

No rollback copy is needed any more. Rows are written one at a time and
committed as they go; there is no whole-file republish to lose.

## STEP 2 — CHECK EVERY POSTING ALREADY IN THE LIST

Fetch each posting's url with a real browser User-Agent and
Accept-Language de-DE. Retry twice on network error.

Judge the CONTENT of the page, not the HTTP status code:

- a) the posting title still appears in `<title>`, og:title, or the body
  (stored titles may be English translations of German postings — the
  German original is in `title_original`)
- b) physics / natural-science wording is still in the requirements
- c) no "nicht mehr verfügbar" / "no longer available" / "position filled"
  / "abgelaufen" marker
- d) no newly added mandatory Master, PhD, or senior-only wording

Classify each as LIVE, DEAD, or TRANSIENT (network failed all 3 tries).

## STEP 3 — REMOVE

Drop every DEAD posting and every posting that now breaks a rule.
**NEVER drop a TRANSIENT one** — keep it, note it, re-check tomorrow.
Postings already in the list are never removed for their location.

Removal is a soft delete. The row stays; history is preserved:

```sql
update public.postings
   set removed_on = current_date, removed_why = '<why, in one sentence>'
 where n = <n>;
```

**NEVER change an existing `n`.** Numa's marks are keyed `j<n>` / `c<n>`,
so a reassigned id silently reattaches his notes to the wrong job. New
postings get `n = (select max(n) + 1 from public.postings)`.

## STEP 3b — OPEN TODAY'S JOURNAL ROW

Do this *before* searching, so the page shows a run in progress:

```sql
insert into public.journal (run_date, started_at, status, checked, live,
                            transient, note)
values (current_date, now(), 'in_progress', <checked>, <live>, <transient>,
        'In progress: validation done, searching …')
returning id;
```

Keep that `id`. Everything below updates **this one row** — never insert a
second row for the same run. Record each removal from STEP 3:

```sql
insert into public.journal_changes (journal_id, direction, posting_n,
                                    title, company, why)
values (<journal_id>, 'out', <n>, '<title>', '<company>', '<why>');
```

## STEP 4 — SEARCH FOR NEW POSTINGS, EVERY DAY

**CATEGORIES** — target at least 10 live postings in each:

- data analyst
- computational scientist
- numerical methods
- systems engineer
- any title containing "Physiker"
- team lead / team management
- project management
- energy sector
- physics content & education  *(NEW BLOCK, rules below)*
- AI training & evals  *(NEW BLOCK, rules below)*

Every posting gets `target_category` = one of these ten names, exactly as
written above. Give existing postings that lack it one too. Count progress
toward 10 by `target_category`.

**CHECKPOINTS DURING THE SEARCH.** After every 3 postings added, and
whenever you finish a category's Berlin + Leipzig search:

```sql
update public.journal
   set per_category = '<json>'::jsonb,
       evaluated    = '<json>'::jsonb,
       note         = 'In progress: <which categories are done> …'
 where id = <journal_id>;
```

The note keeps its `In progress:` prefix until STEP 5. This costs
milliseconds — there is no reason to batch it.

**LOCATION RULE** for the eight original categories — strict:
Search BERLIN and LEIPZIG first, and add every qualifying posting there.
Only if a category still has fewer than 10 live postings after exhausting
Berlin and Leipzig may you widen that category to the rest of Germany —
and only that category, only to fill the gap up to 10. Record in
`journal.widened` whenever you widened, and for which category.

**HOW TO FIND POSTINGS** (discovery is not the same as linking):

- The fixed portal list alone is far too small — most of those employers
  have 0–3 openings. You MUST also discover broadly:
  - Web search, German and English, for every category under 10, e.g.
    "Physiker Berlin Stellenangebot", "Data Analyst Physik Leipzig",
    "Systemingenieur Naturwissenschaften Berlin", "Projektmanager Physik
    Berlin", "Energiewirtschaft Physiker Leipzig", "Numerische Simulation
    Berufseinsteiger Berlin", "Trainee Physik Leipzig", "Teamleiter
    Quereinsteiger Physik Berlin".
  - Aggregators (StepStone, Indeed, LinkedIn, XING, Arbeitsagentur,
    jobvector, kimeta …) MAY be used to DISCOVER candidates. Then find the
    same posting on the employer's own site or own applicant portal and
    link THAT. A posting you cannot find on the employer's own site/portal
    is skipped.
  - Large Berlin/Leipzig employers that hire physicists — check their
    career portals, e.g. energy: 50Hertz, Vattenfall, Stromnetz Berlin,
    GASAG, Siemens Energy, VNG, EEX, Leipziger Gruppe / Stadtwerke
    Leipzig, enviaM; data/consulting: d-fine, KPMG, PwC, Deloitte,
    Accenture, Capgemini; research & systems: DLR, BAM, PTB, HZB,
    Fraunhofer HHI / IZM / FOKUS / IMW, UFZ, TROPOS; industry: Siemens,
    ASML Berlin, BMW Leipzig, Porsche Leipzig, DHL Hub Leipzig, Bosch.
    These are starting points, not a limit.
  - If a portal does not render (JavaScript-heavy Workday /
    SuccessFactors / 403), do not give up on that employer: use a web
    search restricted to that domain (`site:…`) or the portal's job search
    URL with query parameters.
- Minimum effort before a category counts as "exhausted" for Berlin or
  Leipzig: at least 6 distinct searches for that category in that city
  (German and English titles), and every plausible result opened.
- Also search the fixed portals, and every portal in `job_boards`:
  jobs.ezag.com · karriere.analytical-software.de · picoquant.com/careers
  · jobs.fraunhofer.de (query: Physiker) ·
  zuse-institut-berlin.jobs.personio.de · dive-solutions.de/career ·
  empit.jobs.personio.com · ifg-leipzig.com · wias-berlin.de/jobs ·
  cfx-berlin.de/cfx-berlin/stellenangebote ·
  ianus-simulation.de/stellenangebote · verder-scientific.com ·
  salzgitter-mannesmann-forschung.de · tdk-electronics.tdk.com ·
  arkentec.de · jobs.tu-berlin.de/stellenausschreibungen

### NEW BLOCK — physics content / education / AI training (added 2026-09-17)

Two target categories: **physics content & education** (editorial,
learning content, tutoring, publishing) and **AI training & evals** (AI
trainer, subject-matter expert for AI, evals, human data, benchmarks).
Everything below applies to these two only; the eight original categories
keep their own rules.

- **CITIES**, in this order: Berlin, Leipzig, then Braunschweig, then
  remote-DE (remote positions open to residents of Germany). Search all
  four every day; the widening rule above does not apply here.
  `location_group`: berlin / leipzig / de (Braunschweig and remote both
  `de`); `city` "Braunschweig" or "Remote (DE)".
- **TITLES to search (DE):** Redakteur Physik, Redakteurin Physik,
  Redaktion Naturwissenschaften, Fachredakteur MINT, Content Creator
  Physik, Aufgabenautor Physik, Aufgabenentwickler, Lerninhalte Physik,
  Learning Content Engineer, Instructional Designer MINT, KI-Tutor Physik,
  Volontariat Naturwissenschaften, Absolventenpraktikum
  Naturwissenschaften.
  **(EN):** Physics Content Specialist, STEM Content Developer, Problem
  Writer Physics, AI Trainer Physics, Physics Subject Matter Expert,
  Research Engineer Evaluations, Evals Engineer, Human Data, Benchmark
  Engineer.
- **SOURCES to open directly every day:**
  westermann-gruppe.softgarden.io/de/vacancies ·
  cornelsen.de/karriere/stellenangebote · ernst-klett-verlag.de/karriere ·
  jobs.sofatutor.com · jobs.ashbyhq.com/stackfuel ·
  jobs.ashbyhq.com/anyone-ai · ellamind.com (careers page), plus `site:`
  searches on jobs.ashbyhq.com, job-boards.greenhouse.io, jobs.lever.co,
  and XING (XING for discovery only — never as the link).
- **LEVEL rule for this block** (looser than the original one): drop a
  posting that REQUIRES a PhD unless the text says "or equivalent" / "oder
  vergleichbar"; a Master requirement is allowed here. Drop Werkstudent /
  student jobs. Volontariat and Absolventenpraktikum ARE allowed here,
  tagged TRAINEE.
- **EMPLOYMENT tag**, required for every posting in this block, column
  `employment`: `EMPLOYEE` (Festanstellung / Vollzeit / unbefristet /
  befristet), `CONTRACT` (Werkvertrag / freelance / Freie Mitarbeit / per
  hour) or `TRAINEE` (Volontariat / Absolventenpraktikum). The page shows
  this tag on the card.
- **ORDER:** within this block, give EMPLOYEE postings a lower
  `sort_order` than TRAINEE, and TRAINEE lower than CONTRACT (the page
  lists by `sort_order`).
- The other three rules (LINK, ROLE, BACKGROUND) apply unchanged. Ashby,
  Greenhouse and Lever pages count as the employer's own applicant portal.
- Section code for the page: `category` = `content`, `category_label` =
  `Content / AI Training`.

### Mapping a category to the page's section code

Store `category` as:

| target_category | category |
|---|---|
| data analyst | `data` |
| computational scientist | `sim` |
| numerical methods | `sim` |
| systems engineer | `sys` |
| any title containing "Physiker" | whichever of `sim` / `sys` / `data` fits the work, else `sys` |
| team lead / team management | `lead` |
| project management | `energy` (the page's "Field/Dev/PM" section) |
| energy sector | `energy` |
| physics content & education | `content` |
| AI training & evals | `content` |

Set `category_label` from `meta.categories` and `location_label` from
`meta.locations`, as the existing postings have.

### A POSTING QUALIFIES ONLY IF ALL FOUR HOLD

1. **LINK.** The url is the posting's own page on the employer's website
   or the employer's own applicant portal (Personio, softgarden,
   SmartRecruiters, Workday, employer-owned SuccessFactors, Ashby,
   Greenhouse, Lever). NEVER an aggregator link: StepStone, XING, kimeta,
   sercanto, jobijoba, rekruter, karriere.at, jobvector, Indeed,
   Glassdoor, LinkedIn, arbeitsagentur.de detail pages, heise jobs.
2. **ROLE.** It belongs to one of the ten categories above. Pure software
   development (backend, frontend, full-stack), IT consulting, and
   hardware / electronics development roles belong to NO category, even
   when the degree line names physics.
3. **BACKGROUND.** The requirement text explicitly admits a physics or
   natural-science background (Physik / Naturwissenschaften / physics /
   natural science / "Quereinsteiger Physiker"). "MINT" and "STEM" name
   the natural sciences by definition and count. Wording that demands an
   engineering degree and nothing else disqualifies it.
4. **LEVEL** (eight original categories; the NEW BLOCK has its own rule
   above). Entry-level to mid-level, open to a BSc physicist. **Numa has
   prior team-lead experience** — this changes the bar for one category
   only, below.
   - ALLOWED: trainee, graduate programme, junior, Berufseinsteiger,
     Quereinsteiger, direct entry.
   - EXCLUDED: student jobs, Werkstudent, Praktikum, internship,
     Abschlussarbeit / thesis positions, PhD or doctoral positions,
     postdoc, professorships; senior-only roles (Senior, Lead Senior,
     Principal, Head of, Director) and anything demanding many years of
     experience; any posting whose stated minimum is a Master or a
     doctorate.
   - "Promotion wünschenswert / von Vorteil / idealerweise" is fine — that
     is a bonus, not a requirement. "erforderlich", "Voraussetzung",
     "Master's or PhD required" are not.
   - If a posting is obviously not aimed at a BSc physicist starting out,
     leave it out even if it technically passes the wording test.
   - **Exception — "team lead / team management" only:** do NOT exclude a
     posting for asking "Führungserfahrung" / "mehrjährige
     Führungserfahrung" / prior people-management experience. That is the
     job description for this category, not a seniority bar, and Numa has
     it. Still exclude on the other grounds above (Master/PhD as the
     stated *degree* minimum, Director/Head-of/VP-level scope, or years of
     experience that are clearly about deep technical seniority rather
     than team leadership). A posting asking for "erste
     Führungserfahrung" or several years of leading a small team is
     exactly what this category is for — add it.

Open the employer's page and read the requirements before adding anything.
Never add from a search-result snippet. Skip anything already in the list
(same url, or same company + title — check against **all** rows, including
`removed_on is not null`, so a posting struck off yesterday is not
re-added today).

Insert a new posting like this:

```sql
insert into public.postings
  (n, title, title_original, company, city, location_group, location_label,
   category, category_label, target_category, employment, starred, url,
   eligibility_quote_de, eligibility_en, skills, salary, note,
   direct_employer_link, added_on, sort_order)
values
  ((select max(n) + 1 from public.postings), '<English title>',
   '<German original>', '<company>', '<city>', '<berlin|leipzig|de>',
   '<label>', '<section code>', '<label>', '<one of the ten>',
   '<EMPLOYEE|CONTRACT|TRAINEE or null>', false, '<url>',
   '<the exact requirement sentence you verified>', '<short English gloss>',
   array['<skill>','<skill>'], '<salary or null>', '<your note>',
   true, current_date, (select coalesce(max(sort_order), 0) + 1 from public.postings))
returning n;
```

`eligibility_quote_de` is the field the page displays as proof — it must be
the exact sentence from the posting, not a paraphrase. Then record it:

```sql
insert into public.journal_changes (journal_id, direction, posting_n,
                                    title, company, why)
values (<journal_id>, 'in', <the returned n>, '<title_original>',
        '<company>', '<the requirement sentence that qualified it>');
```

Use `title_original` (the German wording) in `journal_changes.title`, to
stay consistent with the historical entries.

## STEP 5 — FINISH THE DAILY LOG

Finalise today's row — the one from STEP 3b, never a second one:

```sql
update public.journal
   set status       = 'done',
       finished_at  = now(),
       checked      = <n>,
       live         = <n>,
       transient    = <n>,
       per_category = '{"<target_category>": <live count>, …}'::jsonb,
       evaluated    = '{"<target_category>": <pages you opened today>, …}'::jsonb,
       widened      = '["<category searched outside Berlin/Leipzig, and why>"]'::jsonb,
       note         = '<what was searched, and the main reasons candidates were rejected>'
 where id = <journal_id>;
```

The final note must NOT begin with "In progress". If nothing came in and
nothing went out, keep the row with the counts and say so in the note.
**Never skip a day.**

Then refresh the counters the page shows:

```sql
update public.meta set value = to_jsonb(current_date::text) where key = 'updated';
update public.meta
   set value = jsonb_set(value, '{jobs}',
       to_jsonb((select count(*) from public.postings where removed_on is null)))
 where key = 'counts';
```

## STEP 6 — CONFIRM

```sql
select count(*) filter (where removed_on is null) as live,
       count(*) filter (where removed_on is not null) as removed
  from public.postings;
select status, note from public.journal where id = <journal_id>;
```

Confirm the live count matches what you wrote and that `status` is `done`.
There is no publish step: the rows are live the moment they are committed,
and the page picks them up on its next poll.

## STEP 7 — REPORT

3–6 lines: checked / live / removed / added counts, live count per
`target_category`, the names of the postings that came in and went out, any
category widened beyond Berlin and Leipzig, and whether the journal row
closed cleanly.

If STEP 0b fell back to the artifact, that warning line comes first.
