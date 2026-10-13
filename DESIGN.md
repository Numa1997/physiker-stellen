# Physik Radar: design

This file is the design of Physik Radar, written down so that anyone (Numa, Claude, Astra, or a later session) can change the app without breaking how it looks.
Physik Radar is Numa's private board of physics job postings.
The same design was carried over to *Droplet Collection*, the site for Numa's thesis remodel; that site's `DESIGN.md` lists what it adds.

- **Source of truth.** The look is defined in `src/claude/styles/board.css`, and the page structure in `src/claude/view/page.js`. This file explains them. If the two ever disagree, the code wins, and this file needs updating.
- **Check.** `node scripts/design-check.mjs` checks four things: the token blocks, the contrast of every text colour in both themes, the fonts, and colour literals that bypass the tokens. Run it before every deploy that touches styles. Run `node scripts/design-check.mjs --tokens` to list all tokens.

---

## 1. Principles

Each line below is a decision recorded in the code comments of `board.css` and `page.js`. Keep them.

1. **The title is the biggest thing on the page.** The three counts (Open, Applied, Not relevant) sit beside the title as plain figures, separated by thin vertical lines, not as boxes.
2. **Every box has a visible border.** Numa's standing rule: no borderless cards, and no outlines so thin they look absent. Cards use a 1 px `--line-strong` outline. Sections add a 4 px coloured left edge.
3. **One colour per category.** The colour appears on the category's header band, its number badge, its title and its link at the top. Job titles inside stay black (`--ink`), so a category title never reads like a job title.
4. **Filters live behind one button.** Whatever is switched on is shown next to the button as a tag you can click away. It is never unclear what the board is showing.
5. **One fold-out card per category.** The header is the control, and the body unfolds beneath it. Folding happens in place, without rebuilding the page, so the height really animates.
6. **Nothing on screen jumps.** A section that opens low on the screen is brought up into view. A section closed from deep inside keeps its pinned header exactly where it is.
7. **One curve and two durations for everything that moves.** The fold, the chevron and the scroll glide share the same easing curve and clock.
8. **Everything starts folded.** The page opens as a column of category cards and you open the one you want. The browser remembers which sections are open.
9. **The theme is the reader's choice:** Auto (follows the system), Light or Dark, cycled by one button and stored per browser.

## 2. Files

| File | What it holds |
|---|---|
| `index.html` | The Google Fonts request (the only place fonts are loaded); links `board.css` and `gate.css`; mounts the app. |
| `src/main.tsx` | Imports `src/claude/boot.js` and nothing else. |
| `src/claude/styles/board.css` | **All tokens** (light, dark, auto) and every board component. |
| `src/claude/styles/gate.css` | The sign-in card and the fatal-error page. Always light; see section 9. |
| `src/claude/view/page.js` | The page: masthead, filter, sections, areas, cards, record, theme button, fold and scroll logic. |
| `src/claude/view/dom.js` | `el()`, a 30-line element builder; the chevron; date labels. |
| `backend/categories.mjs` | The category keys and labels, and the three areas. Each category key needs a colour in `board.css`; see section 4.3. |
| `scripts/design-check.mjs` | The design check. |

**Dead code.** `src/App.tsx`, `src/Radar.tsx` and `src/radar.css` are an earlier version of the board, set in Inter with a blue-grey palette. They are **not mounted**, because `src/main.tsx` imports only `boot.js`. They are not part of this design, and the check skips them. Delete them or leave them alone, but do not copy styles from them.

## 3. Typography

Three families, loaded once in `index.html`:

```
https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap
```

| Token | Family | Used for |
|---|---|---|
| `--serif` | `'Instrument Serif', Georgia, serif` | Titles: page title, category titles, card titles, form titles, tally figures |
| `--sans` | `'IBM Plex Sans', system-ui, sans-serif` | Running text, buttons, form fields |
| `--mono` | `'IBM Plex Mono', ui-monospace, monospace` | Labels: kicker, counts, card numbers, pills, the quote block, dates, filter labels |

**Instrument Serif exists in weight 400 only.** Never set it bold, because the browser would fake the bold and smear the letters. The check fails on any serif rule with weight 500 or more. To add emphasis, make it bigger or change its colour.

### Type scale

| Element | Rule (from `board.css`) |
|---|---|
| Page title `.top h1` | `400 clamp(46px, 7.4vw, 76px)/.98 var(--serif)`, letter-spacing −.012em |
| Tally figure `.tally .t b` | `400 44px/1 var(--serif)` (36 px under 720 px) |
| Category title `.cat h2` | `400 28px/1.15 var(--serif)` in `--cat` (24 px under 720 px) |
| Card title `.card h4` | `400 20px/1.2 var(--serif)` |
| Form title | `400 20px var(--serif)` |
| Body | `15px/1.5 var(--sans)` |
| Card company `.co` | `500 14px var(--sans)` |
| Note `.note` | `13px var(--sans)`, `--muted`, clamped to 3 lines until the card is opened |
| Kicker `.kicker` | `500 11px var(--mono)`, letter-spacing .12em, uppercase, `--wine` |
| Filter label `.flabel` | `500 11px var(--mono)`, .1em, uppercase, `--faint` |
| Tally label | `500 10.5px var(--mono)`, .08em, uppercase, `--muted` |
| Card top line `.card-top` | `11px var(--mono)`, `--faint` |
| Pill `.pill` | `500 10px var(--mono)`, .05em, uppercase |
| Quote `blockquote` | `11.5px/1.5 var(--mono)`, `--ink2` |
| Counts `.counts` | `12px var(--mono)`, `--muted` |
| Area name `.area-name` | `600 12.5px/1.2 var(--mono)`, .12em, uppercase, in the area colour |

Capitals are for short labels only (kicker, pills, area names, filter labels), never for running text.

## 4. Colour

Every colour is a token on `:root`. The dark theme redefines the same tokens twice, in two blocks that must stay identical:

- `:root[data-theme="dark"]`: the reader chose Dark.
- `@media (prefers-color-scheme: dark) { :root[data-theme="auto"] { … } }`: the reader chose Auto and the system is dark.

The check fails if those two blocks differ.

### 4.1 Tokens

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#f7f3ec` | `#17120f` | Page ground: warm paper / warm near-black |
| `--card` | `#fff` | `#211a17` | Cards, sections, inputs |
| `--quote` | `#fbf6ee` | `#2a211c` | Quote blocks, the Remove choice |
| `--line` | `#ddd3c3` | `#3d322b` | Hairlines inside cards, record rows |
| `--line-strong` | `#cdc1ae` | `#4a3e36` | **Every outline**; the masthead rule; tally separators |
| `--line-soft` | `#eee6d9` | `#2f2722` | The top border of a card's action row |
| `--ink` | `#1c1518` | `#f2ece3` | Text, job titles |
| `--ink2` | `#4a413d` | `#d9cfc3` | Secondary text, quote text |
| `--muted` | `#6f655f` | `#b3a699` | Notes, counts, utility buttons |
| `--faint` | `#8b8079` | `#9a8d81` | Card numbers, small mono labels (labels only, never paragraphs) |
| `--wine` / `--wine-soft` | `#7a1f2b` / `#f3e3e5` | `#e2a2aa` / `#3d2026` | The accent; Berlin; "Not relevant"; focus rings; tags |
| `--amber` / `--amber-soft` | `#7a4b12` / `#f6ead7` | `#e8bf7a` / `#3a2b14` | Leipzig; cards added by Numa (3 px left edge) |
| `--slate` / `--slate-soft` | `#34506a` / `#e3e9ef` | `#b9c6d4` / `#262c33` | Rest of Germany |
| `--ok` / `--ok-soft` | `#2f5d3a` / `#e3efe5` | `#8fc49a` / `#1f3325` | "Applied" |
| `--on-fill` | `#fff` | `#17120f` | Text on a filled button or badge |
| `--shade` | `rgba(28,21,24,.28)` | `rgba(0,0,0,.5)` | The shadow of an open section |

In the dark theme the accents turn into light tints of the same hue: wine becomes rose `#e2a2aa`, and amber becomes sand `#e8bf7a`. Dark grounds need light accents. The hue still says the same thing.

### 4.2 Contrast

Measured by `scripts/design-check.mjs`. The figures are WCAG contrast ratios; 4.5 is the minimum for body text and 3 for large titles and labels.

| Text | on `--bg` light | on `--card` light | on `--bg` dark | on `--card` dark |
|---|---|---|---|---|
| `--ink` | 16.23 | 17.95 | 15.83 | 14.60 |
| `--ink2` | 8.98 | 9.93 | 12.09 | 11.16 |
| `--muted` | 5.13 | 5.67 | 7.82 | 7.21 |
| `--faint` (labels only) | 3.48 | 3.85 | 5.75 | 5.31 |
| `--wine` | 9.22 | 10.20 | 8.84 | 8.15 |
| `--amber` | 6.68 | 7.39 | 10.77 | 9.93 |
| `--slate` | 7.59 | 8.39 | 10.70 | 9.87 |
| `--ok` | 6.91 | 7.64 | 9.32 | 8.60 |

`--faint` passes 3:1 but not 4.5:1 in light mode, so it is for short mono labels only, never for sentences.

### 4.3 Category colours

Each category has one base colour, set in `board.css` as `[data-cat="key"] { --cat-base: #…; }`. The other category colours are derived from it:

```
--cat       = --cat-base                                   light
            = color-mix(in srgb, --cat-base 55%, #fff)     dark (lightened toward white)
--cat-soft  = color-mix(in srgb, --cat 8%,  --card)        light header band
            = color-mix(in srgb, --cat 10%, --card)        dark header band
--cat-line  = color-mix(in srgb, --cat 35%, --card)        outline of an open or hovered section
```

| Key | Category | Base | Title on its band (light / dark) |
|---|---|---|---|
| `content` | Content creation | `#7a1f2b` wine | 8.85 / 4.72 |
| `ai` | AI training | `#5b3a8c` violet | 7.61 / 5.27 |
| `data` | Data analyst | `#34506a` slate | 7.41 / 5.40 |
| `computational` | Computational scientist | `#0f7b83` teal | 4.51 / 6.38 |
| `numerical` | Numerical methods | `#2f5d3a` green | 6.77 / 5.57 |
| `systems` | Systems engineer | `#8a5a0f` ochre | 5.29 / 6.07 |
| `physiker` | "Physiker" in the title | `#b5451b` rust | 4.89 / 6.02 |
| `pm` | Project management | `#3f5fb3` blue | 5.37 / 6.06 |
| `production` | Production supervisor | `#5e6b1f` olive | 5.24 / 6.18 |
| `energy` | Energy sector | `#9a2f6a` plum | 6.20 / 5.47 |
| `testing` | Device testing & measurement | `#3f6e12` leaf green | 5.44 / 6.03 |
| `record` | Your record, email log | `#4a4440` warm grey | 8.42 / 5.16 |

**Adding a category:**
1. Add `[key, label]` to `CATEGORIES` in `backend/categories.mjs`.
2. Add `[data-cat="key"] { --cat-base: #…; }` to `board.css`. Pick a hue that is not in the table above, at a lightness close to the others; the existing bases sit at roughly 4.5–10:1 against white.
3. Run the check. A title below 3:1 on its own band fails.

### 4.4 Area colours

| Area | Colour | Where |
|---|---|---|
| Berlin | `--wine` | The city pill on cards (`.pill.area-berlin`, soft fill + strong text); the city panel's 4 px left edge, tint and title |
| Leipzig area | `--amber` | Same, `.pill.area-leipzig` |
| Rest of Germany | `--slate` | Same, `.pill.area-de` |

Inside a city panel: `--area-tint` is 6 % of the area colour into the card, and `--area-line` is 30 %.

## 5. Shape and space

| Thing | Value |
|---|---|
| Page width | `.board`: max 1320 px, padding 0 20 px 80 px (16 px at the sides under 720 px) |
| Desktop column | From 1100 px: masthead, folded sections and footer sit in one centred column of `--col` = 840 px; an open section widens to the full board width (section 10a) |
| Masthead `.top` | Padding 26 px top, 22 px bottom; 1 px `--line-strong` rule underneath |
| Section stack `.sections` | Column, 12 px gap |
| Category section `.cat` | `--card` fill; 1 px `--line-strong` outline; **4 px left edge in `--cat`**; radius 10 px |
| Header band `.sec-head` | 16 px × 20 px padding, `--cat-soft` fill, radius 6 px 10 px 10 px 6 px |
| City panel `.area` | Area tint; 1 px area line; **4 px left edge in the area colour**; radius 8 px |
| Card `.card` | `--card`; 1 px `--line-strong`; radius 6 px; padding 14 px 14 px 12 px; 8 px gap |
| Card grid `.grid` | `repeat(auto-fill, minmax(290px, 1fr))`, 12 px gap |
| Buttons | Radius 4 px. Pills and the utility row, filter, tags and segments use 999 px (fully round). The section toggle is a 36 px circle. |
| Number badge `.num` | Radius 4 px, filled with `--cat`, `--on-fill` text |
| Shadow | Only on an open section: `0 12px 32px -20px var(--shade)` |

No other shadows. Depth comes from outlines and the paper/card contrast, not from blur.

## 6. Components

### Masthead (`header.top`)
- `.topline`: the `.kicker` on the left ("Physiker Stellen · private"). The `.utility` row on the right holds `.ubtn` buttons: Expand all, Collapse all, the theme button and Sign out. A `.ubtn` is a 13 px sans pill on a transparent ground that turns 6 % ink on hover. `.ubtn.quiet` is 12 px mono `--faint`.
- `.titlerow`: `h1` on the left; `.tally` on the right with three `.t` items (`<b>` figure, `<span>` label). Thin vertical lines go between items (`.t + .t::before`, 1 px `--line-strong` at 70 %). Applied is `--ok` and Not relevant is `--wine`.
- `.filterrow`: the `.fbtn` "Filter" pill (filled `--ink` while open), then one `.tag` per active filter (wine-soft fill, round × to clear). With no filters, it shows `.fnote` "Showing everything".
- `.fpanel`: the filter panel, folded with the same grid-rows technique as sections. Inside `.fcard`: a segmented control `.seg/.segbtn` for areas (the chosen one is raised on `--card`), then `.cchips` for categories (each with its colour dot and number; the chosen one is filled with its category colour).

### Category section (`section.cat`)
- **Header** `header.sec-head` (the whole header is clickable):
  - `.head-main` holds `h2` with a `.num` badge ("01"–"11") and the label, then `.counts`: "*N open* · Berlin n · Leipzig n · Rest n".
  - `.head-side` holds the round `.toggle` with a chevron. Its outline is `--cat-line`; it is filled with `--cat` while the section is open, and the chevron turns 180°.
- **Body** `.fold > .fold-i > .sec-body`:
  - `.sec-tools`, with the `.add` button "+ Add posting": wine outline that fills wine on hover. It opens `.addform`, which has a wine outline.
  - One `.area` per city.
- **While open:** the header is `position: sticky; top: 0`. A city header pins just under it, at `--head-h`, which is measured live by a ResizeObserver.

### City panel (`div.area`)
- `.area-head`: `.area-name` (mono capitals in the area colour), `.area-count`, and a 30 px round `.atoggle`.
- The body holds a `.grid` of cards, or an `.empty` note (dashed outline, `--faint`).

### Posting card (`article.card`)
Top to bottom:
1. `.card-top`: city pill, city, and `#n` (or "added by you").
2. `h4` title, linked to the posting.
3. `.orig`: the original German title, mono, `--faint`.
4. `.co`: the company.
5. `blockquote`: the employer's own wording about the degree, as proof. 2 px wine left edge, `--quote` fill, mono, in „German quotes".
6. `.note`: clamped to 3 lines.
7. `.card-more`: folds open with More/Less to show In short, Salary, Contract and Added rows. Each row has a `.lbl` in mono capitals.
8. `.actions`: "Open posting ↗" in wine, More, and Remove. Remove opens `.choose` (quote fill) with Applied (filled `--ok`), Not relevant (filled `--wine`) and Cancel.

`.card.mine` (a posting Numa added) gets a 3 px `--amber` left edge.

### Record (`section.cat.record`)
- Two columns, Applied and Not relevant. Each holds a list of rows (`grid-template-columns: 92px 1fr auto`): date, then title, meta and stage, then Undo.
- The stage label is a small outlined mono chip; Rejected is wine.

### Banner, footer, empty states
- `.banner`: a save problem. 3 px wine left edge on wine-soft.
- `footer`: `--line` rule, 12.5 px `--faint`.
- `.empty`: dashed `--line-strong`.

## 7. Motion

```
--fold-ease:  cubic-bezier(.4, 0, .2, 1)
--fold-open:  320ms
--fold-close: 240ms   (stretched up to 420 ms when closing also drops the page: 0.45 ms per px of drop)
```

- **Fold:** `.fold` animates `grid-template-rows` from `0fr` to `1fr`. At the same time its children fade in and slide 8 px down.
- **Chevron:** rotates 180° on the same curve.
- **Scroll glide:** `page.js` `glide()` scrolls on the same Bézier curve and clock, frame by frame. A wheel or touch movement cancels it.
- **Expand all / Collapse all:** applied with no animation, because thirty heights moving at once is noise, not information.
- **Hover:** colour and background transitions of .15 s.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, the folds, chevrons, toggles, section headers and the filter panel drop to 0.01 ms, and the glide jumps straight to its end.

## 8. Theme

- `page.js` sets `data-theme` on `<html>` to `auto`, `light` or `dark`. It is stored in `localStorage` under `radar.theme`.
- The `.ubtn.theme` button cycles Auto → Light → Dark → Auto. Its icon is a half-filled circle for Auto, a sun for Light and a moon for Dark, with the label beside it.
- Every colour is a token, so the whole board switches with the token blocks.
- In the dark theme the category colours are lightened 45 % toward white, and their bands use 10 % instead of 8 %.

## 9. Deliberate exceptions

- **`gate.css`, the sign-in card:** literal colours on a fixed light card. The theme is chosen inside the board, after sign-in, so the sign-in screen stays light for everyone. The check allows this file.
- **Category base colours** in `[data-cat]` are literals by definition. The check allows those lines and the `#fff` used to lighten them for dark mode.

## 10. Phones (`max-width: 720px`)

- Board side padding drops to 16 px.
- Tally items get 14 px side padding and 36 px figures.
- Category titles drop to 24 px; the section header padding to 14 px; the body padding to 0 12 px 14 px; the toggle to 34 px.
- The card grid, the add form and the record become one column. Record rows put the date on its own line.

## 10a. Desktops (`min-width: 1100px`)

Added 13 Oct 2026 because the folded categories stretched across the whole screen as long, mostly empty bands.

- The masthead, the banner, the folded sections and the footer sit in one centred column, `--col` = 840 px wide, about the proportions of the phone layout.
- A section that is open breaks out to the full board width (up to 1280 px of content), so its cards still sit four across. The width change follows the fold's own curve and clock (`--fold-open` / `--fold-close`).
- Only widths change; nothing moves sideways or changes order, so the scroll and fold logic of section 7 is unchanged.
- Below 1100 px nothing changes: phones (section 10) and tablets render exactly as before. This was checked pixel for pixel at 390, 430, 720, 1024 and 1099 px.

## 11. Accessibility

- **Focus:** a 2 px wine outline with a 2 px offset on every interactive element.
- **Folds:** toggles carry `aria-expanded` and `aria-controls`, and their `aria-label` changes between "Expand …" and "Collapse …". Closed folds are `inert`, so the keyboard skips hidden content.
- **Text contrast:** every text token passes 4.5:1, except `--faint`, which is kept to labels (section 4.2).
- **Motion:** respects reduced motion (section 7).

## 12. Do and don't

- **Do:** take every colour from a token. If a new colour is needed, add a token in all three blocks.
- **Do:** give every box a visible 1 px `--line-strong` outline.
- **Do:** keep job titles `--ink`. Category colour goes on the category's own header only.
- **Don't:** set Instrument Serif bold or in capitals.
- **Don't:** wrap tally figures in boxes, because they are plain figures.
- **Don't:** add shadows to cards. The only shadow is on an open section.
- **Don't:** load another font, or restyle from `src/radar.css` (dead code).
