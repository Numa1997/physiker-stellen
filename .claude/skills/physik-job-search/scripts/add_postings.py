#!/usr/bin/env python3
"""Adds verified postings to postings.json (and deletes others), with the checks that caught real mistakes.

    add_postings.py postings.json batch.json            apply
    add_postings.py postings.json batch.json --dry-run  only report

batch.json:
{
  "remove": {"406": "Mercor listing shows 'no longer accepting applications' (checked 2026-10-08)."},
  "update": {"403": {"url": "https://wavelabs.jobs.personio.de/job/2801341?language=de", "note": "..."}},
  "add": [ { "title": "...", "title_original": "...", "company": "...", "city": "...", "location_group": "berlin|leipzig|de",
             "category": "<one of the ten keys>", "employment": "Full-time"|null, "url": "https://...",
             "eligibility_quote_de": "<exact sentence from the ad>", "eligibility_en": "<what it means for a BSc physicist>",
             "salary": "..."|null, "note": "<what the job is; where it was found; any label: remote / job board / recruiter / distance>" } ]
}

"update" changes fields of an existing posting in place (a moved link, a corrected note, a relabelled city); n, added_on and the
removal fields cannot be changed that way.

Checks, each the trace of an error made on 8 Oct 2026:
- the url must not already be in the file (removed postings are deleted outright since 9 Oct 2026; the closed-leads list in
  references/sources.md section E is the memory of what was struck off and why)
- company + title must not already be open (one ad listed in several offices was added twice: BearingPoint #375/#376)
- category and location_group must be known keys; the eligibility quote must be non-empty and in German-looking text
- n is max(n)+1 over the rows present; the list was renumbered 1..89 on 9 Oct 2026 (backend/renumber-map.mjs moves the owner's
  marks once); a number freed by a removal is not reused while higher numbers exist
- added_on is today
"""
import argparse, datetime, json, re, sys

CATS = ['content', 'ai', 'data', 'computational', 'numerical', 'systems', 'physiker', 'pm', 'production', 'energy']
AREAS = ['berlin', 'leipzig', 'de']
REQUIRED = ['title', 'title_original', 'company', 'city', 'location_group', 'category', 'url', 'eligibility_quote_de', 'eligibility_en', 'note']


def norm(s): return re.sub(r'\W+', ' ', (s or '').lower()).strip()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('postings'); ap.add_argument('batch'); ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    data = json.load(open(a.postings)); spec = json.load(open(a.batch))
    end = [x for x in data if x.get('_end')]; body = [x for x in data if not x.get('_end')]
    byn = {x['n']: x for x in body}
    today = datetime.date.today().isoformat()
    problems = []

    for n, why in (spec.get('remove') or {}).items():
        n = int(n)
        if n not in byn: problems.append(f'remove: no posting #{n}'); continue
        gone = byn.pop(n); body.remove(gone)
        print(f'removed #{n} {gone["company"][:30]} | {gone["url"]}')
        print(f'  -> add to references/sources.md section E: {gone["company"]} {gone["title"]} ({why})')

    for n, fields in (spec.get('update') or {}).items():
        n = int(n)
        if n not in byn: problems.append(f'update: no posting #{n}'); continue
        bad = [k for k in fields if k in ('n', 'added_on', 'removed_on', 'removed_why')]
        if bad: problems.append(f'update #{n}: {bad} cannot be changed here (use remove)'); continue
        for k, v in fields.items():
            print(f'update #{n} {k}: {str(byn[n].get(k))[:60]!r} -> {str(v)[:60]!r}'); byn[n][k] = v

    urls = {x['url'].rstrip('/') for x in body}
    open_keys = {(norm(x['company']), norm(x['title'])) for x in body}
    nx = max(byn) + 1 if byn else 1
    for p in spec.get('add') or []:
        miss = [k for k in REQUIRED if not p.get(k)]
        if miss: problems.append(f'add {p.get("company")}: missing {miss}'); continue
        if p['category'] not in CATS: problems.append(f'add {p["company"]}: unknown category {p["category"]}'); continue
        if p['location_group'] not in AREAS: problems.append(f'add {p["company"]}: unknown area {p["location_group"]}'); continue
        if p['url'].rstrip('/') in urls: problems.append(f'add {p["company"]}: url already in the file (open or removed): {p["url"]}'); continue
        key = (norm(p['company']), norm(p['title']))
        if key in open_keys: problems.append(f'add {p["company"]}: same company + title already open'); continue
        if not re.search(r'[äöüß]|Studium|Abschluss|abgeschlossen|Bachelor|Master|Promotion|degree', p['eligibility_quote_de']):
            problems.append(f'add {p["company"]}: eligibility_quote_de does not look like the ad\'s own wording')
        row = {'n': nx, 'title': p['title'], 'title_original': p['title_original'], 'company': p['company'], 'city': p['city'],
               'location_group': p['location_group'], 'category': p['category'], 'employment': p.get('employment'), 'url': p['url'],
               'eligibility_quote_de': p['eligibility_quote_de'], 'eligibility_en': p['eligibility_en'], 'salary': p.get('salary'),
               'note': p['note'], 'added_on': today}
        body.append(row); urls.add(p['url'].rstrip('/')); open_keys.add(key)
        print(f'added #{nx} {p["category"]:13s} {p["location_group"]:7s} {p["company"][:40]}'); nx += 1

    if problems:
        print('\nPROBLEMS (nothing written):', file=sys.stderr)
        for x in problems: print(' -', x, file=sys.stderr)
        sys.exit(1)
    if a.dry_run: print('dry run: nothing written'); return
    json.dump(body + end, open(a.postings, 'w'), ensure_ascii=False, indent=1)
    print('written', a.postings)


if __name__ == '__main__':
    main()
