# Pipeline: recording a batch and publishing it

Two copies of the list exist. The live app is the one Numa uses; the repository page is the shareable copy. Publish to both, once per batch.

## 1. The posting record

`backend/data/postings.json` is a JSON array; the last element is `{"_end": true}`. Each posting:

| field | meaning |
|---|---|
| `n` | integer id, max(n)+1; Numa's Applied / Not relevant marks are keyed `j<n>`. Renumbered 1..89 on 9 Oct 2026; `backend/renumber-map.mjs` moves old marks once |
| `title` | the job in English, as he reads it |
| `title_original` | the ad's own title (German when the ad is German) |
| `company` | employer; for an expert network write "Meridial (Invisible Technologies' expert network)" |
| `city` | the place as the ad gives it, with labels: "Remote (worldwide)", "Torgau (~47 km from Leipzig, just outside the 40 km radius)", "Leipzig (also Berlin, …)" |
| `location_group` | `berlin` / `leipzig` / `de` |
| `category` | one of the ten keys (references/rules.md) |
| `employment` | "Full-time, permanent", "Freelance", "Contract", "Volontariat"… or null |
| `url` | the link (employer first; job board labelled) |
| `eligibility_quote_de` | the ad's exact degree sentence |
| `eligibility_en` | one or two sentences: what it means for a BSc physicist, what else is asked |
| `salary` | as stated, with currency, or null |
| `note` | what the job is; where the ad was found and when; every label the rules require |
| `added_on` | YYYY-MM-DD |
| (no removal fields) | a posting that is gone is deleted from the file; `references/sources.md` section E records why |

Batch file for `scripts/add_postings.py`:

```json
{"remove": {"406": "Mercor listing shows 'no longer accepting applications' (checked 2026-10-08)."},
 "update": {"403": {"url": "https://wavelabs.jobs.personio.de/job/2801341?language=de"}},
 "add": [{"title": "…", "title_original": "…", "company": "…", "city": "…", "location_group": "leipzig", "category": "production",
          "employment": "Full-time", "url": "https://…", "eligibility_quote_de": "…", "eligibility_en": "…", "salary": null, "note": "…"}]}
```

## 2. Apply and test (in the app's source tree)

```
python3 <skill>/scripts/add_postings.py backend/data/postings.json batch.json --dry-run
python3 <skill>/scripts/add_postings.py backend/data/postings.json batch.json
python3 - <<'EOF'   # bump the list date
import json; p='backend/data/meta.json'; m=json.load(open(p))
for r in m:
    if r.get('key')=='updated': r['value']='YYYY-MM-DD'
json.dump(m, open(p,'w'), ensure_ascii=False, indent=1)
EOF
node backend/prepare-data.mjs                 # writes backend/data-text.mjs
node --test backend/tests/*.test.mjs          # 9 tests
python3 <skill>/scripts/gaps.py backend/data/postings.json
```

## 3. Publish to the live app (AppDeploy app `physik-radar-xvy59b`)

Data-only deploy: four files. Build the manifest, request an upload URL, PUT, deploy, poll. Upload ids expire when the AppDeploy
worker restarts: do the three calls back to back, and if `deploy_app` answers "Invalid or expired upload_id", request a new one.

```
python3 - <<'EOF'
import json
fs=["backend/data/postings.json","backend/data/meta.json","backend/data-text.mjs","backend/categories.mjs"]
json.dump({"files":[{"filename":f,"content":open(f).read()} for f in fs],"deletePaths":[]},open("manifest.json","w"))
EOF
```

1. `mcp__AppDeploy__upload_assets` with `supports_direct_http_requests: true`, `app_id: physik-radar-xvy59b` → `upload_url`, `upload_id`.
2. `curl -s -X PUT "<upload_url>" -F 'payload=@manifest.json;type=application/json'` → 200.
3. `mcp__AppDeploy__deploy_app` with `app_id physik-radar-xvy59b`, `app_name "Physik Radar"`, `app_type "frontend+backend"`,
   `features ["api","auth","database"]`, `upload_id`, `intent "<what changed>"`, `model "chat"`, `initiator "user"`, `type "chore"`,
   `supports_direct_http_requests true`. No `files` and no `deletePaths` when `upload_id` is given.
4. `mcp__AppDeploy__get_app_status` every few seconds until `ready` (or `failed`: read `errors`).
5. Confirm: `curl -s https://physik-radar-xvy59b.v2.appdeploy.ai/` is the login page; the data is behind the owner's sign-in, so check
   the counts in your own `gaps.py` output and tell Numa the version number from `get_app_versions`.

Design changes (page.js, board.css) go the same way with those two files in the manifest; see `design/live-app/` in the repository
for the current deployed copies and DESIGN-SYSTEM.md for the rules they follow. Keep the two in step: edit the repository copies,
run `node design/test/run.mjs app` (headtest, foldtest, citytest; one known failure at the page bottom, DESIGN-SYSTEM.md section 10),
then copy the same two files into the manifest. Since v38 (9 Oct 2026) the live header is: large title, three plain figures (Open,
Applied, Not relevant), one Filter button with a folding panel (area as a segmented control, one category at a time as chips),
removable tags, no "aim" line; the aim (`meta.target_per_area`, 3) is a rule for this skill's `gaps.py`, not something the app shows.

Cost: every deploy counts against the AppDeploy plan (Pro); Numa raised the limit once and does not want to again. One deploy per batch.

## 4. Refresh the repository page

`index.html` embeds the list in one line, `const DATA = [...]`, and the date in `const UPDATED = "…"`; everything else in it is
generated from `design/` and must not be edited by hand.

```
python3 <skill>/scripts/sync_page.py backend/data/postings.json backend/data/meta.json index.html
python3 design/build.py --check           # must say: index.html is exactly what design/ produces
node design/test/run.mjs repo             # optional, 154 browser checks on the page (header, folds, cities); `app` runs 119 on the live view code; needs playwright
git add index.html && git commit -m "Postings YYYY-MM-DD: +<added> / -<removed>" && git push -u origin <branch>
```

`sync_page.py` replaces the two lines and nothing else, so `build.py --check` stays green. Commit messages end with the attribution
lines the session is given.

## 5. Link check (do this first on a maintenance run)

```
python3 <skill>/scripts/check_links.py backend/data/postings.json              # report
python3 <skill>/scripts/check_links.py backend/data/postings.json --remove-dead # delete the DEAD rows (note them in sources.md E)
```

TRANSIENT (network trouble, 403, 5xx) is never removed; look again next time. WORDING (page no longer mentions physics) needs a human
look: the ad may have been edited, or the page may now be a list. On JavaScript-rendered career sites the flag is expected and means
nothing: `touch.ferchau.com`, Oracle HCM (`*.oraclecloud.com`, HUK-COBURG), `ivu.com`, `job.deloitte.com`, `zeb-career.com` (403 to
curl), company pages that embed a Personio iframe (WAVELABS). Read those through Firecrawl or the board behind them when they matter.
A link to a Personio *root* page (`<sub>.jobs.personio.de/`) answering 404 means the company left Personio: look for the ad on the
company's own site before removing it (SPECS, 9 October 2026).
