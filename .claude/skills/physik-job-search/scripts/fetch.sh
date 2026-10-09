#!/bin/bash
# usage: fetch.sh URL [maxchars] -> page as plain text
curl -sS -L --max-time 30 --compressed -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" -H "Accept-Language: de-DE,de;q=0.9,en;q=0.8" -w "\n@@HTTP %{http_code} %{url_effective}\n" "$1" \
| python3 -I -c '
import sys,re,html
s=sys.stdin.read()
status=re.search(r"@@HTTP .*$",s,re.M); status=status.group(0) if status else ""
s=re.sub(r"(?is)<(script|style|noscript|svg|head)[^>]*>.*?</\1>"," ",s)
s=re.sub(r"(?i)<br\s*/?>|</(p|div|li|tr|h\d|section|article)>","\n",s)
s=re.sub(r"<[^>]+>"," ",s); s=html.unescape(s)
s=re.sub(r"[ \t\xa0]+"," ",s); s=re.sub(r"\n\s*\n+","\n",s).strip()
n=int(sys.argv[1]) if len(sys.argv)>1 else 6000
print(status); print(s[:n])' "${2:-6000}"
