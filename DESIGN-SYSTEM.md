# Physik Radar design system

**The Fold:** two-level fold-out boards, one curve and one clock for everything that moves, colour that belongs to structure and never to content.

Written 9 October 2026 by Numa and Claude, from the code, a contrast audit and frame-by-frame measurements, all of which can be re-run (section 10). It describes two implementations of one design:

| | Where | Look and behaviour live in |
|---|---|---|
| **Live app** | AppDeploy app `physik-radar-xvy59b`, https://physik-radar-xvy59b.v2.appdeploy.ai/ (private, owner sign-in) | `design/live-app/page.js` and `design/live-app/board.css`: byte-for-byte copies of what was deployed as v34 (9 October 2026, 01:09 UTC) |
| **Single-file page** | this repository's `index.html` (one file, no server; opens from disk or any static host) | `design/page.css`, `design/page.js`, `design/categories.json`; `design/build.py` assembles `index.html` from them |

Everything measured here was measured with Playwright 1.56.1 on Chromium 141. Firefox and Safari were not tested.

The motion and folding rules, with the measurements that justify them, have their own note: [DESIGN.md](DESIGN.md). This document is the whole system around it.

## Contents

1. [Quick start](#1-quick-start)
2. [Intent and principles](#2-intent-and-principles)
3. [Mental model: a filing cabinet on a treadmill](#3-mental-model-a-filing-cabinet-on-a-treadmill)
4. [Foundations: colour, type, space, motion, layout](#4-foundations)
5. [Components](#5-components)
6. [Behaviour and state](#6-behaviour-and-state)
7. [Accessibility audit](#7-accessibility-audit)
8. [Content rules](#8-content-rules)
9. [Implementation map and pipeline](#9-implementation-map-and-pipeline)
10. [Verification](#10-verification)
11. [Extending the system](#11-extending-the-system)
12. [Known gaps and design debt](#12-known-gaps-and-design-debt)
13. [Decision log](#13-decision-log)
14. [Glossary](#14-glossary)
15. [Appendix: the posting fields the interface reads](#15-appendix-the-posting-fields-the-interface-reads)

## 1. Quick start

For another chat session or a person picking this up cold.

```
python3 design/build.py --check      # is index.html exactly what design/ produces? (exit 1 if not)
python3 design/build.py              # rebuild index.html after editing design/page.css, page.js or categories.json
node design/test/run.mjs             # 173 browser checks, both implementations (needs playwright + a Chromium)
node design/test/run.mjs measure     # prints the frame-by-frame motion numbers quoted in these documents
python3 design/tokens-report.py      # contrast audit of every colour pair (--fail: only misses; --matrix: per category)
```

Rules that keep it intact:

- **Edit the parts, not `index.html`.** The CSS and the script inside `index.html` are generated. The only things you edit in `index.html` directly are the `DATA` line (the postings) and the `UPDATED` line (the list date); `build.py` copies both through untouched.
- **Change timings in one place:** the `FOLD` constant at the top of `page.js` (live app and single-file page). It writes the three CSS variables; the CSS defaults are only fallbacks.
- **Change a colour in one place per implementation:** the `[data-cat="…"]` block of the stylesheet. Then run `tokens-report.py --matrix` and the tests.
- **Never put colour on a job card's title.** That is the one thing that breaks the system's central trick (principle 2).

## 2. Intent and principles

**Who and what for.** One reader, Numa (BSc physics, Leipzig), scanning about ninety open job postings sorted into ten categories and three areas, wanting at least three open postings in every cell and wanting to see at a glance where the gaps are. It is a private working tool, read mostly on a laptop and sometimes on a phone. It is not a marketing page.

**Principles**, in the order they were learnt:

1. **Orientation first.** At any scroll position the top of the window says which category and which city you are in. (Pinned headers, section 5.2 and 5.3.)
2. **Colour belongs to structure, never to content.** A category has a hue and a city has a hue; a job title is always ink on white. Scrolling, a black title on white is a job; a coloured title on a tinted band is a category. This was added because job titles and category titles were both dark serif and could not be told apart.
3. **A header is a control, and a control never changes size.** Opening a fold must not move the thing you just pressed.
4. **One motion.** One curve and one clock for the fold, the chevron, the slide, the fade and the window's scroll position. The page never snaps, never jumps, never leaves you looking at an empty edge.
5. **Nothing moves that you did not ask to move.** The only automatic motion is the scroll moving *with* a fold you opened or closed, and a wheel or touch cancels it at once.
6. **Quiet by default, remembered when changed.** Everything starts folded. What you open stays open across reloads and across re-renders (marking a card, searching, filtering).
7. **Numbers before detail.** Every header shows its counts against the aim (`3 open · aim 3`) before you open it; shortfalls are coloured.
8. **The same grammar at every level.** A level is a header plus a fold. The level below is the same thing, smaller and plainer, so the eye learns one pattern.
9. **The employer's own words are the evidence.** Each card quotes the posting's degree requirement verbatim, in German, in a box of its own.

**Deliberately not here:** icon fonts, animation libraries, UI frameworks, images, gradients, drop-shadow decoration. The live app's whole view layer is about 570 lines of JavaScript and 220 lines of CSS with no runtime dependency; the single-file page is one HTML file.

## 3. Mental model: a filing cabinet on a treadmill

**The picture.** A filing cabinet with ten drawers (the categories). Each drawer holds three trays (the cities: Berlin, Leipzig area, rest of Germany). Each tray holds cards. The plate on a drawer front is a label that never changes size. Pull a drawer open and its inside slides out beneath the plate, while the floor you stand on (the scroll position) moves on a treadmill at exactly the speed the drawer slides, so the plate stays where your eyes are. Read inside an open drawer and its plate is screwed to the ceiling; the plate of the open tray is screwed right under it. Walk on into the next tray and its plate takes over that spot.

**The same thing in variables.** Every fold *i* has an openness *pᵢ(t)* between 0 (shut) and 1 (open). All folds follow one curve *e(τ)* of normalised time *τ = t / T*. The document height is *D(t) = D₀ + Σ Hᵢ (pᵢ(t) − pᵢ(0))*, with *Hᵢ* the full height of fold *i*'s body. The window of height *V* may sit anywhere with *0 ≤ S ≤ D(t) − V* (S is the scroll position). The *glide* moves S along *S(t) = S₀ + (S₁ − S₀) · e(τ)*, with the target chosen so that *S₁ ≤ D₀ ± H − V* (plus for opening, minus for closing). Since *S₀ ≤ D₀ − V*, the slack is *(D₀ − V − S₀)(1 − e) ≥ 0* at every instant: the requested scroll is always reachable, so the browser never clamps it, so the motion never leaves the curve. Two coordinates, one parameter, one path that stays clear of the wall. (Full derivation: DESIGN.md rule 5.)

**The curve** is the CSS cubic Bézier with control points (0.4, 0) and (0.2, 1): a gentle start (0.02 % of the distance after 1 % of the time, 2.6 % after 10 %), then 78 % after half the time, then an easy landing. Its speed peaks at 30 % of the duration at 2.74 times the mean speed (computed numerically). The curve it replaced, (0.2, 0.8, 0.2, 1), had covered 9.7 % after 2.4 % of its time, which the eye reads as a snap.

## 4. Foundations

### 4.1 Colour

**Neutrals and signal colours.** The two implementations differ slightly (the single-file page inherited the original artifact's palette; the live app was tuned for contrast). Values are read from the stylesheets.

| Token | Role | Live app | Page, light | Page, dark |
|---|---|---|---|---|
| `--bg` | page ground | `#f7f3ec` | `#f5f1ea` | `#17120f` |
| `--card` / `--paper` | card and panel surface | `#fff` | `#ffffff` | `#211a17` |
| `--panel` | recessed surface | n/a | `#f5f1ea` | `#1b1512` |
| `--ink` | text, job titles | `#1c1518` | `#1c1518` | `#f2ece3` |
| `--ink2` | secondary text | n/a (uses `--muted`) | `#3a322e` | `#d9cfc3` |
| `--muted` | tertiary text, counts | `#6f655f` | `#8b8079` | `#a39689` |
| `--faint` | quaternary text, original titles | `#8b8079` | n/a | n/a |
| `--line` | hairline | `#ddd3c3` | `#cdc1ae` | `#4a3e36` |
| `--line-strong` | card border | `#cdc1ae` | n/a | n/a |
| `--line2` | inner hairline | n/a | `#e3dccf` | `#382e28` |
| `--wine` | primary accent, links, Berlin | `#7a1f2b` | `#7a1f2b` | `#e2a2aa` |
| `--wine-soft` | its tint | `#f3e3e5` | `#f3dcdc` | `#3d2026` |
| `--amber` | Leipzig | `#7a4b12` | `#7a4b12` | `#e8bf7a` |
| `--amber-soft` | its tint | `#f6ead7` | `#f4e3c1` | `#3a2b14` |
| `--slate` | Rest of Germany | `#34506a` | `#3b4551` | `#c3ccd6` |
| `--slate-soft` | its tint | `#e3e9ef` | `#dfe3e8` | `#262c33` |
| `--ok` | "aim met", Applied | `#2f5d3a` | `#2f5d3a` (literal) | `#8fc49a` (literal) |
| `--quote` | employer-quote box | `#fbf6ee` (literal) | `#fbf6ee` | `#2a211c` |

The live app is **light only**; the single-file page switches with `prefers-color-scheme`, and `data-theme="light"` or `"dark"` on `<html>` forces either. Dark mode sets `color-scheme: dark`.

**City colours** are the three signal colours already used by the city pill on each card, so a card and its panel agree: Berlin is `--wine`, Leipzig area `--amber`, rest of Germany `--slate`.

**Category hues.** One per category, used only on category headers (principle 2). In dark mode (single-file page) each hue is mixed 55 % with white. The table is generated by `design/tokens-report.py --matrix` and also gives the contrast of the title on its band (large text, target 3.0) and of the number chip (small text, target 4.5), in the live app, the light page and the dark page:

| Category | Hue (light) | Title on band: live / page / dark | Number chip: live / page / dark |
|---|---|---|---|
| content | `#7a1f2b` | 8.8 / 8.8 / 4.9 | 10.2 / 10.2 / 5.4 |
| ai | `#5b3a8c` | 7.6 / 7.6 / 5.4 | 8.6 / 8.6 / 6.2 |
| data | `#34506a` | 7.4 / 7.4 / 5.6 | 8.4 / 8.4 / 6.3 |
| computational | `#0f7b83` | 4.5 / 4.5 / 6.6 | 5.0 / 5.0 / 7.6 |
| numerical | `#2f5d3a` | 6.8 / 6.8 / 5.8 | 7.6 / 7.6 / 6.5 |
| systems | `#8a5a0f` | 5.3 / 5.3 / 6.3 | 5.9 / 5.9 / 7.2 |
| physiker | `#b5451b` | 4.9 / 4.9 / 6.3 | 5.5 / 5.5 / 7.1 |
| pm | `#3f5fb3` | 5.4 / 5.4 / 6.3 | 6.0 / 6.0 / 7.2 |
| production | `#5e6b1f` | 5.2 / 5.2 / 6.4 | 5.8 / 5.8 / 7.4 |
| energy | `#9a2f6a` | 6.2 / 6.2 / 5.7 | 7.0 / 7.0 / 6.4 |
| record (live app only) | `#4a4440` | 8.4 / n/a / n/a | 9.6 / n/a / n/a |

(The category names: content creation (not school teaching); AI training on physics and maths; data analyst; computational scientist; numerical methods; systems engineer; "Physiker" in the job title; project management; production supervisor; energy sector.)

**Derived colours**, so every hue works on light and dark grounds without a second palette (`color-mix(in srgb, …)`, per-channel interpolation of opaque colours):

| Name | Formula | Used for |
|---|---|---|
| `--cat-soft` | hue 8 % over the paper colour | category header band |
| `--cat-line` | hue 35 % over the paper colour | open card border, hairline under a pinned header, toggle ring |
| `--area-tint` | city colour 6 % over the paper colour | city panel and header |
| `--area-line` | city colour 30 % over the paper colour | city border, hairline, toggle ring |
| hover | inset overlay `rgba(28,21,24,.03)` live, `rgba(0,0,0,.03)` page | header hover |
| dark hue (page) | hue 55 % over `#fff` | `--cat` in dark mode |

### 4.2 Typography

Three families, loaded from Google Fonts (`Instrument Serif` regular and italic; `IBM Plex Sans` 400, 500, 600; `IBM Plex Mono` 400, 500). Fallbacks: Georgia; system-ui; ui-monospace.

| Family | Role |
|---|---|
| **Instrument Serif** | titles: page title, category titles, job titles, big numerals. Always weight 400. |
| **IBM Plex Sans** | running text: company names, notes, buttons, inputs, chips |
| **IBM Plex Mono** | the machine voice: counts, labels, the employer's quoted wording, original titles, small caps-style labels |

Roles and sizes, as declared in the stylesheets (px; weight / line-height where set):

| Role | Live app | Single-file page |
|---|---|---|
| Page title | serif 400 40 px / 1.05 (32 on phone) | serif 400 `clamp(40px, 7vw, 72px)` / 1, letter-spacing −.02em |
| Category title | serif 400 28 / 1.15 (24 on phone), in the hue | serif 400 `clamp(24px, 3vw, 30px)` / 1.15, in the hue |
| Number chip | mono 500 11 / 1.4 | mono 500 11 / 1.4 |
| Category counts | mono 12 | mono 12, tabular figures |
| City label | mono 600 12.5 / 1.2, capitals, letter-spacing .12em | the same |
| City counts | mono 12 | mono 12 |
| Job title | serif 400 20 / 1.2 | serif 400 20 / 1.18 |
| Original title | mono 11 / 1.4 | mono 11 / 1.4 |
| Company | sans 500 14 | sans 500 13.5 |
| Employer quote | mono 11.5 / 1.5 | mono 11 / 1.5 |
| Note | sans 13 (three lines, then clipped, until More is pressed) | sans 13 / 1.5 |
| Button, chip | sans 13 (chips), mono 11 to 12 (small buttons) | sans 12.5 (chips), mono 11 (card buttons) |
| Big numerals (tally, figures) | serif 400 30 | serif 400 34 |
| Smallest text | mono 500 9.5 (details labels) | mono 10 (tags, figure labels) |

Body is 15 px sans, line-height 1.5 (live) or the browser default (page, 14 px reset in the document head). See section 12 for the small-text caveat and the font-weight gap.

### 4.3 Space, shape, depth

There is **no spacing token scale**: values are literal in the CSS. The recurring ones:

| Thing | Value |
|---|---|
| Gaps | 6, 8, 12 (between cards in the live app: 12; single-file page: 10) |
| Card padding | 14 (live: 14 14 12; page: 14 14 10) |
| Category header padding | 16 × 20 (14 on phone) |
| City header padding | 8 10 8 14 |
| Category body padding | live `0 20 20` (`0 12 14` on phone); page `12 12 12` (`12 16 16` from 760 px) |
| City body padding | 10 12 12 |

**Radii:** 3 (pills, small buttons), 4 (inputs, quote box, inner header corners), 5 to 6 (cards), 8 (city panel), 10 (category card), 999 (chips, fold bar), 50 % (round toggles). **Left edges:** 4 px solid in the hue (category) or city colour (city); 3 px amber on cards added by hand (live).

**Depth:** one elevation, on the open category: `0 12px 32px -20px rgba(28,21,24,.28)` (live) or `rgba(0,0,0,.28)` (page); and one hairline under a pinned header: `0 1px 0` in `--cat-line` or `--area-line`. Nothing else casts a shadow.

**Stacking (z-index):** single-file top bar 10; pinned category header 5; pinned city header 4.

### 4.4 Motion

Tokens (JavaScript owns them; CSS variables follow):

| Token | Value |
|---|---|
| `--fold-ease` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--fold-open` | 320 ms |
| `--fold-close` | 240 ms; per section raised to as much as 420 ms by `0.45 × distance in px` when the close also has to drop the page |
| Slide | 8 px down, with the fade, while a body closes; the reverse while it opens |
| Quick feedback | 150 ms ease on hover (header overlay, button colours); 100 ms press scale 0.94 on round toggles |

`prefers-reduced-motion: reduce` sets every transition to 0.01 ms (measured: 1e-5 s) and makes the glide an instant jump after the layout settles. Expand all and Collapse all are always instant. Details, rules and measurements: DESIGN.md sections 2 to 4.

### 4.5 Layout and breakpoints

| | Live app | Single-file page |
|---|---|---|
| Column | `.board`, max 1320, padding 0 20 80 (0 16 60 on phone) | `.wrap`, max 1180, padding-inline 16 (28 from 760) |
| Top | page header with title, tally, chips; no sticky bar | sticky top bar (search, chips, fold bar), height measured into `--bar-h` |
| Card grid | `repeat(auto-fill, minmax(290px, 1fr))`, gap 12 | 1 column, 2 from 760, 3 from 1100; gap 10 |
| Breakpoint | 720 (max-width) | 760 (min-width) and 1100 (min-width) |

Phone adaptations: header padding 14, title one step smaller, round toggles 34 px, forms one column, record list one column.

## 5. Components

Each entry gives the anatomy, the states and the hooks. "L" is the live app, "P" the single-file page.

### 5.1 Page frame

- **L:** `header.top`: kicker (mono caps, wine) over the title; the **tally** (three tiles: Applied, Not relevant, Open: serif numeral over a mono caps label; the first two link to the record); a controls row with the **area chips** (All areas, Berlin, Leipzig area, Rest of Germany; one on at a time, stored), the **fold bar** (Expand all | Collapse all) and Sign out. Below it the **jump bar**: one link per category with its two-digit number, its name, its open count and a dot in its hue; a click opens that category and glides to it.
- **P:** a **sticky top bar** (search box, area chips, fold bar) with 94 % ground colour and a blur, then the masthead (eyebrow, title, a lede that states the rule and the aim, four figures: live postings, Berlin, Leipzig area, marked applied).

### 5.2 Category fold

```
┌─▌ [02] AI training on physics & maths                              (⌄) ┐  ← header: tinted band, 4 px hue edge
│▌     8 open · Berlin 3/3 · Leipzig area 3/3 · Rest of Germany 2/3     │     title and chip in the hue; counts mono
│▌   ┌─ BERLIN  3 open · aim 3 ───────────────────────────────── (⌄) ┐   │  ← city folds live here (5.3)
└─▌   └───────────────────────────────────────────────────────────────┘ ┘
```

| Part | Spec |
|---|---|
| Card | white, 1 px border (`--line-strong` L, `--line` P), 4 px hue left edge, radius 10 |
| Header | the whole row is the click target; band = `--cat-soft`; padding 16 × 20; **never changes size** (measured 78 px on a laptop, 111 px on a phone for L; 86 / 90 for P) |
| Number chip | `02`: mono 500 11 px, hue fill, white (L) or paper (P) text, radius 4 |
| Title | serif, hue colour |
| Counts line | `8 open` in ink 500, then one `Name n/aim` per city: wine (L) or amber (P) when below the aim, green when met. Numbers carry the meaning; colour only reinforces it |
| Toggle | 36 px circle (34 on phone), ring `--cat-line`, chevron in the hue; **open:** filled with the hue, chevron white and turned 180° |
| Body | a fold (5.9): in L a tools row with "+ Add posting" (right-aligned) then the three city folds; in P the three city folds |

| State | Appearance |
|---|---|
| Shut | border `--line`; header band; chevron down |
| Shut, hover | border becomes `--cat-line`; header gets the 3 % overlay |
| Open | border `--cat-line`, elevation, header sticky and square-cornered at the bottom with a hairline, toggle filled, chevron up |
| Focus | 2 px outline in wine (L: toggle, more, fold buttons) or in the city colour (city toggle); the browser default elsewhere in L (section 12) |
| Pressed (toggle) | scale 0.94 |

Hooks: `section.cat#cat-<key>[data-cat][data-collapsed]`, `header.sec-head[data-head]`, `button.toggle[data-toggle]` with `aria-expanded`, `aria-controls`, `aria-label` ("Expand …" / "Collapse …"), `.fold[data-fold][data-open][inert]`.

### 5.3 City fold

The same fold, one level down, and visibly lesser.

| Part | Spec |
|---|---|
| Panel | tint `--area-tint`, 1 px `--area-line` border, 4 px city-colour left edge, radius 8 |
| Header | padding 8 10 8 14, flex; label, counts, toggle at the far right |
| Label | mono 600 12.5 px, capitals, spacing .12em, in the city colour (`BERLIN`, `LEIPZIG AREA`, `REST OF GERMANY`) |
| Counts | mono 12: `3 open · aim 3`; "n open" coloured by short or met |
| Toggle | 30 px circle; ring `--area-line`; open: filled with the city colour |
| Body | padding 10 12 12; the card grid, or an empty-state box |

An open city's header **pins directly under its category's header**; scrolling into the next city, that header takes the spot. Pin line of a category: 0 (L) or the bottom of the top bar (P). Pin line of a city: the category's pin line plus the category header's height, kept current by a `ResizeObserver` that writes `--head-h` on the section (headers wrap on narrow screens).

States as for the category (shut, hover, open, focus). Cities start shut; their state is remembered per category (6.2). Hooks: `div.area#area-<cat>-<city>[data-area][data-key="cat:city"][data-collapsed]`, `.area-head[data-head]`, `button.atoggle[data-toggle]`, `.fold[data-fold]`.

### 5.4 Job card

| Part | L | P |
|---|---|---|
| Top row | city pill, city text (mono, faint), `#n` right-aligned; "added by you" on hand-added cards | city pill (text is the posting's city string), contract chip, `#n` |
| Title | serif 20, a link; hover: wine and underlined | same |
| Original title | mono 11, only if it differs | same |
| Company | sans 500 | sans 500 |
| Quote box | the employer's wording in German quotation marks `„…“`, mono, 2 px wine left rule | same, `--quote` ground |
| In short (English) | under **More** | always shown, as a note |
| Note | three lines, then clipped; **More** unclamps it | full |
| Salary, contract, date added | under **More** | salary as a mono line; contract in the top row |
| Actions | **Open posting ↗**, **More / Less** (rotating chevron), **Remove** | **Open posting ↗**, **Mark applied** (toggle, filled when on; the card dims to 55 %) |

Cards never carry colour except the city pill. A card opened with More animates on the same curve as a fold.

### 5.5 Pills, tags, quote

- **City pill:** 10 px caps, weight 500, spacing .05em, radius 3, padding 2 × 7; ground `--<city>-soft`, text `--<city>`.
- **Contract chip (P):** same shape, 1 px amber-soft outline, amber text.
- **Quote box** (class `blockquote` in L, `.proof` in P): the evidence. Left rule 2 px wine; radius `0 4 4 0`; padding 7 × 10; mono 11 to 11.5 px.

### 5.6 Controls

| Control | Spec |
|---|---|
| Chip | pill (radius 999); 5 × 12; sans 12.5 to 13; selected: ink ground (L) or wine ground (P), light text; `aria-pressed` |
| Fold bar | two-segment pill, `Expand all` and `Collapse all`; sans 12.5 to 13, muted text; hover wine on wine-soft |
| Primary button | solid wine, white text: Save, Not relevant |
| Positive button | solid green: Applied |
| Secondary button | 1 px outline (`--line-strong`), muted text: Cancel, Remove, More, Sign out |
| Accent outline | 1 px wine outline, wine text: + Add posting (fills wine on hover), Open posting in the page |
| Search (P) | sans 14, 7 × 10, radius 4, fills the bar |

### 5.7 Live-app-only components

- **Remove flow.** *Remove* opens a small box in the card: "Remove because…" with **Applied**, **Not relevant**, **Cancel**; cards added by hand also get "Added by mistake: delete without counting". The posting leaves the list and enters "Your record", saved on the server; **Undo** brings it back.
- **Add posting form.** Opens inside the category's body, in place of the "+ Add posting" row: link, job title as advertised, company (optional), city, area (radio), inline error line, Add posting / Cancel. A wine outline marks it as a form the person is in.
- **Your record.** A fold in the same grammar (grey hue `#4a4440`), two columns (Applied, Not relevant), each a list of date, linked title and meta, with Undo.
- **Banner.** A wine-tinted bar with a 3 px wine edge for a save problem (`role="alert"`).
- **Login and no-access screens** (`gate.css`, `auth/*`) are not part of the fold design and are not documented here.

### 5.8 Empty states and footer

- **Empty city:** a box with a dashed border (`--line-strong`) in the live app, "Nothing open here yet."; in the page an italic muted line, "No live posting here yet.", or "Nothing matches the search." when a search empties a city that does have postings.
- **Footer:** hairline above, 11 to 12.5 px, faint or muted: the rule and "List updated …" (L) or "List updated … · n live postings · Mark applied is saved in this browser only." (P).

### 5.9 The fold primitive

Every fold (category, city, card details) is the same three nested elements:

```html
<div class="fold" data-fold="1" data-open="0" id="…" inert>   <!-- grid; row 0fr (shut) or 1fr (open) -->
  <div class="fold-i">                                         <!-- overflow: clip; min-height: 0 -->
    <div class="…body…"> … </div>                              <!-- the only child that slides and fades -->
  </div>
</div>
```

```css
.fold { display: grid; grid-template-rows: 1fr; overflow-anchor: none; transition: grid-template-rows var(--fold-open) var(--fold-ease); }
.fold > .fold-i { overflow: clip; min-height: 0; }
.fold[data-open="0"] { grid-template-rows: 0fr; transition-duration: var(--fold-close); }
.fold > .fold-i > * { transition: opacity var(--fold-open) var(--fold-ease), transform var(--fold-open) var(--fold-ease); }
.fold[data-open="0"] > .fold-i > * { opacity: 0; transform: translateY(-8px); transition-duration: var(--fold-close); }
```

The grid row animates the real content height with no measuring. `inert` keeps shut content out of the tab order and away from screen readers. `overflow: clip` (not `hidden`) is what lets a city header inside pin to the window: `hidden` would make the wrapper a scroll container, and a sticky element sticks to its nearest scroll container.

## 6. Behaviour and state

### 6.1 The folding behaviour in short

Open and close in place (no re-render); header click or toggle; everything starts shut; Expand all and Collapse all switch both levels instantly; a category or city opened low in the window glides up under the pinned header above it; one closed from deep inside keeps its header where it is; a wheel or touch cancels a glide; open states survive re-renders. The eight rules and their derivation are DESIGN.md section 3.

### 6.2 What is remembered, and where

| Key (browser `localStorage`) | Holds | Implementation |
|---|---|---|
| `radar.open` | open category ids, including `record` | L |
| `radar.openAreas` | open cities as `category:city` | L |
| `radar.area` | the area chip (`all`, `berlin`, `leipzig`, `de`) | L |
| `pr.open` | open categories `{category: true}` | P |
| `pr.openAreas` | open cities `{"category:city": true}` | P |
| `pr.applied` | marked-applied posting numbers `{n: true}` | P |

All of these are per-browser conveniences, never data, and every read and write is wrapped in `try`/`catch` (private windows, blocked storage). Server-side in L: Applied and Not relevant marks and hand-added postings (AppDeploy database).

### 6.3 Filters and search

- **Area chip** (both): narrows each open category to that city. While a chip other than All is on, the cities shown **open by themselves**; closing one there is remembered only in memory and forgotten when you change the chip. Choosing **All** restores what you had opened.
- **Search (P only):** filters cards by title, original title, company, city and skills; while text is in the box **every category and city opens** and the counts read `n of m match`; clearing it restores the remembered state.
- Neither changes what is stored.

### 6.4 Keyboard and focus

The round toggles are real buttons: Tab reaches them, Enter or Space opens and closes, `aria-expanded` follows. The header rows are clickable by mouse and touch but are not focus stops; the toggle in the same header is the keyboard control for the same action. Focus rings: 2 px outline in wine, offset 2 px (page: every button and link; live app: toggles, More, fold buttons; city toggles use their city colour; inputs use a 2 px wine outline). Other live-app buttons rely on the browser's default ring.

## 7. Accessibility audit

All numbers below are produced by code (`design/tokens-report.py`, `design/test/measure.cjs`) and can be re-run.

**Contrast** (WCAG 2.x relative luminance; targets 4.5 for normal text, 3.0 for large text and non-text parts of controls). 188 pairs checked: every category title, number chip, city label, city count, pill, quote, link, body and secondary text, in the live app (66 pairs), the light page (61) and the dark page (61).

| Theme | Pairs | Below target | Cause |
|---|---|---|---|
| Live app, light | 66 | 1 | `--faint` `#8b8079` on white = 3.85, used by 9.5 to 11 px mono text (original titles, card top row, details labels, record dates, jump-bar numbers) |
| Page, light | 61 | 15 | `--muted` `#8b8079` on white = 3.85, on the page ground 3.42, on category bands 3.33 to 3.45, on city tints 3.47 to 3.51: counts, `#n`, original titles, salary line, footer, figure labels |
| Page, dark | 61 | 0 | |

Every miss is one grey token. The fix is one line each and was computed, not guessed: set the page's `--muted` to `#6f655f` (the live app's value) and every light-page pair reaches at least 4.9 (white 5.67, page ground 5.04, worst category band 4.91, worst city tint 5.11); set the live app's `--faint` to `#756a63` and it reaches 5.25 on white. These are visual changes, so they were **not** made without a decision (section 12).

**Everything else measured to pass:** all ten category titles and number chips in light and dark (matrix in 4.1); city labels and toggles; body, links, pills, quote text.

**Target sizes** (WCAG 2.2 AA: at least 24 × 24 px; measured in the browser): round toggles 36 (30 for cities); chips 28 to 32 tall; fold-bar buttons 26 to 30 tall; More, Remove, card buttons 24 tall; sign out 26; + Add posting 37. One miss: the live app's text link "Open posting ↗" is 20 px tall; the card title is a link to the same place and is larger, so the function has a larger equivalent target.

**Reduced motion:** with `prefers-reduced-motion: reduce` the fold and chevron transitions compute to 1e-5 s and the fold is open and measurable at once (both implementations).

**Semantics:** `aria-expanded`, `aria-controls` and a changing `aria-label` on every toggle; shut content is `inert`; `role="alert"` on the live app's banner and form errors; `role="group"` with a label on the live app's chip row and on both fold bars (the page's chips have `aria-pressed` but no group wrapper); open state is shown by chevron direction and `aria-expanded`, never by colour alone; the "short of aim" state is shown by the numbers (`2/3`), with colour as reinforcement.

**Not covered:** screen-reader testing with real assistive technology; Firefox and Safari; zoom to 200 % and text-only zoom; high-contrast mode; touch testing on a real device.

## 8. Content rules

Wording conventions the interface depends on:

- **Titles in English** (as the person reads them), with the **original title** in mono beneath when it differs.
- **The quote is the employer's own German wording, verbatim**, in `„ “` marks. It is evidence, not paraphrase. The English line says what it means for a bachelor in physics.
- **Names:** the three areas are called **Berlin**, **Leipzig area**, **Rest of Germany**. In conversation they are "cities"; in the code they are `area` or `location_group`, with keys `berlin`, `leipzig`, `de`.
- **Counts read** `n open · aim 3` in a city header and `Name n/3` in a category header.
- **Dates** in en-GB short form (`8 Oct 2026`); the list date as `YYYY-MM-DD`.
- **Units are metric**; money is written with its currency.
- **Remote and non-local postings are labelled in the city text** and the note says where they were placed and why ("Remote (listed for the USA; application form accepts residents of any country)").
- **Job-board links are labelled** in the note when the employer has no page of its own.
- **Sentence case** everywhere except the mono capital labels (city names, tallies, pills), which are capitals by CSS.

## 9. Implementation map and pipeline

### 9.1 This repository

```
index.html                    generated; edit only the DATA and UPDATED lines
DESIGN.md                     the motion and folding specification, with measurements
DESIGN-SYSTEM.md              this document
design/
  page.css  page.js           look and behaviour of the single-file page (page.js is a template: __CATS__, __TARGET__)
  categories.json             the ten categories and the aim per city
  build.py                    assembles index.html; --check proves the parts reproduce it
  tokens-report.py            contrast audit of the stylesheets
  live-app/page.js, board.css the live app's two design files, as deployed (v34)
  test/                       run.mjs (runner), repotest, citytest, foldtest, measure, harness/
```

### 9.2 The live app

AppDeploy app `physik-radar-xvy59b` (frontend plus backend). The files that carry the design: `src/claude/view/page.js` (the page, 569 lines), `src/claude/styles/board.css`. Around them: `index.html` (font links, mount point), `src/main.tsx` → `src/claude/boot.js` (loads the data, renders, watches for refreshes), `view/dom.js` (the three-helper element builder: `el`, `fill`, `hostOf`), `data/*` (transport, marks, added postings, live refresh), `auth/*` (login), `styles/gate.css`. Backend: `backend/categories.mjs` (the single source of category keys, labels and areas, read by both page and server), `backend/dossier.mjs` (validates the data), `backend/data/postings.json` and `meta.json` (the list, compiled into `data-text.mjs` by `prepare-data.mjs`), marks and added-postings stores, a release test (`backend/tests/release.test.mjs`, 9 tests).

**Shipping a design change to the live app:** put the changed files in an upload manifest `{"files":[{"filename","content"}],"deletePaths":[]}`, `upload_assets` (direct HTTP), `PUT` the manifest, `deploy_app` with the returned upload id, poll `get_app_status` until `ready`. Upload ids expire when the worker restarts; request, PUT and deploy back to back. Then confirm the live bundle contains the change (the page's script and stylesheet are public).

**Data changes** (postings) go through `postings.json` → `prepare-data.mjs` → the 9 backend tests → the same upload and deploy.

### 9.3 The single-file page

`python3 design/build.py` reads the first line of `index.html` (the artifact's own header, kept as is), the `DATA` and `UPDATED` lines (copied byte for byte), `design/categories.json`, `page.css` and `page.js`, and writes `index.html`. `--check` rebuilds in memory and compares; a round trip (build, then build again) is byte-identical, verified on 9 October 2026.

## 10. Verification

`node design/test/run.mjs` builds a temporary harness (the live app's real `page.js` and `board.css`, stand-ins for the three server-side modules, a `data.json` made from `index.html`), serves it and the repository root, and drives Chromium at 1280 × 900 and 390 × 844 (light and dark for the page). **173 checks, three consecutive runs identical on 9 October 2026.** Expectations are derived from the data (live counts, search hits, category count), so a refreshed list does not break them; where a test drives a panel it first verifies the panel holds a posting and says so if not.

| Suite | Target | Checks | Covers |
|---|---|---|---|
| `repotest.cjs` | single-file page | 48 | start shut; header and toggle open and close; low section glides under the bar; header pins under the bar; deep close never jumps; curve; header size; Expand and Collapse all; search opens all and restores; Mark applied keeps open state; reload memory; distinct category colours |
| `citytest.cjs` | single-file page | 54 | folded cities inside an open category; city styling differs from category styling; three city colours; city open and close; same curve; pinned stack (category then city); next city takes over; city deep close; city opened low; category closed from deep in a city; both levels in Expand and Collapse all; reload memory; area chip behaviour; search |
| `foldtest.cjs` | live app view code | 35 | the category-level behaviour on the live code, in the harness |
| `citytest.cjs` | live app view code | 36 | the city level on the live code, plus Remove and More inside a city |
| `measure.cjs` | both | n/a | frame-by-frame motion numbers, target sizes, reduced motion (`run.mjs measure`) |
| `tokens-report.py` | stylesheets | n/a | contrast of 188 colour pairs |

**What the live-app harness does not cover:** the server round trips (marks, added postings, sign-in, live refresh). Those have the backend release tests and manual use.

**Numbers from the last run** (live app harness; the single-file page is within a few milliseconds): a category opening covers 0.8 % of its height after 31 ms, 2.8 % after 48 ms, 15 % after 81 ms, 40 % after 115 ms, and settles at about 330 ms; the category header is the same height open and closed (78 px, and 86 px on the page); a 190 to 230 px close-from-deep glide peaks at 2.3 to 2.5 px/ms, 2.6 to 2.9 times its mean speed against the curve's 2.74.

## 11. Extending the system

**Add a category.** (1) Add `['key', 'Label']` to `backend/categories.mjs` (live app) and to `design/categories.json` (page). (2) Add a `[data-cat="key"]` hue to `board.css` (`--cat`) and `design/page.css` (`--cat-base`); pick one whose title on its band meets 3.0 and whose chip meets 4.5 in light and dark, and check with `tokens-report.py --matrix`. (3) Rebuild the page; run the tests (the suites count categories from the data). The category list is read from the data, so no component code changes.

**Change a hue.** The `[data-cat]` rule in both stylesheets; derived tints follow. Re-run the matrix.

**Change the timings or the curve.** The `FOLD` constant at the top of both `page.js` files. Re-run `node design/test/run.mjs` and `… measure`; if the curve changes, recompute the speed ratio in DESIGN.md section 4 and the tolerance (3.2 × mean) in the deep-close checks.

**Add or rename an area (city).** Not a data-only change. Touch: `AREAS` in `backend/categories.mjs`; `LOCS` and `PILL` in `page.js`; the `[data-area]` colour rule and the pill classes in the stylesheets; the tests that assume three cities. Pick a colour with the audit.

**Add a fold level** (for instance a group inside a city). Nest another `.fold` structure; add the level to `pinLine()` (its pin line is its parent's pin line plus the parent header's height) and give the parent header a `--head-h` observer as the category has; make sure every ancestor between it and the page uses `overflow: clip`, not `hidden`; add a pinned-stack check to `citytest.cjs`.

**Add a component.** Take colour from the existing tokens; give it a hover, focus-visible, pressed and (if it toggles) open state; give any interactive part at least 24 × 24 px; run `tokens-report.py` by adding the new pairs to its list.

**Refresh the postings in the page.** Edit the `DATA` and `UPDATED` lines of `index.html` and nothing else; `python3 design/build.py --check` must still pass.

## 12. Known gaps and design debt

Stated plainly, with the cheapest fix. None of these was changed without a decision, because each alters how something looks.

1. **Grey text below WCAG AA** (section 7): one token per implementation. Fix: page `--muted: #6f655f`; live `--faint: #756a63`.
2. **Very small text.** The smallest sizes are 9.5 px (live details labels) and 10 px (page tags, figure labels); much secondary text is 10 to 12 px mono. Legible on a laptop; marginal on a phone.
3. **Font weight 600 in mono is requested but not loaded** (`.area-name`; the font link loads Plex Mono 400 and 500). Browsers substitute 500 or synthesise bold. Sans 600 is loaded but unused. Fix: load mono 600, or request 500.
4. **Two city colours equal two category hues.** Berlin's wine (`#7a1f2b`) is exactly the Content hue; in the live app Rest of Germany's slate (`#34506a`) is exactly the Data analyst hue. The levels stay apart by header style (serif title on a band against small mono capitals), but a reader who learns colour-means-category will meet a city in a category colour. Fix: give cities their own three colours.
5. **Header rows are not focus stops.** The toggle in the header is, so keyboard users lose nothing; some screen-reader users may expect the heading itself to act. A `button` wrapping the title would unify them.
6. **Inconsistent focus styles** in the live app: toggles, More and fold buttons have a wine outline; chips, add, remove, sign out and the form buttons use the browser default.
7. **Hard-coded colours** outside the token set (live: `#fbf6ee`, `#4a413d`, `#eee6d9`; page: `#2f5d3a`, `#8fc49a`).
8. **`user-select: none` on headers**: the title text cannot be selected or copied.
9. **No spacing token scale.**
10. **Chromium only.** The features used (`color-mix()`, `overflow: clip`, `inert`, transitions on `grid-template-rows`, `position: sticky`) are, to my knowledge, in current Firefox, Safari and Chromium releases, but that was not tested.
11. **No visual regression test.** The tests assert geometry, state and timing; a colour or spacing change that keeps the geometry passes them.
12. **The live app's text link "Open posting ↗" is 20 px tall** (section 7).
13. **The live app is light only**; the page has dark mode.

## 13. Decision log

All times 8 and 9 October 2026 (AppDeploy versions in UTC).

| When | What | Why |
|---|---|---|
| 8 Oct, v22 (14:59) | Page rebuilt as category boards with Remove → Applied / Not relevant and "Your record" | Simpler working model; the earlier fold code was not carried over, which was noticed as a regression |
| 8 Oct, v30 (20:30) | Fold-out categories restored: header as control, grid-row fold, Expand all and Collapse all, card details | The regression |
| 8 Oct, v31 (23:22) | Motion rebuilt: one curve and one clock, scroll glide, pre-scroll, constant header size, SVG chevron, "+ Add posting" moved into the body | It "felt unstable and old"; measurement found four concrete defects (DESIGN.md section 2) |
| 8 Oct, v32 (23:36) | Colour per category | Category titles and job titles looked alike while scrolling |
| 8 Oct, v33 (23:48) | Close duration stretches with the scroll distance (240 to 420 ms) | A near-window-high drop in 240 ms was too fast for the eye |
| 9 Oct, v34 (01:09) | City folds inside categories, colour per city, pinned stack, `overflow: clip` | "I need to distinguish the cities within one category" |
| 8 and 9 Oct, repository | Single-file page brought level with the live app; DESIGN.md; build kit, tests and this document | Share and keep the work |

**Rejected, and why.**

- *Per-card stagger on open:* a second clock; it tells the reader nothing.
- *Browser smooth scrolling (`scrollTo({ behavior: 'smooth' })`) for the reveal:* observed stopping 138 px short, because the page had not grown yet when the scroll was requested; the manual glide is clamp-proof (section 3).
- *`<details>` or `interpolate-size` height transitions:* browser support not verified here; the grid-row technique needs none.
- *Colour on job cards beyond the city pill:* it would destroy principle 2.
- *One "+ Add posting" per city:* one per category keeps the form and its area choice in one place.
- *Animating Expand all and Collapse all:* thirty heights moving at once is noise.

## 14. Glossary

- **Fold:** a header plus a body that opens and closes in place; the unit of the whole system. Categories, cities and card details are folds.
- **Header:** the always-visible plate of a fold; the control. Never changes size.
- **Body:** what a fold reveals.
- **Band:** the tinted background of a category header (8 % of the hue).
- **Tint:** the same for a city (6 % of its colour).
- **Hue:** a category's colour. **City colour:** a city's.
- **Chip:** a rounded selector (area chips) or the small solid number tag in a category title ("number chip").
- **Pill:** the small coloured label on a card showing its city.
- **Quote box (proof):** the box holding the employer's own wording.
- **Pin line:** the height in the window at which an open fold's header sticks: 0 or the bottom of the top bar for a category; a category's pin line plus its header's height for a city.
- **Pinned stack:** the category header at its pin line with the open city's header directly beneath.
- **Glide:** the window's scroll moved on the fold's own curve and clock, frame by frame, so the scroll and the unfolding stay in step.
- **Pre-scroll:** the instant scroll that, before a deep close, puts the fold's top where its pinned header already is, so nothing visible moves.
- **Clamp:** the browser refusing a scroll position beyond the current end of the page, which stops a smooth scroll half-way; the glide is built so it never meets one.
- **Aim:** the target number of open postings per city in every category (3).
- **Short, met:** a count below the aim (coloured wine or amber) and a count at or above it (green).
- **Area / location group / city:** the same thing under three names: code (`area`, `location_group`), data (`berlin`, `leipzig`, `de`), and what people say ("city").
- **Harness:** the stand-in page that runs the live app's real view code with the server-side modules replaced, for testing.

## 15. Appendix: the posting fields the interface reads

| Field | Shown | Used by |
|---|---|---|
| `n` | `#n` on the card; stable id; sort order | both |
| `title` | job title (English) | both |
| `title_original` | mono line under the title when different | both |
| `company` | company line | both |
| `city` | city text (L) or pill text (P) | both |
| `location_group` | `berlin` / `leipzig` / `de`: which city panel | both |
| `category` | one of the ten keys: which category | both |
| `url` | the link | both |
| `eligibility_quote_de` | the quote box | both |
| `eligibility_en` | "In short" under More (L), a note (P) | both |
| `note` | the note | both |
| `salary` | under More (L), a mono line (P) | both |
| `employment` | under More (L), the contract chip (P) | both |
| `added_on` | under More (L) | L |
| `removed_on`, `removed_why` | a posting with `removed_on` set is not shown | both |
| `skills` | search only | P |
