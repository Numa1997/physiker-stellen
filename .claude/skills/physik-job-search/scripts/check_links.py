#!/usr/bin/env python3
"""Checks every open posting's link and says which are dead, which are unreachable, and which no longer mention physics.

    check_links.py postings.json                 report only
    check_links.py postings.json --remove-dead   also delete the DEAD rows from the file (never the TRANSIENT ones)
    check_links.py --urls https://a https://b    check loose URLs

A posting is DEAD when the page answers 404 or 410, or the page text carries a closed marker
("nicht mehr verfügbar", "no longer accepting applications", "abgelaufen", "position filled", "Stelle ist nicht mehr",
"AD Not Found", "diese Stellenanzeige ist nicht mehr"). It is TRANSIENT when curl fails or times out: keep it and look
again tomorrow; a soft delete on a network error would strike good postings. It is ALIVE otherwise; ALIVE postings
whose page no longer contains any physics / natural-science word are flagged WORDING for a human look.

Known applicant-tracking hosts are checked through their APIs where the HTML page is JavaScript-rendered or
misleading: Greenhouse (boards-api), SmartRecruiters (api), Workday (the wday/cxs endpoint), Ashby (posting-api).
"""
import argparse, json, re, subprocess, sys, datetime, urllib.parse

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
CLOSED = re.compile(r'nicht mehr verf(ü|u)gbar|no longer accepting|no longer available|abgelaufen|position (has been )?filled|Stelle ist nicht mehr|AD Not Found|ist nicht mehr aktiv|wurde bereits besetzt|this job is no longer|Leider ist diese', re.I)
PHYS = re.compile(r'physik|physic|naturwiss|natural scien|\bmint\b|\bstem\b|mathemat', re.I)


def fetch(url):
    r = subprocess.run(['curl', '-sS', '-L', '--compressed', '-m', '30', '-A', UA, '-H', 'Accept-Language: de-DE,de;q=0.9,en;q=0.8', '-o', '-', '-w', '\n@@HTTP %{http_code}', url], capture_output=True)
    body = r.stdout.decode('utf-8', 'ignore')
    m = re.search(r'@@HTTP (\d+)\s*$', body)
    code = int(m.group(1)) if m else 0
    text = re.sub(r'(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>', ' ', body)
    text = re.sub(r'<[^>]+>', ' ', text)
    return code, text, r.returncode


def via_api(url):
    """Returns (code, text) through the ATS API, or None when the host is not one we know."""
    u = urllib.parse.urlparse(url); host = u.netloc; path = u.path
    try:
        if 'greenhouse.io' in host:
            m = re.search(r'/([\w-]+)/jobs/(\d+)', path)
            if m:
                code, text, _ = fetch(f'https://boards-api.greenhouse.io/v1/boards/{m.group(1)}/jobs/{m.group(2)}')
                return code, text
        if host == 'jobs.smartrecruiters.com':
            m = re.search(r'/([\w-]+)/(\d+)', path)
            if m:
                code, text, _ = fetch(f'https://api.smartrecruiters.com/v1/companies/{m.group(1)}/postings/{m.group(2)}')
                return code, text
        if 'myworkdayjobs.com' in host:
            m = re.search(r'^/([^/]+)/job/(.+)$', path)
            if m:
                tenant = host.split('.')[0]
                code, text, _ = fetch(f'https://{host}/wday/cxs/{tenant}/{m.group(1)}/job/{m.group(2)}')
                return code, text
        if host == 'jobs.ashbyhq.com':
            m = re.search(r'^/([\w-]+)/([\w-]+)', path)
            if m:
                code, text, _ = fetch(f'https://api.ashbyhq.com/posting-api/job-board/{m.group(1)}')
                return (200 if m.group(2) in text else 404), text
    except Exception:
        return None
    return None


def check(url):
    api = via_api(url)
    if api is not None:
        code, text = api; rc = 0
    else:
        code, text, rc = fetch(url)
    if rc != 0 and code == 0: return 'TRANSIENT', f'curl failed ({rc})'
    if code in (404, 410): return 'DEAD', f'HTTP {code}'
    if code >= 500 or code == 0: return 'TRANSIENT', f'HTTP {code}'
    if code in (403, 401, 429): return 'TRANSIENT', f'HTTP {code} (blocked, not necessarily gone)'
    m = CLOSED.search(text)
    if m: return 'DEAD', 'page says: ' + m.group(0)
    if not PHYS.search(text): return 'WORDING', 'page no longer mentions physics or natural sciences'
    return 'ALIVE', ''


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('postings', nargs='?'); ap.add_argument('--urls', nargs='*'); ap.add_argument('--remove-dead', action='store_true')
    a = ap.parse_args()
    today = datetime.date.today().isoformat()
    if a.urls:
        for u in a.urls: print(*check(u), u)
        return
    data = json.load(open(a.postings))
    rows = [p for p in data if not p.get('_end')]
    open_rows = list(rows)
    counts = {}
    for p in open_rows:
        status, why = check(p['url'])
        counts[status] = counts.get(status, 0) + 1
        print(f"{status:9s} #{p['n']:<4d} {p['company'][:30]:30s} {why}  {p['url'][:90]}")
        if status == 'DEAD' and a.remove_dead:
            data.remove(p); print(f'  deleted #{p["n"]} {p["company"]} - note it in references/sources.md section E: link dead on {today}: {why}')
    print(dict(counts), file=sys.stderr)
    if a.remove_dead:
        json.dump(data, open(a.postings, 'w'), ensure_ascii=False, indent=1)
        print('written', a.postings, file=sys.stderr)


if __name__ == '__main__':
    main()
