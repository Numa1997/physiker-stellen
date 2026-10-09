# Sources: what answered, what it holds, what is dead (checked 8–9 October 2026)

Read with `scripts/ats.py` (boards) and `scripts/fetch.sh` (pages). "Found" = postings on the list that came from there.

## A. Boards readable whole, one call (scripts/ats.py)

### Greenhouse (`ats.py greenhouse <board>`; API `boards-api.greenhouse.io/v1/boards/<board>/jobs?content=true`)

| board | who | holds | found |
|---|---|---|---|
| `agency` | **Meridial** (Invisible Technologies' expert network) | about 830 "Freelance AI Trainer Project" roles: Mathematics / Science / STEM / Physics / LaTeX specialists in many languages, several "Fluent in German" and "World Wide - Remote"; US- or India-listed ones accept any country on the form (`/jobs/<id>?questions=true` shows "What country are you currently a resident of?") | 8 (ai) |
| `invisibletechnologies` | Invisible's own board | corporate roles | 0 |
| `xai`, `scaleai`, `turing`, `toloka`, `labelbox`, `snorkelai` | AI-data companies | answered; nothing physics-specific for Germany at the time (xAI "AI Tutor German" is language-only) | 0 |
| `1komma5`, `enpal`, `tibber`, `octopusenergy`, `zolar`, `deepl`, `alephalpha` | energy / tech | answered; no qualifying physics role at the time | 0 |

### Ashby (`ats.py ashby <org>`; API `api.ashbyhq.com/posting-api/job-board/<org>`)

| org | who | holds | found |
|---|---|---|---|
| `anyone-ai` | Anyone AI | ~190 remote STEM-training roles by country; "Physics AI Training Expert (Germany)" accepts a Bachelor; the maths ones require a Master | 1 (ai) |
| `enpal` | Enpal | its live board (SmartRecruiters id `Enpal` is empty now) | verified 2 (energy) |
| `mercor` | Mercor | standing physics/maths expert listings; closed quickly ("no longer accepting applications"), most require a graduate degree | 1, then removed |
| `handshake`, `ostrom` | | answered; nothing qualifying | 0 |
| `1komma5`, `alignerr`, `cloover`, `datacurve`, `entrix`, `gridx`, `invisible`, `labelbox`, `micro1`, `mindrift`, `prolific`, `snorkelai`, `superannotate`, `tibber`, `toloka`, `turing` | | board exists but **empty** (`{"jobs": []}`): these companies do not hire through Ashby | 0 |
| `empit` | EMPIT GmbH, Berlin | `empit.jobs.personio.com` moved to Ashby: `ats.py ashby empit`? not verified; the posting was found via `api.ashbyhq.com` | 1 (physiker) |

### Workday (`ats.py workday <host>/<tenant>/<site>`)

| host/tenant/site | who | found |
|---|---|---|
| `ag.wd3.myworkdayjobs.com/ag/Airbus` | Airbus (Manching, Immenstaad, Donauwörth, Bremen) | 1 (data, de) |
| `zeissgroup.wd3.myworkdayjobs.com/zeissgroup/External` | ZEISS (Oberkochen, Jena) | 1 (production, de) |
| `mksinst.wd1.myworkdayjobs.com/mksinst/MKSCareersEMEA` | MKS Instruments (Berlin) | 1 (production, berlin) |
| `takeda.wd3.myworkdayjobs.com/takeda/External` | Takeda (Oranienburg) | 0 (roles senior) |
| `bayer.wd3.myworkdayjobs.com/bayer/Bayer_Careers`, `dow.wd1.myworkdayjobs.com/dow/ExternalCareers`, `sanofi.wd3.myworkdayjobs.com/sanofi/SanofiCareers`, `springernature.wd3.myworkdayjobs.com/springernature/SpringerNatureCareers`, `thermofisher.wd5.myworkdayjobs.com/thermofisher/ThermoFisherCareers` | answered; nothing qualifying then (Dow Schkopau/Böhlen/Leuna: only Ausbildung) | 0 |

### SmartRecruiters (`ats.py smartrecruiters <Company>`; API `api.smartrecruiters.com/v1/companies/<Company>/postings`)

`Vattenfall` (Berlin; 1 found, energy), `BoschGroup`, `SiemensEnergy`, `Statkraft`, `CHECK24` (Leipzig data roles need a Master), `AnalysysMason1` (the Leipzig consultant ad was found on jobvector), `AFRY`. `Enpal` is empty (board moved to Ashby). `SenacorTechnologiesAG` does not exist: Senacor uses `jobs.senacor.com` (plain pages; 4 found, physiker).

### Personio, HTML list (`ats.py personio <sub>`; `https://<sub>.jobs.personio.de/?language=de`, then `/job/<id>?language=de`)

The XML feed `/xml?language=de` answered 404 for every company on 8 October 2026; the HTML list works.

Leipzig area, boards that exist: `adragos-leipzig` (Adragos Pharma; the Produktionsleiter ad is **not** on it, only on StudySmarter/Jobijoba), `ifg-leipzig` (IfG, 3 found), `wavelabs` (WAVELABS, 1 found pm; the company page embeds this board; link the `/job/<id>` page, not the company page), `menlo-systems-gmbh` (Munich, 1 found), `eckert-ziegler`, `bestec`, `bscag`, `lumics`, `novaled`, `geomagic`, `sera`, `comlet`, `mdse`, `lbt`, `spinlab`, `optimax-energy-gmbh`, `sunfire`, `pva-tepla`, `heliatek`, `ecoplanet`, `first-sensor`, `e2m`, `eex-group`, `energy2market`, `energiekonzepte-deutschland`, `leipzig-international-school`.

**SPECS Surface Nano Analysis** (Berlin; physiker, systems, content) left Personio between 8 and 9 October 2026 (`specs-group` answers 404). Its
ads now live only on its SD Worx applicant portal, `https://sdworxsd2.pi-asp.de/bewerber-web/?companyEid=1L104&tenant=LAB14_HR10&lang=D#positions`,
a JavaScript page with no JSON endpoint (every guessed path returns a "P&I Status" page). Read the position list with
`mcp__Firecrawl__firecrawl_scrape` and a JSON schema (title, location); the ad texts are easiest to read from a job-board copy
(Stepstone, jobportal.de) found by searching the exact title with "SPECS". The portal URL is the link to give, with "open and choose the
title" in the note.

Known **not** to exist on Personio any more (404): `specs-group` (see above), `enpal`, `senacor`, `tilia-gmbh`, `fawz`, `picoquant` (uses picoquant.com/careers), `westermanngruppe` (softgarden), `23data`, `lecturio`, `enviria`, `lumenaza`, `enertrag`, `berlinerstadtwerke`, `reiner-lemoine-institut`, `node-energy`, `notus-energy`, `suena`, `thermondo`, `berliner-energieagentur`, `energiequelle`, `zolar`, `energy-brainpool`, `envelio`, `ostrom`, `gridx`, `cloover`, `ampere-cloud`, `adragos-pharma`, `adragos-pharma-leipzig`, `1komma5grad` (403/404).

### softgarden (`ats.py softgarden <sub>`; `https://<sub>.softgarden.io/de/vacancies`)

`westermann-gruppe` (Westermann publishers; the Redakteur Physik ad, 1 found content), `muehlbauer` (MB Automation, 1 found physiker), `idt-biologika` (Dessau; production roles senior).

### SuccessFactors (`ats.py successfactors <host> --loc <city>`)

`jobs.fraunhofer.de` answers; Leipzig and Halle institutes listed only student and unsolicited roles.

### Lever

`octoenergy` (Octopus Energy) answers; nothing for Germany then.

## B. Employer pages that are plain HTML (scripts/fetch.sh)

| page | who | category / city | found |
|---|---|---|---|
| `https://www.q-cells.de/jobs` and `/jobs-en/...` job pages | Hanwha Q CELLS, Thalheim (Bitterfeld-Wolfen) | energy, computational, systems, data / leipzig; many physics-named roles, some ask experience | 6 |
| `https://jobs.senacor.com/jobs/<id>` (list is JS; find ids by search) | Senacor | physiker / berlin, leipzig (remote-anywhere) | 4 |
| `https://www.emsys-renewables.com/de/ueber_uns/jobs/` | energy & meteo systems, Oldenburg | energy, data / de | 4 |
| `https://www.heracle.de/ueber-uns/jobs/` | heracle, Jena | production / de | 1 |
| `https://karriere.analytical-software.de/` | HMS Analytical Software, Berlin | data | 1 |
| `https://www.ifg-leipzig.com` (+ Personio) | IfG Leipzig | numerical, physiker | 3 |
| `https://www.bearingpoint.com/.../careers/` job pages | BearingPoint, Leipzig office | data, pm | 2 |
| `https://www.laytec.de` | LayTec, Berlin | systems | 1 |
| `https://www.jena-optronik.de` | Jena-Optronik | systems / de | 1 |
| `https://uit-gmbh.de` | UIT Dresden | computational / de | 1 |
| `https://karriere.berlin-chemie.de` | Berlin-Chemie | production / berlin | 1 |
| `https://careers.bauschlomb.com` | Bausch + Lomb Berlin | production / berlin | 1 |
| `https://jobs.kpmg.de` (direct posting links, not the search page) | KPMG | numerical / berlin, leipzig | 2 |
| `https://www.specs-group.com`, `https://www.picoquant.com/careers`, `https://www.iom-leipzig.de`, `https://www.ufz.de`, `https://www.dbfz.de`, `https://karriere.vng.de`, `https://jobs.enviam-gruppe.de`, `https://jobs.check24.de`, `https://karriere.idt-biologika.com/stellenmarkt/`, `https://jobs.dermapharm.com/de/`, `https://mindrift.ai`, `https://alignerr.com` | answered; read them when their category is short | 0 then |

## C. Job boards, for discovery only (Firecrawl JSON extraction)

- Stepstone: `https://www.stepstone.de/jobs/<term>/in-<city>` and company pages `https://www.stepstone.de/cmp/de/<company>/jobs`; render through `firecrawl_scrape` (stealth proxy); the real ad URLs look like `https://www.stepstone.de/stellenangebote--<slug>--<id>-inline.html`. Found: S Rating, Werth, Saint-Gobain (then linked on the employer's site), expertplace (then gone).
- jobvector: `https://www.jobvector.de/job/<slug>/` (direct curl answers 403; Firecrawl works). Found: Analysys Mason.
- jooble: `https://de.jooble.org/stellenangebote-<term>/<city>` lists ads with age and company; the `/desc/<id>` pages show the text and a redirect link to the source. Good for "is there anything new in Leipzig for this title".
- StudySmarter talents (`talents.studysmarter.de/companies/<company>/...`) and jobijoba keep full ad texts; StudySmarter pages stayed up, jobijoba's expire ("nicht mehr verfügbar") within weeks.

Extraction schema that worked: `{"jobs":[{"title","company","location","age","snippet","url"}]}` with the prompt "List the real job cards present". Trust an entry only after its `url` opens.

## D. Dead ends (do not spend calls)

| what | seen |
|---|---|
| `WebFetch` tool | `ERR_TUNNEL_CONNECTION_FAILED` 10 of 10 |
| Indeed MCP (`search_jobs`) | 14 calls, nothing usable |
| `rest.arbeitsagentur.de` jobsuche API, `arbeitsagentur.de` pages | 403 |
| `apply.workable.com` (Mindrift, Toloka) | 1015 rate limit after a few calls |
| Personio `/xml` feeds | 404 everywhere |
| XING job pages | 410 for every ad older than days |
| jobijoba, sercanto, unicum, meinestadt ad copies | 410 / 403 / redirect to a list |
| `karriere.50hertz.com`, `afry.com`, `senacor.com` (use jobs.senacor.com), `westermann.de` (use softgarden), `analysysmason.com`, `helmholtz-berlin.de` job page | 404 |
| `l.de`, `jobs.l.de`, `lvb.de`, `uni-leipzig.de`, `tilia.info`, `eex.com` (use `eex-group` Personio), `vng.de` (use `karriere.vng.de`), `regio.jobs`, `ecalia.*`, `magnetfabrik.de`, `vacom.de`, `berlinerstadtwerke.de`, `energybrainpool.com` | 403 to curl; some may answer a browser |
| Firecrawl JSON on a Stepstone page that did not render | invented five jobs with plausible titles and fake URLs; verify every URL |
| Firecrawl proxy | `ERR_TUNNEL_CONNECTION_FAILED` on 23 of 31 JSON scrapes; a retry usually works |

## E. Leads checked and closed on 8–9 October 2026, with the reason (so they are not re-opened without cause)

Mercor physics/maths standing listings (graduate degree; the bilingual German STEM one closed) · Outlier physics expert (page removed) · Anyone AI mathematics (Master) · Meridial Pure Mathematics (PhD, Lean 4) · xAI AI Tutor German (language only) · Alignerr (no physics/maths roles) · De Gruyter Content Editor STM (gone) and Acquisitions Editor (Master) · TROPOS science communication (communication degree) · LIKAT Rostock Wissenschaftskommunikation (deadline 30 Sep 2026 passed) · Remotetalent science-news editor (no field named) · faszinierend.de (2023 ad) · ETH Plattform Energie (closed) · Klett Redakteur Biologie/Chemie (bio/chem only) · edubily (PhD) · Hays Leipzig technical writer (gone) · expertplace Documentation Engineer Leipzig and Köln (gone) · EDAG and FERCHAU technical writers Leipzig/Eilenburg (no physics wording) · Hays technical writer Wittenberg (no field named) · UPM Leuna Schichtleiter (Industrie-Meister Chemie) · OPPM Bitterfeld (no degree) · Adragos other roles (Ausbildung; Produkttransfer 5 years) · mibe Brehna deputy head of manufacturing (gone) · Jobijoba production leads Leipzig/Halle/Wolfen/WEPA Leuna (gone) · Fraunhofer Leipzig/Halle (students only) · Dow Schkopau/Böhlen/Leuna (Ausbildung) · MS-Schramberg simulation (gone) · conet PM (senior) · FBH PM (Master) · CHECK24, XITASO (Master) · KPMG data analyst (3 years) · VNG, ONTRAS (experience) · Qcells "expert" roles (experience) · d-fine Consultant Berlin (not yet read) · "Entwicklungsingenieur Flussbatterien" Berlin (employer not identified).
