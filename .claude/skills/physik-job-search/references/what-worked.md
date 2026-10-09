# What worked and what did not: the measurements behind the ladder

Source: the transcript of the session of 8–9 October 2026 (932 tool calls), mined by script: for each posting added, the first
tool call whose result contained the posting's URL ("found by") and the call that fetched the URL ("verified by"); for each kind
of call, how many ran, how many errored, and which failure markers the results carried.

## Calls by kind

| kind | calls | errors | postings first surfaced | postings verified | note |
|---|---|---|---|---|---|
| Exa web search | 151 | 0 | 17 (+2 from saved results) | 0 | the only search that paid, and only with sharp queries |
| curl of employer pages (fetch.sh) | 116 | 3 | 9 | 11 | 15 × 404, 7 × 403, 7 closed markers, 4 × 410 |
| Personio (XML, then HTML) | 34 | 0 | 5 | 13 | XML 404 from midday on; HTML list works |
| Firecrawl scrape, JSON extraction | 31 | 2 | 3 | 3 | 23 proxy tunnel errors (retry works); 6 × 410; one hallucinated list |
| Greenhouse boards API | 21 | 0 | 6 | 5 | one call lists a whole board |
| built-in WebSearch | 19 | 0 | 2 | 0 | |
| Firecrawl search | 15 | 2 | 1 | 0 | |
| Indeed MCP | 14 | 0 | 0 | 0 | useless here |
| Workday CXS API | 11 | 0 | 2 | 3 | |
| WebFetch tool | 10 | 10 | 0 | 0 | tunnel error every time |
| SmartRecruiters API | 10 | 0 | 0 | 5 | verification of Enpal, BearingPoint, FERCHAU, Vattenfall |
| Arbeitsagentur API | 6 | 2 | 0 | 0 | 403 |
| Workable | 6 | 0 | 0 | 1 | 1015 rate limit |
| softgarden | 5 | 0 | 1 | 0 | |
| SuccessFactors | 5 | 0 | 0 | 0 | |
| Ashby API | 3 | 0 | 1 | 0 | |
| Exa fetch, Firecrawl plain scrape | 6 | 0 | 0 | 0 | |

62 postings were added (4 removed again the same day: two duplicates, two closed). About 11 of the 62 were not discoveries but
carried over from an earlier list; of the ~51 genuine discoveries: 19 by sharp web search, 15 by reading a board whole, 9 by reading
an employer page, 4 by job-board extraction, 2 by the built-in search, 2 by other routes.

## Search queries: 185 ran, 15 hit (8 %)

Every hit named an employer, a role phrase in the employer's own words, or an exact German title with the degree words:

- `Senacor "Physiker/ Mathematiker/ Naturwissenschaftler als Berater" jobs.senacor.com Berlin` → 4 postings
- `Teamleiter Produktion oder Schichtleiter (m/w/d) abgeschlossenes naturwissenschaftliches Studium Bachelor Pharma Herstellung Berlin oder Bitterfeld` → 2
- `Qcells Thalheim "HQP" "QS 208" OR "Simulation & Modelling Expert" perovskite tandem careers q-cells` → 2
- `Berlin-Chemie Teamleitung Herstellung Pharmabereichsleitung Solidaherstellung Stellenangebot` → 1
- `Westermann Redakteur Physik Berlin Gymnasium karriere` → 1
- `jobs.kpmg.de Leipzig Absolvent Datenanalyst Mathematiker Physiker Unternehmensberatung job` → 1
- `"Mathematiker, Physiker, Informatiker, Modellentwickler" Kreditrisiko Sparkassen Rating und Risikosysteme Berlin` → 1
- `Schichtingenieur oder Produktionsingenieur mit Teamverantwortung (m/w/d) Halbleiterfertigung Studium Physik Absolventen` → 1 (ZEISS)
- `AI tutor mathematics expert remote Germany German-speaking bachelor degree mathematics physics train AI models math reasoning job` → 1 (Meridial)
- `Job posting Berlin: AI trainer, AI tutor, LLM evaluation … requirements mention Physik or Naturwissenschaften` → 1 (Anyone AI)
- `Stellenanzeige Leipzig, Halle oder Bitterfeld: Systemingenieur, Entwicklungsingenieur, Applikationsingenieur, Test Engineer oder Messtechnik-Ingenieur …` → 1 (Jena-Optronik)
- `Saint-Gobain "Fertigungsleiter (m/w/d) Glasbeschichtung"` (Firecrawl search) → 1
- `Mercor STEM Expert Physics Chemistry Mathematics Biology Germany remote` → 1 (closed within hours)

Queries of these shapes found nothing in 170 attempts: `Stellenangebot Leipzig Energie "Physik" Bachelor Analyst OR Ingenieur 2026`;
`Leipzig Junior Data Scientist OR Data Analyst … "Physik" Studium 2026 -Werkstudent -Senior`; `"Physiker" (m/w/d) Berlin
Stellenangebot 2026 site:jobs.personio.de OR site:softgarden.io …`; `Produktionsleiter OR Schichtleiter OR … Leipzig OR Halle OR
Bitterfeld "Naturwissenschaften"`; `Technischer Redakteur OR Wissenschaftsredakteur … Leipzig Physik Naturwissenschaften
Stellenangebot`. Lesson: the search engine does not know which ads admit physicists; it knows employers and titles. Decide the
employer first.

## The lessons, in order of cost saved

1. **Read boards whole before searching.** Meridial's one Greenhouse board held 8 of the AI-training postings; one API call lists 830 jobs with their text.
2. **A search query must name an employer or an exact title.** Generic queries cost 170 calls for nothing.
3. **The cheapest reader first:** `fetch.sh` (curl) costs nothing; Firecrawl costs credits and fails on the proxy two times in three; WebFetch never worked.
4. **Listing location is not eligibility.** Meridial roles "listed for the USA" accept any country on the form; the form, not the location line, decides.
5. **Freelance AI boards close fast.** Mercor and Outlier listings died within the day; check them again before Numa applies.
6. **One ad, several offices, one posting.** BearingPoint and Vattenfall were added twice.
7. **Never declare a lead dead from memory.** The expertplace ad had a live copy when it was reported expired; fetch first.
8. **Job-board extraction can hallucinate.** A Stepstone page that did not render yielded five invented jobs; every extracted URL must be opened.
9. **Personio changed under us.** The XML feed died during the session; the HTML list still works. When a known route fails, try the other representation before giving up on the employer.
10. **Hard cells are hard for a reason, and the reason belongs in the report:** Leipzig production supervisors ask for a Meister or Chemikant; Leipzig content jobs come through recruiters and expire; AI-training boards mostly require a Master or PhD. Each of these is a rule choice for Numa, stated as such.
11. **Copies die, employers move.** Aggregator copies of an ad (jobijoba, euni, jobrapido, the fox8/stevenagefc white-label boards) answer 410
    within weeks; they prove that a job existed, nothing more, and a search result naming them is not a live lead. When an employer's board vanishes
    (SPECS left Personio on 9 October 2026), scrape the employer's Stepstone list through Firecrawl in markdown
    (`https://www.stepstone.de/jobs/<title>/in-<city>?q=<Employer>` lists every current Stepstone ad of that employer, with dates) and the employer's
    own portal for the truth: the SPECS portal still listed a Technischer Redakteur that no job board carried any more, which filled content/Berlin.
    Read such pages as markdown, not JSON extraction, so nothing is invented.

## Where the postings came from, by category (62 added)

ai 13 (Meridial 8, Anyone AI 1, Mercor 1†, Outlier 1†, BearingPoint GenAI 1†, Vattenfall ML 1†) · energy 9 (Qcells 4, emsys 3, Enpal 2, Vattenfall 1) · production 8 (Adragos, Saint-Gobain, Berlin-Chemie, MKS, Bausch + Lomb, ZEISS, Menlo, heracle) · physiker 8 (Senacor 4, IfG, SPECS, MB Automation, EMPIT) · data 7 (Airbus, BearingPoint 2, HMS, Qcells, emsys, …) · pm 5 (WAVELABS, BearingPoint, Analysys Mason, Constructor Knowledge Labs, …) · computational 5 (S Rating 2, UIT, FERCHAU, Qcells) · numerical 4 (IfG 2, KPMG 2) · systems 4 (Werth, LayTec, Jena-Optronik, Qcells) · content 2 (Westermann, Cornelsen). († removed again the same day.)
