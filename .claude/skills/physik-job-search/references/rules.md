# Eligibility rules, with the wording that passed and the wording that failed

Numa: BSc Physics (computational and theoretical), Leipzig, with prior team-lead experience. The list exists so that he can apply;
every rule below protects his time. Quotes are from real ads read on 8–9 October 2026.

## The ten categories (keys as in the data)

| key | name | what belongs there |
|---|---|---|
| `content` | Content creation (not school teaching) | editorial, learning content, technical writing, science communication, textbook editing; anything that is writing or explaining physics; **not** teaching at a school |
| `ai` | AI training on physics & maths | training, tutoring, grading or evaluating AI models on physics or maths problems (German-language maths, physics, STEM, science and LaTeX-maths roles passed); not language-only tutoring, not data labelling without physics |
| `data` | Data analyst | data analysis, data science, ML engineering where physics is named |
| `computational` | Computational scientist | simulation, modelling, scientific computing, quantitative model development |
| `numerical` | Numerical methods | numerical modelling, FEM, solvers, quantitative consulting (KPMG "Mathematiker/Physiker für die Unternehmensberatung" sits here) |
| `systems` | Systems engineer | systems, test, measurement, service engineering of instruments |
| `physiker` | "Physiker" in the job title | the title itself names Physiker / Physikerin / Naturwissenschaftler |
| `pm` | Project management | project and technical project management, consulting that grows into it |
| `production` | Production supervisor | production lead, shift lead, Fertigungsleiter, Herstellungsleiter |
| `energy` | Energy sector | utilities, grid, solar, wind, energy trading and forecasting |

One category per posting; when two fit, take the one that names the work in the title.

## The six conditions

### 1. The ad names physics or the natural sciences

Passed:
- "Erfolgreich abgeschlossenes Studium (ggf. Promotion) in Mathematik, Informatik, **Physik**, VWL, Wirtschaftswissenschaften oder vergleichbarem quantitativem Studium" (S Rating)
- "Abgeschlossenes **naturwissenschaftliches**, technisches oder ingenieurwissenschaftliches Studium (z. B. Pharmatechnik, Verfahrenstechnik, Chemieingenieurwesen, Maschinenbau) oder eine vergleichbare Qualifikation (z. B. Meister)" (Adragos Pharma)
- "abgeschlossenes Studium im technischen Bereich (bspw. Verfahrenstechnik, Maschinenbau, Werkstofftechnik, **Physik** o. ä.)" (Saint-Gobain)
- "Mit exzellenten Noten abgeschlossenes Studium der Informatik, Wirtschaftsinformatik, Mathematik, **Natur-** oder der Wirtschaftswissenschaften" (Analysys Mason)
- "Erfolgreich abgeschlossene Technikerausbildung oder Studium der Fachrichtungen Mechatronik, …, **Physik/physikalische Technik**" (Werth)
- "A bachelor's or master's degree in a **STEM** discipline is ideal" (Meridial STEM); MINT and STEM name the natural sciences and count.

Failed:
- "Erfolgreich abgeschlossenes Studium in Technischer Redaktion / Kommunikation oder eine technische Berufsausbildung" (EDAG): no physics, no natural sciences.
- "Abgeschlossenes Studium im Bereich Technische Redaktion, Maschinenbau oder vergleichbare Qualifikation" (FERCHAU technical writer).
- "Industrie-Meister Chemie" / "Chemikant" (UPM Leuna, OPPM Bitterfeld shift leads): no degree named at all.
- Ads for a "Redakteur Biologie/Chemie" that name only those subjects (Klett).
- "Deutsch, Englisch" as the only requirement (recruiter ads): no field named.
- Maths-only wording outside AI training ("Master's or PhD in Mathematics or a closely related field", Anyone AI maths): maths alone is not physics; inside AI training, "closely related quantitative field" was accepted as covering physics.

The exact sentence goes into `eligibility_quote_de`, verbatim, German when the ad is German. It is what Numa reads as proof.

### 2. A Bachelor is enough

Passed: "ggf. Promotion", "Promotion wünschenswert / von Vorteil / idealerweise", "A master's or PhD … is ideal" (Meridial maths and physics: Numa accepted "ideal" as a wish, and the application form asked for no degree), "Bachelor's, Master's, or PhD in Physics" (Anyone AI physics).

Failed: "Master's or PhD in Mathematics … required" (Anyone AI maths), "PhD" as the stated minimum (Mercor physics standing listings; edubily; Meridial Pure Mathematics "in-progress or freshly earned PhD"), a Master as the stated minimum (De Gruyter acquisitions editor, FBH project manager, CHECK24, XITASO).

### 3. Not a student, intern, thesis, PhD or postdoc position

Werkstudent, Praktikum, Pharmaziepraktikant, Absolventenpraktikum, Abschlussarbeit, Promotionsstelle, PhD student, Postdoc: out. (Volontariat and trainee programmes are allowed in content.)

### 4. Not senior-only, except in Production supervisor

Out: Senior, Principal, Head of, Director; "mehrjährige Berufserfahrung" or "min. 5 Jahre" as a requirement (Adragos Produkttransfer: natural sciences named, 5 years required, out); "Führung eines Teams von fünf oder mehr" in PM (conet).

Exception, Numa's instruction: in **Production supervisor** ignore demands for experience and leadership ("Führungserfahrung im Mehrschichtbetrieb", "mehrjährige Erfahrung in der Produktion"). He has that experience. The degree conditions still apply: an ad that names only a Meister or an engineering degree stays out.

### 5. Category fit

- Content: anything that creates content, except teaching at a school (Seiteneinstieg Lehrkraft, Oberschule, Gymnasium: out). Textbook editing (Westermann, Cornelsen) is writing, in. Science-news editing with no field named: out on condition 1, not on category.
- AI training: the work must be about physics or maths problems. Passed: Meridial Mathematics / Science / STEM / Physics / LaTeX specialists (German); Anyone AI physics. Failed: language-only tutoring (xAI German tutor, Meridial German Language Specialist), audio evaluation, translation, data annotation with no physics, pure maths with Lean 4 (maths-only and PhD).
- Pure software development (backend, frontend, full-stack) and IT consulting belong to no category even when the degree line names physics. Data, ML and simulation engineering do (data, computational, or the sector).

### 6. Place

- `berlin`: Berlin and its immediate surroundings (Teltow, Oranienburg count).
- `leipzig`: within about 40 km of Leipzig: Halle, Bitterfeld-Wolfen, Thalheim, Schkopau, Leuna, Brehna, Eilenburg, Markranstädt, Zwenkau. Torgau (47 km) was accepted with the distance written in the city field and the note.
- `de`: everything else in Germany, and remote.
- Remote postings may be placed under Berlin or Leipzig "to spread the remote AI jobs" when the note says so; the city field then starts with "Remote".
- A posting listed for another country is fine when the application form accepts residents of any country; write that in the city field ("Remote (listed for the USA; application form accepts residents of any country)").

## Links

The employer's own page or applicant portal first (Personio, softgarden, SmartRecruiters, Workday, SuccessFactors, Ashby, Greenhouse, Lever count as the employer's own). When the employer has none, the job-board ad (Stepstone, jobvector, StudySmarter talents, jooble target) is allowed and the note says "link is the job-board ad under the relaxed rule". Recruiter ads (Hays, FERCHAU, expertplace) are allowed when the ad itself names physics or natural sciences. Never link XING, jobijoba, sercanto, unicum or meinestadt copies: they answer 410 within days.

## Duplicates

Check against every row, removed rows included. One ad advertised for several offices is one posting (keep the office nearest Numa). The same posting on two sites is one posting (keep the employer's link). A posting struck off yesterday is not re-added today unless the ad changed.

## Settled questions (do not ask again)

Remote is fine. "Naturwissenschaften" is fine. Job-board and recruiter links are fine with a label. Production supervisor ignores experience demands. Content excludes only school teaching. AI training means physics and maths problems. The aim is three open postings per category and area.
