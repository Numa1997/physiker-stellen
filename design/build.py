#!/usr/bin/env python3
"""Rebuilds ../index.html from the page parts in this folder.

    python3 design/build.py            # rewrite index.html
    python3 design/build.py --check    # exit 1 if index.html is not exactly what the parts produce

The look and behaviour live in design/page.css and design/page.js; the ten
categories and the aim per city in design/categories.json. The postings (the
DATA line) and the list date (UPDATED) are NOT in the parts: they are read from
the current index.html and copied through byte for byte, so refreshing the list
means editing those two lines in index.html and nothing else. Never edit the
CSS or the script inside index.html: change the parts and run this.

page.js is a template, not valid JavaScript on its own: __CATS__ and __TARGET__
are filled in here. Check the built page with `node --check` on its script.
"""
import json, pathlib, sys

here = pathlib.Path(__file__).parent
root = here.parent
index = root / 'index.html'

old = index.read_text()
head = old.split('\n', 1)[0]  # the artifact's own first line (charset, viewport, base reset) stays as it is

DATA_OPEN, DATA_CLOSE = 'const DATA = ', ';\nconst UPDATED = '
a = old.index(DATA_OPEN) + len(DATA_OPEN)
b = old.index(DATA_CLOSE)
data_raw = old[a:b]
c = b + len(DATA_CLOSE)
updated_raw = old[c:old.index(';\n', c)]

cfg = json.loads((here / 'categories.json').read_text())
css = (here / 'page.css').read_text().rstrip('\n')
js = (here / 'page.js').read_text().rstrip('\n')
js = js.replace('__CATS__', json.dumps(cfg['categories'], ensure_ascii=False)).replace('__TARGET__', str(cfg['target_per_area']))
target = cfg['target_per_area']

page = f"""{head}
<title>Physik Radar</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
{css}
</style>

<div class="wrap">
  <header class="mast">
    <div class="topline">
      <p class="eyebrow">Job dossier · Numa · BSc Physics, Leipzig</p>
      <div class="utility" role="group" aria-label="Open or close all categories"><button class="ubtn" id="expand-all" type="button">Expand all</button><button class="ubtn" id="collapse-all" type="button">Collapse all</button></div>
    </div>
    <div class="titlerow">
      <h1>Physics roles, Berlin &amp; Leipzig</h1>
      <div class="figs" id="figs"></div>
    </div>
    <p class="lede">Every posting accepts a Bachelor's in physics or natural science and names it in the ad; the grey box on each card is the employer's own wording, as proof. Links go to the employer's own page, or to the job board where the employer has none.</p>
    <div class="filterrow">
      <button class="fbtn" id="fbtn" type="button" aria-expanded="false" aria-controls="fpanel">Filter</button>
      <span class="ftags" id="ftags"></span>
    </div>
    <div class="fpanel" id="fpanel" data-open="0" inert><div class="fpanel-i"><div class="fcard">
      <div><p class="flabel">Search</p><input id="q" class="search" type="search" placeholder="Title, company, city, skill" aria-label="Search"></div>
      <div><p class="flabel">Area</p><div class="seg" role="group" aria-label="Area">
        <button class="segbtn on" type="button" data-loc="all" aria-pressed="true">All areas <span class="n" data-n="all"></span></button>
        <button class="segbtn" type="button" data-loc="berlin" aria-pressed="false">Berlin <span class="n" data-n="berlin"></span></button>
        <button class="segbtn" type="button" data-loc="leipzig" aria-pressed="false">Leipzig area <span class="n" data-n="leipzig"></span></button>
        <button class="segbtn" type="button" data-loc="de" aria-pressed="false">Rest of Germany <span class="n" data-n="de"></span></button>
      </div></div>
      <div><p class="flabel">Category · pick one to show only that</p><div class="cchips" id="ccats" role="group" aria-label="Category"></div></div>
    </div></div></div>
  </header>
  <main class="cats" id="cats"></main>
  <footer id="foot"></footer>
</div>

<script>
{DATA_OPEN}{data_raw}{DATA_CLOSE}{updated_raw};
{js}
</script>

</body></html>
"""

if '--check' in sys.argv:
    if page == old:
        print('index.html is exactly what design/ produces.')
        sys.exit(0)
    print('index.html differs from what design/ produces. Run: python3 design/build.py', file=sys.stderr)
    sys.exit(1)

index.write_text(page)
print(f'wrote {index} ({len(page)} bytes)')
