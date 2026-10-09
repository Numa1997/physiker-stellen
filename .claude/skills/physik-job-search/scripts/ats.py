#!/usr/bin/env python3
"""List the open jobs on one employer's applicant-tracking board, with the degree sentences, in one call.

    ats.py greenhouse agency                       Greenhouse board token (boards-api.greenhouse.io/v1/boards/<token>)
    ats.py ashby anyone-ai                         Ashby org slug (jobs.ashbyhq.com/<slug>)
    ats.py lever <org>                             Lever org (jobs.lever.co/<org>)
    ats.py smartrecruiters Enpal                   SmartRecruiters company id (jobs.smartrecruiters.com/<Company>/...)
    ats.py workday ag.wd3.myworkdayjobs.com/ag/Airbus    Workday host/tenant/site; tenant is the first host label, site the path after the host
    ats.py personio adragos-leipzig                Personio subdomain (<sub>.jobs.personio.de); reads the HTML list, the XML feed is gone
    ats.py softgarden westermann-gruppe            softgarden subdomain (<sub>.softgarden.io)
    ats.py successfactors jobs.example.com --loc Leipzig    SuccessFactors career site host

Options:
    --q TEXT        search text where the system supports it (Workday, SmartRecruiters)
    --title REGEX   keep only titles matching (case-insensitive)
    --grep REGEX    keep only jobs whose title or description matches; default is the physics/natural-science vocabulary
                    (physik|physic|naturwiss|natural scien|\\bmint\\b|\\bstem\\b|mathemat); pass --grep . to keep everything
    --loc REGEX     keep only locations matching (and the SuccessFactors location search)
    --all           do not filter at all (same as --grep . --title .)
    --json          print the raw records instead of the report

Why one script: every board has an API or a plain listing page that returns every open job and its text in one
or two requests, which is cheaper and more complete than searching. Output per job is one line
"* title | location | date | url" followed by up to three sentences that mention a degree, so the eligibility
check can be made from the output alone; open the url only for the postings that pass.

Fetching goes through curl (honours the sandbox proxy and its CA bundle). No third-party Python packages.
"""
import argparse, html, json, re, subprocess, sys, urllib.parse
import xml.etree.ElementTree as ET

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
DEGREE = re.compile(r'[^.•\n]{0,100}(?:Studium|Hochschul|Bachelor|Master|Promotion|PhD|Ph\.D|degree|Physik|physics|physicist|Naturwiss|natural scien|\bMINT\b|\bSTEM\b)[^.•\n]{0,160}', re.I)
PHYS = r'physik|physic|naturwiss|natural scien|\bmint\b|\bstem\b|mathemat'


def curl(url, data=None, headers=()):
    cmd = ['curl', '-sS', '-L', '--compressed', '-m', '35', '-A', UA, '-H', 'Accept-Language: de-DE,de;q=0.9,en;q=0.8']
    for h in headers: cmd += ['-H', h]
    if data is not None: cmd += ['-X', 'POST', '-H', 'Content-Type: application/json', '-d', json.dumps(data)]
    cmd.append(url)
    r = subprocess.run(cmd, capture_output=True)
    return r.stdout.decode('utf-8', 'ignore')


def get_json(url, data=None):
    t = curl(url, data, headers=['Accept: application/json'])
    try: return json.loads(t)
    except Exception: return {'_error': t[:300]}


def clean(s):
    s = re.sub(r'(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>', ' ', s or '')
    s = re.sub(r'(?i)<br\s*/?>|</(p|div|li|tr|h\d|section)>', '\n', s)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    return re.sub(r'[ \t\xa0]+', ' ', s).strip()


# ---- one function per system: returns [{title, location, date, url, text, raw}] -------------------------------
def greenhouse(board, q=None):
    d = get_json(f'https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true')
    out = []
    for j in d.get('jobs', []):
        out.append({'title': j.get('title', ''), 'location': (j.get('location') or {}).get('name', ''), 'date': (j.get('updated_at') or '')[:10],
                    'url': j.get('absolute_url', ''), 'text': clean(html.unescape(j.get('content', ''))), 'raw': j})
    if '_error' in d: print('greenhouse:', d['_error'], file=sys.stderr)
    return out


def ashby(org, q=None):
    d = get_json(f'https://api.ashbyhq.com/posting-api/job-board/{org}?includeCompensation=true')
    out = []
    for j in d.get('jobs', []):
        loc = j.get('location', '') + (' (remote)' if j.get('isRemote') else '')
        out.append({'title': j.get('title', ''), 'location': loc, 'date': (j.get('publishedAt') or '')[:10],
                    'url': j.get('jobUrl', ''), 'text': clean(j.get('descriptionHtml', '')), 'raw': j})
    if '_error' in d: print('ashby:', d['_error'], file=sys.stderr)
    return out


def lever(org, q=None):
    d = get_json(f'https://api.lever.co/v0/postings/{org}?mode=json')
    out = []
    for j in d if isinstance(d, list) else []:
        text = j.get('descriptionPlain', '') + ' ' + ' '.join(x.get('text', '') + ' ' + ' '.join(x.get('content', '') for _ in [0]) for x in j.get('lists', []))
        out.append({'title': j.get('text', ''), 'location': (j.get('categories') or {}).get('location', ''), 'date': '',
                    'url': j.get('hostedUrl', ''), 'text': clean(text), 'raw': j})
    return out


def smartrecruiters(company, q=None):
    items, off = [], 0
    while off < 500:
        d = get_json(f'https://api.smartrecruiters.com/v1/companies/{company}/postings?limit=100&offset={off}' + (f'&q={urllib.parse.quote(q)}' if q else ''))
        c = d.get('content', []); items += c
        if len(c) < 100: break
        off += 100
    out = []
    for p in items:
        det = get_json(f"https://api.smartrecruiters.com/v1/companies/{company}/postings/{p['id']}")
        sec = (det.get('jobAd') or {}).get('sections') or {}
        text = ' '.join((sec.get(k) or {}).get('text', '') for k in ('jobDescription', 'qualifications', 'additionalInformation'))
        out.append({'title': p.get('name', ''), 'location': (p.get('location') or {}).get('city', ''), 'date': (p.get('releasedDate') or '')[:10],
                    'url': f"https://jobs.smartrecruiters.com/{company}/{p['id']}", 'text': clean(text), 'raw': p})
    return out


def workday(spec, q=None):
    host, tenant, site = spec.split('/', 2)
    base = f'https://{host}/wday/cxs/{tenant}/{site}'
    jobs, off = [], 0
    while off < 400:
        d = get_json(base + '/jobs', {'appliedFacets': {}, 'limit': 20, 'offset': off, 'searchText': q or ''})
        js = d.get('jobPostings', []); jobs += js
        if len(js) < 20: break
        off += 20
    out = []
    for j in jobs:
        det = get_json(base + j['externalPath']).get('jobPostingInfo', {})
        out.append({'title': j.get('title', ''), 'location': j.get('locationsText', ''), 'date': (det.get('startDate') or '')[:10],
                    'url': f"https://{host}/{site}{j['externalPath']}", 'text': clean(det.get('jobDescription', '')), 'raw': j})
    return out


def personio(sub, q=None):
    # The XML feed (<sub>.jobs.personio.de/xml) answered 404 for every company on 8 Oct 2026; the HTML list still works.
    # The list page carries title (h3.jb-title) and location (first page_jobMetaText) per /job/<id> link.
    base = f'https://{sub}.jobs.personio.de'
    page = curl(base + '/?language=de')
    out, seen = [], set()
    for m in re.finditer(r'<a[^>]*href="/job/(\d+)[^"]*"[^>]*>(.*?)</a>', page, re.S):
        jid, inner = m.group(1), m.group(2)
        if jid in seen: continue
        seen.add(jid)
        t = re.search(r'<h3[^>]*>(.*?)</h3>', inner, re.S)
        loc = re.search(r'page_jobMetaText[^>]*>(.*?)</span>', inner, re.S)
        text = clean(curl(f'{base}/job/{jid}?language=de'))
        out.append({'title': clean(t.group(1)) if t else text[:80], 'location': clean(loc.group(1)) if loc else '',
                    'date': '', 'url': f'{base}/job/{jid}?language=de', 'text': text, 'raw': {'id': jid}})
    if not seen: print(f'personio: no /job/<id> links on {base}/?language=de (company may not use Personio any more)', file=sys.stderr)
    return out


def softgarden(sub, q=None):
    s = curl(f'https://{sub}.softgarden.io/de/vacancies')
    jobs = {}
    for m in re.finditer(r'href="((?:https://[^"]*softgarden\.io|\.\.)?/job/(\d+)/[^"?]*)[^"]*"[^>]*>(.{0,300}?)</a>', s, re.S):
        t = clean(m.group(3))
        if t: jobs.setdefault(m.group(2), (t, m.group(1)))
    out = []
    for jid, (t, u) in jobs.items():
        url = u if u.startswith('http') else f'https://{sub}.softgarden.io' + u.replace('..', '', 1)
        d = clean(curl(url))
        loc = re.search(r'(?:Standort|Arbeitsort|Location)[:\s]+([^|\n]{0,60})', d)
        dt = re.search(r'\d\d\.\d\d\.\d\d(?:\d\d)?', d)
        out.append({'title': t, 'location': loc.group(1).strip() if loc else '', 'date': dt.group(0) if dt else '', 'url': url, 'text': d, 'raw': {'id': jid}})
    return out


def successfactors(host, q=None, loc=''):
    jobs = {}
    for start in range(0, 300, 25):
        s = curl(f'https://{host}/search/?q={urllib.parse.quote(q or "")}&locationsearch={urllib.parse.quote(loc or "")}&startrow={start}')
        new = 0
        for m in re.finditer(r'href="(/job/[^"]+/(\d+)/)"[^>]*>(.{0,250}?)</a>', s, re.S):
            t = clean(m.group(3))
            if t and m.group(2) not in jobs: jobs[m.group(2)] = (t, m.group(1)); new += 1
        if new == 0: break
    out = []
    for jid, (t, u) in jobs.items():
        d = clean(curl(f'https://{host}{u}'))
        dt = re.search(r'Datum:\s*([\d.]+)', d)
        out.append({'title': t, 'location': loc, 'date': dt.group(1) if dt else '', 'url': f'https://{host}{u}', 'text': d, 'raw': {'id': jid}})
    return out


SYSTEMS = {'greenhouse': greenhouse, 'ashby': ashby, 'lever': lever, 'smartrecruiters': smartrecruiters, 'workday': workday,
           'personio': personio, 'softgarden': softgarden, 'successfactors': successfactors}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('system', choices=sorted(SYSTEMS)); ap.add_argument('ident')
    ap.add_argument('--q'); ap.add_argument('--title', default='.'); ap.add_argument('--grep', default=PHYS); ap.add_argument('--loc', default='')
    ap.add_argument('--all', action='store_true'); ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    fn = SYSTEMS[a.system]
    jobs = fn(a.ident, a.q, a.loc) if a.system == 'successfactors' else fn(a.ident, a.q)
    grep = '.' if a.all else a.grep
    title_rx, grep_rx, loc_rx = re.compile('.' if a.all else a.title, re.I), re.compile(grep, re.I), re.compile(a.loc or '.', re.I)
    kept = [j for j in jobs if title_rx.search(j['title']) and grep_rx.search(j['title'] + ' ' + j['text']) and loc_rx.search(j['location'] or '')]
    if a.json:
        print(json.dumps([{k: v for k, v in j.items() if k != 'raw'} for j in kept], ensure_ascii=False, indent=1)); return
    print(f'## {a.system} {a.ident}: {len(jobs)} open jobs, {len(kept)} kept')
    for j in kept:
        print(f"* {j['title'][:110]} | {j['location'][:50]} | {j['date']} | {j['url']}")
        for s in DEGREE.findall(j['text'])[:3]: print('     ', re.sub(r'\s+', ' ', s).strip()[:240])


if __name__ == '__main__':
    try:
        main()
    except BrokenPipeError:   # output piped into head
        sys.exit(0)
