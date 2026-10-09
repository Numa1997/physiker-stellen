---
name: physik-job-search
description: Find, verify and record job postings for Numa's "Physik Radar" list (BSc physics, Leipzig; ten categories; Berlin, Leipzig area and rest of Germany; aim three open postings per cell). Use this skill whenever Numa asks to find jobs, postings, Stellen or links, to fill the gaps in a category or city, to check whether listed links are still alive, to re-check leads that were rejected before, or to update Physik Radar — even when the request is as short as "find me some relevant job links" or names only one category or city. It carries the eligibility rules, the measured ranking of search methods from the 8–9 October 2026 session, the catalogue of employer boards that answer, the dead ends to skip, the scripts that read applicant-tracking boards in one call, and the exact steps to publish to the live app and the repo page.
---

# Physik Job Search

The job: keep https://physik-radar-xvy59b.v2.appdeploy.ai/ (private, Numa's) and this repository's `index.html` filled with
postings that a BSc physicist can apply to, three per category and city, with the employer's own degree sentence quoted as proof.
Every claim in this skill was measured in one long session (932 tool calls, 62 postings added, 185 web searches of which 15 found
anything). The ranking below is that measurement, not a guess. `references/what-worked.md` holds the numbers.

Numa's standing instructions, which this skill obeys without asking again: no subagents (they burn tokens); skip any tool call that
would take over a minute and use another route; don't rely on one search service; never American units; batch the changes and deploy
once (the AppDeploy plan is paid per deploy); report honestly, including what was not found and why; and do not ask questions that the
rules below already answer.

## 1. Before anything: where are the gaps

```
python3 scripts/gaps.py backend/data/postings.json        # category × area table, cells under the aim
```

Work the gaps, not the whole market. One cell at a time. A cell is "exhausted" only after the ladder in section 3 has been walked for
it, with each step's result written down for the report.

## 2. What qualifies (short form; the full rules with examples are in `references/rules.md`)

A posting goes in only when all of these hold, read from the ad itself, never from a search snippet:

1. **Degree wording.** The ad names physics or the natural sciences (Physik, Naturwissenschaften, naturwissenschaftliches Studium,
   MINT, STEM, physics, natural sciences, "physicist"). An ad that names only engineering, informatics or economics is out, however
   good the job looks. Maths-only wording is out except in AI training, where physics counts as "a closely related quantitative field".
2. **A Bachelor is enough.** No stated minimum of Master or PhD. "Master oder PhD ideal / wünschenswert / von Vorteil" is fine: it is
   a wish, not a bar. "erforderlich / Voraussetzung / required" is a bar.
3. **Not a student, intern, thesis, PhD or postdoc position.** Werkstudent, Praktikum, Abschlussarbeit, Promotionsstelle: out.
4. **Not senior-only** (Senior, Principal, Head of, Director, "mehrjährige Berufserfahrung" as a requirement), **except** in
   *Production supervisor*, where experience and leadership demands are ignored on Numa's instruction (he has that experience).
5. **Category fit**, one category per posting: content creation anywhere except school teaching; AI training only where the work is
   training or grading AI on physics or maths problems (German-language maths, physics, STEM, science and LaTeX-maths roles passed;
   language-only tutoring and pure-maths-with-Lean did not); the other eight by the work described.
6. **Place.** Berlin; Leipzig area = within about 40 km (Halle, Bitterfeld-Wolfen, Schkopau, Leuna, Eilenburg count; Torgau at 47 km
   was accepted with a label); everything else, including remote, is "rest of Germany" unless the ad is placed under a city to spread
   remote postings, in which case the note says so.

Things Numa settled on 8 October 2026 so they need not be asked again: **remote is fine; "Naturwissenschaften" is fine**; recruiter
and job-board links are fine when the employer has no page of its own, labelled in the note; a posting listed for another country is
fine when its application form accepts residents of any country (check the Greenhouse form: `?questions=true` shows the country field).

## 3. The ladder: search in this order (measured yield, best first)

**Step 1. Boards you can read whole, one call each** (`scripts/ats.py`). An applicant-tracking board returns every open job with its
text; one call replaces fifty searches, and the output already shows the degree sentences. 15 of this session's postings came this
way, with zero false leads.

```
python3 scripts/ats.py greenhouse agency --title German          # Meridial: dozens of "Freelance AI Trainer" roles
python3 scripts/ats.py ashby anyone-ai --all
python3 scripts/ats.py workday zeissgroup.wd3.myworkdayjobs.com/zeissgroup/External --q Physik --loc "Jena|Oberkochen"
python3 scripts/ats.py smartrecruiters Vattenfall --title "Physik|Engineer|Analyst"
python3 scripts/ats.py personio ifg-leipzig --all                 # the HTML list; the XML feed is gone
python3 scripts/ats.py softgarden westermann-gruppe --title Redakt
```

The identifiers that answered are in `references/sources.md`, by category and city. Start with those; add a board the moment an
employer turns up on one (the host tells you: `job-boards.greenhouse.io/<board>`, `jobs.ashbyhq.com/<org>`,
`jobs.smartrecruiters.com/<Company>/…`, `<x>.myworkdayjobs.com/<site>`, `<x>.jobs.personio.de`, `<x>.softgarden.io`).

**Step 2. Employer career pages that are plain HTML** (`scripts/fetch.sh URL [chars]`: curl plus text extraction, with the HTTP
status on the first line). 9 postings came from pages like `q-cells.de/jobs`, `emsys-renewables.com/…/jobs/`,
`heracle.de/ueber-uns/jobs/`, `karriere.analytical-software.de`, `ifg-leipzig.com`. Cheap (no credits), so try it before any paid
scrape. If the page is empty or JavaScript-only, look for the board behind it (a Personio iframe, a Workday link) and go back to step 1.

**Step 3. Web search, only with a sharp query.** 185 queries ran; 15 hit. Every hit named either a specific employer with the role
("Senacor Physiker Mathematiker Naturwissenschaftler als Berater", "Berlin-Chemie Teamleitung Herstellung", "Westermann Redakteur
Physik", "KPMG Leipzig Absolvent Mathematiker Physiker Unternehmensberatung") or an exact German title phrase with the degree words
("Teamleiter Produktion oder Schichtleiter abgeschlossenes naturwissenschaftliches Studium Bachelor Pharma Herstellung Berlin"). Not
one generic query of the shape "Stellenangebot Leipzig Physik Bachelor Analyst 2026" found anything, in 170 tries. So: first decide
*which employers* in that category and city could want a physicist (the catalogue, your own knowledge of the region, the competitors
of employers already on the list), then search for *them*. Exa (`mcp__Exa__web_search_exa`) is the search that worked; Firecrawl search
hit once; the built-in WebSearch hit twice in 19. Budget: at most ten queries per cell before moving to step 4, and write each query
and its outcome into the report, so the next session does not repeat it.

**Step 4. Job-board listing pages, for discovery.** Stepstone, jobvector and jooble render through Firecrawl
(`mcp__Firecrawl__firecrawl_scrape` with `formats: ["json"]` and a schema of title/company/location/age/url), 3 postings came that
way. Two cautions: the extraction can invent jobs when the page did not render — trust only entries whose `url` you then open and
find; and the proxy fails about two calls in three with `ERR_TUNNEL_CONNECTION_FAILED`, which is not the page's fault: retry once.
For one employer's current ads (its board gone, a lead to confirm), scrape
`https://www.stepstone.de/jobs/<title>/in-<city>?q=<Employer>` as markdown: it lists every Stepstone ad of that employer with dates. Then link the employer's own page if it exists; if not, the board ad, labelled "job-board link" in the note. XING, jobijoba, sercanto,
unicum, meinestadt copies expire within days and answer 410/403: use them to learn that a job exists, never as the link.

**Step 5. Re-check rejected leads only when a rule changed.** Keep the rejected list with the real reason (section 6); when Numa
relaxes a rule, re-open exactly the leads that reason touched.

**Do not spend calls on:** the `WebFetch` tool (10 of 10 calls failed on the proxy), the Indeed MCP (14 calls, nothing usable),
`rest.arbeitsagentur.de` (403 always), `apply.workable.com` (rate-limited after a few calls), Personio's `/xml` feed (404 everywhere
since 8 October 2026), subagents.

## 4. Verify before recording

For each candidate, open the ad (fetch.sh, the board API, or Firecrawl as a last resort) and take, verbatim, the German sentence that
states the degree requirement. That sentence is the `eligibility_quote_de` field and what Numa sees as proof; a paraphrase is useless
to him. Then run the six conditions of section 2. For freelance AI-trainer boards also open the application form
(`boards-api.greenhouse.io/v1/boards/<board>/jobs/<id>?questions=true`) and read the country-of-residence question; "listed for the
USA" postings accepted any country that way. Check duplicates against **all** rows of `postings.json`, removed ones included: one ad
advertised for several offices is one posting (BearingPoint was added twice), and the same posting found on two sites is one posting
(Vattenfall was). `scripts/add_postings.py` refuses both.

Never report a lead as expired or dead without having fetched it: on 8 October a technical-writer ad was declared expired from memory
and turned out to have a live copy. `scripts/check_links.py` does the fetch and states DEAD, TRANSIENT (network trouble, keep it) or
ALIVE.

## 5. Record and publish

Write a batch file and apply it; the schema and every field's meaning are in `references/pipeline.md`:

```
python3 scripts/add_postings.py backend/data/postings.json batch.json --dry-run   # then without --dry-run
node backend/prepare-data.mjs && node --test backend/tests/*.test.mjs             # 9 tests must pass
python3 scripts/gaps.py backend/data/postings.json
```

Then one deploy to the live app (manifest → `upload_assets` → `PUT` → `deploy_app` → poll; the recipe with the exact arguments is in
`references/pipeline.md`), and the repo page's `DATA` line refreshed and checked with `python3 design/build.py --check`. Deploy once
per batch, not per posting.

The note on each posting says what the job is, where the ad was found, and any label the rules require: "Remote (worldwide)", "placed
under Leipzig to spread the remote AI jobs", "link is the job-board ad under the relaxed rule; the employer's own page was not found",
"Torgau, about 47 km from Leipzig". City strings carry the label too ("Remote (listed for the USA; application form accepts residents
of any country)").

## 6. Report

End with: the category × area table (`gaps.py` output); each posting added, one line, with the reason it qualifies; each lead
rejected or dropped, one line, with the *true* reason (Master required, student job, no physics wording, 410 gone, duplicate, senior
only), never "no good jobs found"; the queries and boards tried for each cell still short, so nobody repeats them; and the live URL
plus the deployed version. When a cell cannot be filled, say which rule stands in the way and what change would fill it, as a choice
for Numa, not as a question for him to answer first.

## 7. Bundled files

- `scripts/ats.py`: reads Greenhouse, Ashby, Lever, SmartRecruiters, Workday, Personio (HTML), softgarden and SuccessFactors boards.
- `scripts/fetch.sh`: page to text with the HTTP status; the cheapest way to read an ad.
- `scripts/check_links.py`: DEAD / TRANSIENT / ALIVE / WORDING for every open posting; `--remove-dead` writes the soft delete.
- `scripts/add_postings.py`: applies a batch with the duplicate, key and quote checks; `--dry-run` first.
- `scripts/gaps.py`: the table and the gaps.
- `scripts/sync_page.py`: puts the current postings and date into the repository's `index.html` (its `DATA` and `UPDATED` lines only).
- `references/rules.md`: the eligibility rules with accepted and rejected wording from real ads.
- `references/sources.md`: the catalogue of boards and employer pages that answered, by category and city, and the dead ends.
- `references/what-worked.md`: the measurements behind the ladder, the queries that hit, the lessons.
- `references/pipeline.md`: posting schema, the live-app deploy recipe, the repo page refresh, the tests.
