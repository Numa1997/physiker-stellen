#!/usr/bin/env python3
"""Prints the category × area table of open postings and the cells still under the aim.

    gaps.py postings.json [--aim 3] [--json]

Run it before searching (to know where to look) and after adding (to report). The categories are the live app's ten keys.
"""
import argparse, collections, json

CATS = [('content', 'Content creation (not school teaching)'), ('ai', 'AI training on physics & maths'), ('data', 'Data analyst'),
        ('computational', 'Computational scientist'), ('numerical', 'Numerical methods'), ('systems', 'Systems engineer'),
        ('physiker', '"Physiker" in the job title'), ('pm', 'Project management'), ('production', 'Production supervisor'), ('energy', 'Energy sector')]
AREAS = [('berlin', 'Berlin'), ('leipzig', 'Leipzig area'), ('de', 'Rest of Germany')]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('postings'); ap.add_argument('--aim', type=int, default=3); ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    rows = [p for p in json.load(open(a.postings)) if not p.get('_end') and not p.get('removed_on')]
    c = collections.Counter((p['category'], p['location_group']) for p in rows)
    gaps = []
    for k, _ in CATS:
        for g, _ in AREAS:
            if c[(k, g)] < a.aim: gaps.append({'category': k, 'area': g, 'open': c[(k, g)], 'missing': a.aim - c[(k, g)]})
    if a.json: print(json.dumps({'open': len(rows), 'gaps': gaps}, indent=1)); return
    print(f'{len(rows)} open postings; aim {a.aim} per cell\n')
    print(f"{'category':40s} {'Berlin':>7s} {'Leipzig':>8s} {'Rest DE':>8s}")
    for k, label in CATS:
        cells = [c[(k, g)] for g, _ in AREAS]
        print(f'{label:40s} ' + ' '.join(f'{("*" if n < a.aim else " ") + str(n):>{w}s}' for n, w in zip(cells, (7, 8, 8))))
    print(f'\n{len(gaps)} cells under the aim, {sum(g["missing"] for g in gaps)} postings missing:')
    for g in gaps: print(f"  {g['category']:13s} {g['area']:7s} {g['open']}/{a.aim}")


if __name__ == '__main__':
    main()
