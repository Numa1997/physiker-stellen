"""Build backend/data/*.json for AppDeploy from saved Supabase query results.

Read-only copy: the queries were SELECTs; Supabase is not modified.
Each chunk carries the md5 Postgres computed over the exact text, and this
script refuses to write anything whose md5 does not match.
"""
import glob, hashlib, json, os, re, sys

SESSION = os.path.expanduser('~/.claude/projects/-home-user-physiker-stellen/0d593456-0941-5832-a52b-82e4732bd228')
OUT = os.path.join(os.path.dirname(__file__), 'data')


def rows_from(text):
    """Pull the row array out of an execute_sql result wrapper (any nesting)."""
    while True:
        try:
            obj = json.loads(text)
        except json.JSONDecodeError:
            break
        if isinstance(obj, list) and obj and isinstance(obj[0], dict) and 'text' in obj[0]:
            text = obj[0]['text']
        elif isinstance(obj, dict) and 'result' in obj:
            text = obj['result']
        else:
            return obj
    m = re.search(r'<untrusted-data-[0-9a-f-]+>\s*(\[.*\])\s*</untrusted-data', text, re.S)
    return json.loads(m.group(1))


def candidates():
    for p in glob.glob(os.path.join(SESSION, 'tool-results', '*')):
        yield open(p, encoding='utf-8').read()
    # results small enough to stay inline live only in the transcript
    for line in open(os.path.join(SESSION, '..', '0d593456-0941-5832-a52b-82e4732bd228.jsonl'), encoding='utf-8'):
        if '"t\\\\\\":\\\\\\"companies' in line or 'companies' in line and 'md5' in line:
            entry = json.loads(line)
            for block in (entry.get('message') or {}).get('content') or []:
                if isinstance(block, dict) and block.get('type') == 'tool_result':
                    c = block.get('content')
                    yield c if isinstance(c, str) else json.dumps(c)


chunks = {}
for text in candidates():
    try:
        rows = rows_from(text)
    except Exception:
        continue
    if not isinstance(rows, list):
        continue
    for r in rows:
        if isinstance(r, dict) and {'md5', 's'} <= r.keys():
            if hashlib.md5(r['s'].encode('utf-8')).hexdigest() != r['md5']:
                sys.exit(f"md5 mismatch in chunk {r.get('t') or r['md5']}")
            chunks[r['md5']] = (r.get('t') or 'postings', r['s'])

by_table = {}
for t, s in chunks.values():
    by_table.setdefault(t, []).extend(json.loads(l) for l in s.split('\n'))

by_table['postings'].sort(key=lambda p: (p['sort_order'], p['n']))
expect = {'postings': 115, 'companies': 29, 'job_boards': 6, 'meta': 10, 'journal': 10}
for t, n in expect.items():
    got = len(by_table.get(t, []))
    if got != n:
        sys.exit(f'{t}: expected {n} rows, got {got}')
ns = [p['n'] for p in by_table['postings']]
assert len(ns) == len(set(ns)), 'duplicate n'
assert sum(p['removed_on'] is None for p in by_table['postings']) == 113, 'live count'
assert sum(len(j['changes']) for j in by_table['journal']) == 32, 'journal changes'

os.makedirs(OUT, exist_ok=True)
for t, rows in by_table.items():
    lines = [json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in rows]
    lines.append('{"_end":true}')
    with open(os.path.join(OUT, t + '.json'), 'w', encoding='utf-8') as f:
        f.write('[\n' + ',\n'.join(lines) + '\n]\n')
    back = [r for r in json.load(open(os.path.join(OUT, t + '.json'), encoding='utf-8')) if '_end' not in r]
    assert back == rows, t
    print(f'{t:11s} {len(rows):4d} rows  {os.path.getsize(os.path.join(OUT, t + ".json")):7d} bytes')
