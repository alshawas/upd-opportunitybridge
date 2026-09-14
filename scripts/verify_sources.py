#!/usr/bin/env python3
"""Conservative source-health monitor for static GitHub Pages.

It does NOT assume a closed application window means a discontinued program.
A listing becomes `discontinued` only after strong explicit text evidence, or two
consecutive 404/410 responses. Transient failures and bot blocks become
`needs_review` and remain visible.
"""
from pathlib import Path
from html import unescape
import json, re, hashlib, datetime, time
import requests
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
DATA_PATH=ROOT/'data/opportunities.json'; HEALTH_PATH=ROOT/'verification/health.json'
data=json.loads(DATA_PATH.read_text())
try: health=json.loads(HEALTH_PATH.read_text())
except Exception: health={"generatedAt":None,"policyVersion":2,"records":{}}
records=health.setdefault('records',{})
now=datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
strong=[
 r'program\s+(?:has\s+been\s+)?discontinued', r'program\s+is\s+discontinued', r'no\s+longer\s+(?:offered|available|operating)',
 r'will\s+not\s+be\s+offered\s+again', r'program\s+(?:has\s+been\s+)?sunset', r'program\s+(?:has\s+been\s+)?retired',
 r'permanently\s+(?:ended|closed)'
]
headers={'User-Agent':'OpportunityBridge-source-health/2.0 (+https://github.com/)'}
s=requests.Session(); s.headers.update(headers)
url_counts={}
for item in data: url_counts[item['sourceUrl']]=url_counts.get(item['sourceUrl'],0)+1

def normalized_page_text(raw):
    """Reduce dynamic markup noise before comparing official-page content."""
    raw=re.sub(r'<(script|style|noscript|svg)\b[^>]*>.*?</\1>', ' ', raw, flags=re.I|re.S)
    raw=re.sub(r'<!--.*?-->', ' ', raw, flags=re.S)
    raw=re.sub(r'<[^>]+>', ' ', raw)
    return re.sub(r'\s+', ' ', unescape(raw)).strip().lower()[:150000]

for pos,r in enumerate(data):
    old=records.get(r['id'],{})
    entry={**old,"lastChecked":now,"resolvedUrl":r['sourceUrl']}
    try:
        resp=s.get(r['sourceUrl'],timeout=22,allow_redirects=True)
        entry['httpStatus']=resp.status_code; entry['resolvedUrl']=resp.url
        text=normalized_page_text(resp.text)
        fingerprint=hashlib.sha256(text.encode('utf-8','ignore')).hexdigest()[:20]
        prior_fingerprint=old.get('contentFingerprint')
        entry['contentFingerprint']=fingerprint
        if prior_fingerprint and prior_fingerprint!=fingerprint:
            entry['lastContentChange']=now
        changed_at=entry.get('lastContentChange')
        changed_since_review=bool(changed_at and changed_at[:10]>r['lastVerifiedAt'])
        entry['contentChangedSinceReview']=changed_since_review
        phrase=next((p for p in strong if re.search(p,text,re.I)),None)
        # Shared catalog pages can mention a different retired offering. For those,
        # require the target program name to appear near the discontinuation phrase.
        if phrase and url_counts.get(r['sourceUrl'],1)>1:
            m=re.search(phrase,text,re.I)
            target=re.sub(r'[^a-z0-9 ]',' ',r['name'].lower())
            key=' '.join(target.split()[:3])
            nearby=text[max(0,m.start()-700):m.end()+700] if m else ''
            if key and key not in nearby: phrase=None
        if phrase:
            entry.update(state='discontinued',evidence='Official source contains an explicit discontinuation/end-of-program signal.',consecutiveHardFailures=0)
        elif resp.status_code in (404,410):
            fails=int(old.get('consecutiveHardFailures',0))+1
            entry['consecutiveHardFailures']=fails
            if fails>=2:
                entry.update(state='discontinued',evidence=f'Official source returned HTTP {resp.status_code} on {fails} consecutive scheduled checks.')
            else:
                entry.update(state='needs_review',evidence=f'Official source returned HTTP {resp.status_code}; one more scheduled hard failure is required before withholding.')
        elif 200 <= resp.status_code < 400 and changed_since_review:
            entry.update(state='needs_review',evidence='Official source content changed after the catalog record was last reviewed; listing remains visible pending review.',consecutiveHardFailures=0)
        elif 200 <= resp.status_code < 400:
            entry.update(state='verified',evidence='Official source reachable; no strong discontinuation signal detected.',consecutiveHardFailures=0)
        else:
            entry.update(state='needs_review',evidence=f'Official source returned HTTP {resp.status_code}; record remains visible pending review.',consecutiveHardFailures=0)
    except Exception as e:
        entry.update(state='needs_review',httpStatus=None,evidence=f'Transient source-check error: {type(e).__name__}. Record remains visible pending review.',consecutiveHardFailures=int(old.get('consecutiveHardFailures',0)))
    records[r['id']]=entry
    # Be respectful to official sites when this runs in Actions.
    time.sleep(0.12)
health['generatedAt']=now; health['policyVersion']=2
HEALTH_PATH.write_text(json.dumps(health,indent=2)+'\n')
print(f"Checked {len(data)} official sources; discontinued={sum(1 for x in records.values() if x.get('state')=='discontinued')}, review={sum(1 for x in records.values() if x.get('state')=='needs_review')}")
