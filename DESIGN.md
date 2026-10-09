# The fold: how Physik Radar's category boards move

Physik Radar is a private job board: ten categories of physics-adjacent jobs, each a card that unfolds in place to show its three cities (Berlin, Leipzig area, rest of Germany), each city again a panel that unfolds to show its postings. This note describes the way those cards open, close, scroll and look. It exists so that another chat session, or a human, can rebuild the behaviour exactly, check it, and keep it. It was designed and measured on 8 October 2026 by Numa and Claude, after the first version "felt unstable and old" and nobody could say why until it was measured; the city level was added on 9 October 2026.

Two copies carry it: the live app (AppDeploy app `physik-radar-xvy59b`; a snapshot of its two design files, `page.js` and `board.css` as deployed in v34, is in `design/live-app/`) and this repository's single-file `index.html`, which `design/build.py` generates from `design/page.css`, `design/page.js` and `design/categories.json`. The whole design system (tokens, components, accessibility, how to extend it) is in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md); this note is the motion and folding specification, with the measurements behind it.

## 1. What it is, in one paragraph

Two levels fold. Every category is a fold-out card; inside an open category, each of the three cities is a fold-out panel. A header is always the control: a category header shows the number, the title and the counts per city in the category's own colour; a city header shows the city's name and "n open · aim 3" in the city's colour, smaller and in capitals, so the two levels never look alike. Headers never change size. Click one and its body unfolds beneath it; the real height animates, the content slides down 8 px while it fades in, and the chevron turns. Everything that moves, including the window's scroll position, follows one curve on one clock, so the page never snaps, never jumps and never leaves you looking at an empty edge. While you read, the open category's header pins to the top and the open city's header pins right under it, so the top of the window always says *which category, which city*; scroll into the next city and its header takes over. Everything can be opened or closed at once, instantly. Job titles stay black; colour belongs to the category and the city headers, so you can always tell a boundary from a job card while scrolling.

## 2. What it fixed (measured, not guessed)

The first version used the common accordion recipe: a CSS transition on `grid-template-rows` with an ease-out curve, opacity fades on a delay, and no thought given to the scroll position. Frame-by-frame sampling in a headless browser (Playwright, one sample per `requestAnimationFrame`) found these defects. The "before" numbers were taken from that first version (AppDeploy v30, 8 October 2026, 20:30 UTC) and cannot be reproduced from the code now in the repository; the "after" numbers can: `node design/test/run.mjs measure`. Times are milliseconds after the click; the transition itself starts a frame or two later.

| Defect | Measured before | Measured after |
|---|---|---|
| Opening a section whose header sits low on the page | 68 px of a 2 039 px body visible; it unfolded below the screen edge | Header lands 12 px from the top (or just under the top bar), 800 px of body on screen |
| Motion curve `cubic-bezier(.2,.8,.2,1)` over 500 ms | 13 % of the height 12 ms after the click, 27 % after 29 ms, 51 % after 62 ms, then a long tail: settled at 495 ms | `cubic-bezier(.4,0,.2,1)` over 320 ms: 0.8 % after 31 ms, 2.8 % after 48 ms, 15 % after 81 ms, 40 % after 115 ms; settled at 331 ms (single-file page 315 ms) |
| Closing a section from deep inside it (header pinned) | `scrollY` went 902 → 1 481 → 601 during the close; the pinned header flew 729 px off-screen (the cause was not isolated: the page was shortening under a `position: sticky` header while the browser re-clamped the scroll) | Header stays pinned, or glides down on the fold's own curve when the page becomes too short to pin it. Measured over 30 ms windows its peak speed is 2.3–2.5 px/ms for a 190–230 px glide, 2.6–2.9 × the mean speed, against the curve's own 2.74 × (see section 4); the largest single-frame step was 27 px |
| Mismatched timings | Height 500 ms, opacity 350 ms + 50 ms delay, shadow 400 ms, border 250 ms, chevron 450 ms with a 180° spin plus a vertical slide | One curve, one clock, for height, slide, fade, chevron, shadow, border and scroll |
| Phone header | Shrank by about 30 px on open, shifting the content | Same height open and closed (measured 78 px desktop, 111 px phone) |

A fifth, visual problem came after: category titles and job titles were both dark serif text, so a job card and the next category header looked the same while scrolling. Section 5 is the answer.

## 3. The eight rules

1. **The header is the control and never changes size.** The whole header row is clickable; a round chevron button inside it is the keyboard target. Nothing in the header is added, hidden or resized when the section opens. The "+ Add posting" button lives inside the body, not the header. On open the header only gains `position: sticky` and a hairline shadow; sticky changes no layout.

2. **One curve, one clock.** `cubic-bezier(0.4, 0, 0.2, 1)`; 320 ms to open, 240 ms to close. Height, the 8 px slide, the fade, the chevron's 180° turn, the border and shadow, and the window scroll all use these two numbers and this curve. The JavaScript owns the numbers and writes them into CSS custom properties (`--fold-open`, `--fold-close`, `--fold-ease`), so there is a single source of truth.

3. **The height is real.** The body is a CSS grid whose single row goes from `0fr` to `1fr`; the inner wrapper has `overflow: clip; min-height: 0` (`clip`, not `hidden`, for the reason given under rule 8). This animates the true content height without measuring it, and a click in the middle of an animation reverses it smoothly from wherever it is (CSS transitions handle the interruption). The closed body carries `inert`, so nothing hidden can take focus.

4. **The scroll is part of the animation.** Two cases:
   - *Opening low.* If the header sits below max(pin line + 48 px, 40 % of the window height), or above its pin line, the window glides so that the header lands 12 px below its pin line (a category) or 8 px below it (a city). The glide runs on the fold's curve and clock, frame by frame, with `scrollTo({ behavior: 'instant' })` each frame.
   - *Closing deep.* If the section's top is above the window (header pinned), first scroll instantly so the section's top sits exactly where the pinned header already is: nothing visible moves. Then, if the page will end up too short to keep the header there, glide down to the final position, again on the fold's curve. The close duration stretches with that distance, `min(420, max(240, 0.45 × distance in px))` ms, and the same stretched duration is written to the section's `--fold-close`, so the fold and the glide still share one clock.
   - `overflow-anchor: none` on every fold body, as a precaution: scroll anchoring is the one browser behaviour that can move the scroll position by itself, so it is switched off where the content is animating. (Whether it caused the original jump was not isolated.)
   - A wheel or touch cancels a running glide; the person always wins.

5. **Why the glide never gets clamped (the inequality).** Let `D₀` be the document height when the motion starts, `V` the window height, `H` the body's full height, `S₀` the current scroll and `p(t) ∈ [0,1]` the eased progress. The browser allows at most `maxScroll(t) = D₀ ± H·p(t) − V`. The glide requests `S(t) = S₀ + (S₁ − S₀)·p(t)` with the target chosen as `S₁ = min(desired, D₀ ± H − V)`. Because `S₀ ≤ D₀ − V` and `p ≤ 1`, `maxScroll(t) − S(t) = (D₀ − V − S₀)·(1 − p) ≥ 0` for closing, and the same bound holds for opening. So the requested position is reachable at every frame; the browser never clamps, and the motion stays on the curve. (Picture: two coordinates, the fold height and the scroll, driven by one parameter along one path; the clamp is a hard wall; the path is chosen so it never touches the wall.) The full body height `H` of a closed section is readable before it opens: the grid row is 0 px tall, but its child keeps its natural `offsetHeight`.

6. **All at once is instant.** "Expand all" and "Collapse all" switch every section with transitions disabled (a `no-anim` class, a forced reflow, then the class removed). Ten heights moving together is noise, not information. "Collapse all" first scrolls instantly so the list's top sits under the top edge, so the result is one clean cut, not a jump followed by a scroll.

7. **Colour belongs to the category.** Each category has one hue, used only at category level: a tinted header band (8 % of the hue over the paper colour), the title and a solid number chip in the hue, a 4 px left edge on the whole card, the chevron button, the pinned header, and a dot beside the category's link at the top of the page. Job titles stay in ink on white. Scrolling, a black title on white is always a job; a coloured title on a tinted band is always a category.

8. **Cities are the same fold, one level down, and look like it.** Inside an open category, each city (Berlin, Leipzig area, rest of Germany) is its own fold with the same curve, clock and scroll handling. It is plainer than a category: no band and no serif title, but a mono capital label in the city's colour, a 6 % tint, a 4 px left edge and a 30 px chevron button. The city colour is the colour of the city pill on its cards, so the card and its panel agree. Each fold has a *pin line*, the height where its header sticks: a category's is the top of the window (or the bottom of the sticky top bar); a city's is its category's pin line plus the category header's height, which JavaScript measures and passes as `--head-h` (headers wrap on narrow screens). `reveal` and the deep-close pre-scroll use each fold's own pin line, so both levels behave the same. Cities start folded; their state is remembered per category and city. When the area chips narrow the list to one city, that city opens by itself (closing it there is not remembered once the filter is cleared); a search opens every category and city. Expand all / Collapse all reach both levels.

   One CSS change makes the pinned city header possible: the category body's clipping wrapper uses `overflow: clip`, not `overflow: hidden`. `hidden` makes the wrapper a scroll container, and a sticky element sticks to its nearest scroll container, so a city header inside it would pin to nothing. `clip` clips the same way but is not a scroll container, so the city header pins to the window.

Also: `aria-expanded` and `aria-controls` on the button, `aria-label` "Expand …"/"Collapse …", visible focus rings, and under `prefers-reduced-motion: reduce` every transition is 0.01 ms and the scroll moves instantly after the layout settles.

## 4. Parameters

| Name | Value | Where |
|---|---|---|
| Curve | `cubic-bezier(0.4, 0, 0.2, 1)`. Computed numerically: its speed peaks at 30 % of the duration, at 2.74 × the mean speed; it has covered 0.02 % of the distance after 1 % of the duration, 2.6 % after 10 %, 78 % after 50 % (the old curve `cubic-bezier(.2,.8,.2,1)` had covered 9.7 % after 2.4 % of its duration, which is why it looked like a snap) | JS `FOLD.curve`, CSS `--fold-ease` |
| Open | 320 ms | `FOLD.open`, `--fold-open` |
| Close | 240 ms, stretched to ≤ 420 ms with glide distance × 0.45 ms/px | `FOLD.close`, `--fold-close` (per section when stretched) |
| Body slide | 8 px down, fades from 0 | `.fold[data-open="0"] > .fold-i > *` |
| Reveal threshold | header below max(pin line + 48 px, 40 % of window height), or above its pin line | `reveal()` |
| Reveal margin | category: 12 px below its pin line; city: 8 px below its pin line (just under the category header) | `reveal()` |
| Pin lines | category: 0 (live app) or the top bar's bottom (repo page); city: category pin line + `--head-h` | `pinLine()`, CSS `top` of the sticky headers |
| Expand all / Collapse all | instant | `foldAll()` |
| Persistence | open categories, open cities and chosen area in `localStorage` (`radar.open`, `radar.openAreas`, `radar.area`; repo page: `pr.open`, `pr.openAreas`, `pr.applied`) | per browser, a convenience, never data |

## 5. The palette

Muted hues that sit with the paper, wine, amber and slate already used by the cards. In dark mode each hue is mixed 55 % with white; tints and hairlines are mixed with the paper colour, so they work on both grounds (`color-mix`).

| Category | Hue |
|---|---|
| Content creation (not school teaching) | `#7a1f2b` wine |
| AI training on physics & maths | `#5b3a8c` violet |
| Data analyst | `#34506a` slate blue |
| Computational scientist | `#0f7b83` teal |
| Numerical methods | `#2f5d3a` green |
| Systems engineer | `#8a5a0f` ochre |
| "Physiker" in the job title | `#b5451b` copper |
| Project management | `#3f5fb3` indigo |
| Production supervisor | `#5e6b1f` olive |
| Energy sector | `#9a2f6a` berry |
| Your record (live app only) | `#4a4440` grey |

Cities use the three colours the cards already used for their city pills, mixed into the paper colour for tints and hairlines:

| City | Colour (light / dark) |
|---|---|
| Berlin | wine `#7a1f2b` / `#e2a2aa` |
| Leipzig area | amber `#7a4b12` / `#e8bf7a` |
| Rest of Germany | slate `#34506a` (repo page `#3b4551`) / `#c3ccd6` |

## 6. Anatomy, enough to rebuild it

Markup of one section (attributes are the CSS and JS hooks):

```html
<section class="cat" id="cat-ai" data-cat="ai" data-collapsed="1">
  <header class="sec-head" data-head="1">            <!-- click: toggle -->
    <div class="head-main">
      <h2><span class="num">02</span>AI training on physics &amp; maths</h2>
      <p class="counts"><span class="lead">8 open</span> · Berlin 3/3 · Leipzig area 3/3 · Rest of Germany 2/3</p>
    </div>
    <div class="head-side">
      <button class="toggle" data-toggle="1" aria-expanded="false" aria-controls="cat-ai-body" aria-label="Expand AI training on physics & maths">
        <svg class="chev" viewBox="0 0 14 14"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </header>
  <div class="fold" data-fold="1" data-open="0" id="cat-ai-body" inert>
    <div class="fold-i"><div class="sec-body">… three city panels …</div></div>
  </div>
</section>
```

One city panel inside it (same hooks, one level down):

```html
<div class="area" id="area-ai-berlin" data-area="berlin" data-key="ai:berlin" data-collapsed="1">
  <div class="area-head" data-head="1">                 <!-- click: toggle -->
    <span class="area-name">Berlin</span>
    <span class="area-count"><span class="full">3 open</span> · aim 3</span>
    <button class="atoggle" data-toggle="1" aria-expanded="false" aria-controls="area-ai-berlin-body" aria-label="Expand Berlin, AI training on physics & maths">…same chevron…</button>
  </div>
  <div class="fold" data-fold="1" data-open="0" id="area-ai-berlin-body" inert>
    <div class="fold-i"><div class="area-body">… job cards …</div></div>
  </div>
</div>
```

The CSS that does the moving:

```css
.fold { display: grid; grid-template-rows: 1fr; overflow-anchor: none;
        transition: grid-template-rows var(--fold-open) var(--fold-ease); }
.fold > .fold-i { overflow: clip; min-height: 0; }            /* clip, not hidden: city headers inside can pin */
.fold > .fold-i > * { transition: opacity var(--fold-open) var(--fold-ease), transform var(--fold-open) var(--fold-ease); }
.fold[data-open="0"] { grid-template-rows: 0fr; transition-duration: var(--fold-close); }
.fold[data-open="0"] > .fold-i > * { opacity: 0; transform: translateY(-8px); transition-duration: var(--fold-close); }
.cat[data-collapsed="0"] > .sec-head { position: sticky; top: 0; z-index: 5; }   /* top: var(--bar-h) under a sticky bar */
.cat[data-collapsed="0"] > .sec-head .chev { transform: rotate(180deg); }
.chev { transition: transform var(--fold-open) var(--fold-ease); }
.area[data-collapsed="0"] > .area-head { position: sticky; top: var(--head-h); z-index: 4; }  /* calc(var(--bar-h) + var(--head-h)) under a bar */
.area[data-collapsed="0"] > .area-head .chev { transform: rotate(180deg); }
```

The JavaScript, in outline (the full versions are in the two files named at the top):

```js
setFold(node, open)   // flips data-collapsed, data-open, inert, aria-expanded, aria-label; no rebuild
glide(to, ms)         // rAF loop: scrollTo(from + (to-from)·ease(t/ms), 'instant'); cancelled by wheel/touch
pinLine(node)         // category: 0 or bar bottom; city: pinLine(category) + category header height
reveal(node)          // if header low or above its pin line: glide(min(scrollY + top − line − gap, pageEnd + growth), FOLD.open)
fold(node, open)      // closing & pinned: instant pre-scroll so the fold's top meets its pin line;
                      //   then if scrollY > pageEnd − bodyHeight: glide there over closeMs(distance)
toggleSec / toggleArea // remember the state, then fold(); a city under a one-city filter is remembered only in memory
foldAll(open)         // 'no-anim' class, flip every category and city, force reflow, remove class
headObserver          // ResizeObserver on each category header → --head-h on its section, for the city headers' sticky top
```

The bezier solver is twenty lines (Newton iteration on the parametric x, then evaluate y), so the JS curve is identical to the CSS one.

## 7. How to check it (the protocol)

Serve the page locally, drive it with Playwright at 1280 × 900 and 390 × 844 (and `colorScheme: 'dark'` where the page has a dark mode), sample once per `requestAnimationFrame`, and assert:

- Every section starts folded: `data-collapsed="1"`, `data-open="0"`, `inert` present, fold height 0. Opening a category shows three folded cities and no cards (a card counts as visible only if no closed fold contains it; clipped cards still have layout height).
- Header click opens; the round button closes; `aria-expanded` follows.
- **Curve:** at 18–20 ms the fold is below 12 % of its full height; it settles under 380 ms; the height never decreases while opening.
- **Header size:** the header's height is identical open and closed.
- **Opening low:** from the top of the page, open a section whose header sits below 40 % of the window; afterwards its top is 12 px below the top edge (or below the bar) and more than 300 px of its body is visible.
- **Closing deep:** put the last city of an open category under the pinned header; close the category; sample the header's top every frame. Its speed over 30 ms windows never exceeds 3.2 × (travel ÷ settle time); the curve's own peak is 2.74 ×, and a single frame is too noisy to judge (scroll and sampler can share a frame or sit one apart). The first, clamped version moved 116 px in one frame where the working one moves at most 27.
- **All at once:** Expand all opens every section; Collapse all closes every section.
- Open sections survive a page re-render (marking a card, adding a posting) and a reload.
- The ten `h2` colours are distinct and none equals a job title's colour.
- **Cities:** a city header uses a different font, under 60 % of the category title's size, in capitals; the three cities have three distinct edge colours, each equal to its label's colour. A city header click opens only that city; the city's own motion passes the same curve check.
- **Pinned stack:** with a city's top scrolled 120 px past its pin line, the category header sits at its pin line and the city header exactly at the category header's bottom (±1 px); scrolled into the next city, that city's header has taken the spot and the previous city has ended above it.
- **City deep close and low open:** closing a city from 200 px inside it keeps its header at the pin line or glides within the curve's speed limit; a city opened at 80 % of the window height glides to 8 px under the category header.
- **Both levels:** Expand all / Collapse all reach all 30 cities; one open category and one open city survive a reload; the Berlin chip shows Berlin open by itself, it can be closed there, and "All" brings back the remembered state; on the repo page a search opens every category and city and clearing it restores them.
- No page errors in the console.

All of this is automated in `design/test/` and runs with one command, `node design/test/run.mjs` (needs `playwright` and a Chromium): `repotest.cjs` and `citytest.cjs` against `index.html` (48 + 54 checks, in light, phone and dark), `foldtest.cjs` and `citytest.cjs` against the live app's view code in a stand-in harness (35 + 36 checks). 173 checks pass; three consecutive runs on 9 October 2026 gave the same result. Expectations are derived from the data, so a refreshed list does not break them; where a test drives a panel it first checks that the panel holds a posting and says so if not.

## 8. Things deliberately not done

- No `<details>` or `interpolate-size` animation: they depend on browser support that was not verified here; the grid-row technique needs none.
- No per-card "rise in" stagger on open: it adds a second clock and the user cannot tell what it is telling them.
- No smooth-scroll by the browser (`scroll-behavior: smooth` / `scrollIntoView`): the browser's smooth scroll is a separate animation with its own curve and gets clamped at the moment it is requested, which was observed: the first version's `scrollTo({ behavior: 'smooth' })` stopped 138 px short of its target (header at 150 px instead of 12 px) because the section had not grown yet.
- No colour on job cards beyond the area pill: colour is the category's and the city's signature.
- No per-city "+ Add posting": the button stays one per category, so the form and its area choice live in one place.
