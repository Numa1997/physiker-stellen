#!/usr/bin/env python3
"""Puts the current postings and list date into the repository's single-file page, changing nothing else.

    sync_page.py backend/data/postings.json backend/data/meta.json index.html

index.html embeds the list as one line `const DATA = [...];` and the date as `const UPDATED = "...";`. This script rewrites exactly
those two lines, so `python3 design/build.py --check` keeps passing (build.py copies the two lines through byte for byte).
"""
import json, sys

postings_path, meta_path, page_path = sys.argv[1:4]
postings = [p for p in json.load(open(postings_path)) if not p.get('_end')]
postings.sort(key=lambda p: p['n'])
meta = {m['key']: m['value'] for m in json.load(open(meta_path)) if not m.get('_end')}
page = open(page_path).read()
a = page.index('const DATA = '); b = page.index(';\n', a)
page = page[:a] + 'const DATA = ' + json.dumps(postings, ensure_ascii=False) + page[b:]
a = page.index('const UPDATED = '); b = page.index(';\n', a)
page = page[:a] + 'const UPDATED = ' + json.dumps(meta['updated']) + page[b:]
open(page_path, 'w').write(page)
print(f'{page_path}: {len(postings)} postings, {sum(1 for p in postings if not p.get("removed_on"))} open, updated {meta["updated"]}')
