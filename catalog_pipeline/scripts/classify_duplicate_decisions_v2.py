#!/usr/bin/env python3
import gzip,json
from pathlib import Path
from collections import Counter
CAND=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/identity_duplicate_candidates_v2_full.jsonl')
DATA=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v2_reviewable.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/duplicate_decisions_v2_full.jsonl')
records={}
with gzip.open(DATA,'rt',encoding='utf-8') as f:
    for line in f:
        if line.strip():
            r=json.loads(line); records[str(r['id'])]=r
critical=['brand','manufacturer','form','strength','package_size']

def val(r,key):
    if key in critical: return r.get('common',{}).get(key)
    if key=='barcode': return r.get('identifiers',{}).get('barcode')
    if key=='sku': return r.get('identifiers',{}).get('sku')
    if key=='ar_name': return r.get('locales',{}).get('ar-SA',{}).get('display_name')
    if key=='en_name': return r.get('locales',{}).get('en',{}).get('display_name')
    return None

def normalize(x): return ' '.join(str(x or '').casefold().split())
rows=[]; counts=Counter()
for line in CAND.open(encoding='utf-8'):
    if not line.strip(): continue
    c=json.loads(line)
    if not isinstance(c.get('key'), list) or not c.get('key') or c['key'][0] != 'identity':
        continue
    ids=[str(x) for x in c.get('record_ids',[])]; rs=[records[i] for i in ids if i in records]
    diffs={k:sorted({normalize(val(r,k)) for r in rs}) for k in critical+['barcode','sku']}
    name_diffs=[]
    for k in ['ar_name','en_name']:
        values=sorted({normalize(val(r,k)) for r in rs})
        if len(values)>1: name_diffs.append(k)
    differing=[k for k,v in diffs.items() if len(v)>1]
    nonempty_differing=[k for k in differing if any(v for v in diffs[k])]
    if not name_diffs and not nonempty_differing and len(rs)>=2:
        decision='delete_duplicate_keep_lowest_id'
    else:
        decision='keep_separate_requires_review'
    if name_diffs: nonempty_differing.extend(name_diffs)
    counts[decision]+=1
    rows.append({'record_ids':ids,'key':c.get('key'),'decision':decision,'differing_fields':nonempty_differing,'field_values':diffs})
with OUT.open('w',encoding='utf-8') as f:
    for r in rows: f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'groups':len(rows),'decisions':counts,'output':str(OUT)},ensure_ascii=False,indent=2))
