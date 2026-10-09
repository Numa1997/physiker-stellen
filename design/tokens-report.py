#!/usr/bin/env python3
"""Contrast audit of the design tokens, read straight from the stylesheets.

    python3 design/tokens-report.py            # prints markdown tables
    python3 design/tokens-report.py --fail     # prints only the pairs that miss their WCAG target
    python3 design/tokens-report.py --matrix   # one row per category: title and number-chip contrast in the three themes

Reads design/live-app/board.css (live app, light only) and design/page.css
(single-file page, light and dark). Nothing is typed in by hand: change a
token in the CSS and the numbers change. WCAG 2.x relative-luminance contrast;
targets: 4.5 for normal text, 3.0 for large text (24 px, or 18.66 px bold) and
for non-text parts of controls.
"""
import re, sys, pathlib

here = pathlib.Path(__file__).parent
LIVE = (here / 'live-app' / 'board.css').read_text()
PAGE = (here / 'page.css').read_text()


def hex_to_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, pct, b):
    """CSS color-mix(in srgb, a pct%, b): per-channel interpolation of opaque colours."""
    return tuple(round(x * pct / 100 + y * (100 - pct) / 100) for x, y in zip(a, b))


def lum(rgb):
    def f(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = map(f, rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg, bg):
    a, b = sorted((lum(fg), lum(bg)), reverse=True)
    return (a + 0.05) / (b + 0.05)


def block(css, start_pattern):
    """The text of the first {...} block whose selector matches start_pattern."""
    m = re.search(start_pattern + r'\s*\{([^}]*)\}', css)
    return m.group(1) if m else ''


def tokens(text):
    return {k: v.strip() for k, v in re.findall(r'--([\w-]+)\s*:\s*([^;]+);', text)}


def resolve(t):
    out = {}
    for k, v in t.items():
        if re.fullmatch(r'#[0-9a-fA-F]{3,6}', v):
            out[k] = hex_to_rgb(v)
    return out


def cats(css, var):
    return {k: hex_to_rgb(v) for k, v in re.findall(r'\[data-cat="(\w+)"\]\s*\{\s*--' + var + r':\s*(#[0-9a-fA-F]{6})', css)}


def areas(css, tok):
    out = {}
    for k, name in re.findall(r'\[data-area="(\w+)"\]\s*\{\s*--area:\s*var\(--([\w-]+)\)', css):
        out[k] = tok[name]
    return out


WHITE = (255, 255, 255)
BLACK_HOVER = None

themes = {}
# live app: light only. --card is the paper colour.
t = resolve(tokens(block(LIVE, r':root')))
themes['Live app, light'] = dict(tok=t, paper=t['card'], cat=cats(LIVE, 'cat'), onfill=WHITE, base=None, soft=8, line=35, area_soft=6)
# single-file page: light and dark
t = resolve(tokens(block(PAGE, r':root')))
themes['Page, light'] = dict(tok=t, paper=t['paper'], cat=cats(PAGE, 'cat-base'), onfill=t['paper'], base='light', soft=8, line=35, area_soft=6)
d = dict(t); d.update(resolve(tokens(block(PAGE, r':root\[data-theme="dark"\]'))))
dcat = {k: mix(v, 55, WHITE) for k, v in cats(PAGE, 'cat-base').items()}
themes['Page, dark'] = dict(tok=d, paper=d['paper'], cat=dcat, onfill=d['paper'], base='dark', soft=8, line=35, area_soft=6)

LARGE, NORMAL, UI = 3.0, 4.5, 3.0
rows = []  # (theme, what, fg, bg, ratio, target)


def add(th, what, fg, bg, target):
    rows.append((th, what, ratio(fg, bg), target))


for name, th in themes.items():
    tok, paper = th['tok'], th['paper']
    ink, muted = tok['ink'], tok['muted']
    bg = tok['bg']
    ink2 = tok.get('ink2', ink)
    add(name, 'Body text: ink on paper', ink, paper, NORMAL)
    add(name, 'Notes: ink2 on paper (live app uses muted)', ink2 if name != 'Live app, light' else muted, paper, NORMAL)
    add(name, 'Muted on paper (counts, meta, 10-12 px mono)', muted, paper, NORMAL)
    add(name, 'Muted on page background', muted, bg, NORMAL)
    if 'faint' in tok:
        add(name, 'Faint on paper (original title, card top, 11 px mono)', tok['faint'], paper, NORMAL)
    add(name, 'Link / wine on paper', tok['wine'], paper, NORMAL)
    add(name, 'Pill: Berlin (wine on wine-soft, 10 px)', tok['wine'], tok['wine-soft'], NORMAL)
    add(name, 'Pill: Leipzig (amber on amber-soft, 10 px)', tok['amber'], tok['amber-soft'], NORMAL)
    add(name, 'Pill: Rest of Germany (slate on slate-soft, 10 px)', tok['slate'], tok['slate-soft'], NORMAL)
    add(name, 'Employer quote text on quote box', ink2 if 'ink2' in tok else (74, 65, 61), tok.get('quote', (251, 246, 238)), NORMAL)
    # areas
    ar = areas(PAGE if th['base'] else LIVE, tok)
    for a, col in ar.items():
        tint = mix(col, th['area_soft'], paper)
        add(name, f'City label {a}: colour on its 6 % tint (12.5 px, 600)', col, tint, NORMAL)
        add(name, f'City count text {a}: muted on tint (12 px)', muted, tint, NORMAL)
        add(name, f'City button open {a}: icon on fill (non-text)', th['onfill'], col, UI)
        add(name, f'City edge {a} against paper (non-text)', col, paper, UI)
    # categories
    for k, col in th['cat'].items():
        soft = mix(col, th['soft'], paper)
        add(name, f'Category title {k}: on 8 % band (28 px, large)', col, soft, LARGE)
        add(name, f'Category number chip {k}: text on fill (11 px, 500)', th['onfill'], col, NORMAL)
        add(name, f'Category counts {k}: muted on band (12 px)', muted, soft, NORMAL)
        add(name, f'Category edge and chevron {k} against paper (non-text)', col, paper, UI)

if '--matrix' in sys.argv:
    # one row per category: hue, and the contrast of its title (large text, target 3.0) and number chip (small text, 4.5)
    names = list(themes)
    live, pl, pd = (themes[n] for n in names)
    print('| Category | Hue (light) | Title on band: live / page / dark | Number chip: live / page / dark |')
    print('|---|---|---|---|')
    for k in live['cat']:
        cells_t, cells_c = [], []
        for th in (live, pl, pd):
            if k not in th['cat']:          # 'record' exists in the live app only
                cells_t.append('n/a'); cells_c.append('n/a'); continue
            col = th['cat'][k]; soft = mix(col, th['soft'], th['paper'])
            cells_t.append(f"{ratio(col, soft):.1f}"); cells_c.append(f"{ratio(th['onfill'], col):.1f}")
        hexv = '#%02x%02x%02x' % live['cat'][k]
        print(f"| {k} | `{hexv}` | {' / '.join(cells_t)} | {' / '.join(cells_c)} |")
    sys.exit(0)

only_fail = '--fail' in sys.argv
by_theme = {}
for th, what, r, target in rows:
    by_theme.setdefault(th, []).append((what, r, target))
bad = 0
for th, items in by_theme.items():
    print(f'### {th}\n')
    print('| Pair | Ratio | Target | Result |')
    print('|---|---|---|---|')
    for what, r, target in items:
        ok = r >= target
        bad += not ok
        if only_fail and ok:
            continue
        print(f'| {what} | {r:.2f} | {target:.1f} | {"pass" if ok else "**below target**"} |')
    print()
print(f'{len(rows)} pairs checked, {bad} below their WCAG target.', file=sys.stderr)
