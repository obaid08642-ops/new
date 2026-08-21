#!/usr/bin/env python3
import gzip, json
from pathlib import Path

CAND=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/identity_duplicate_candidates_v2_full.jsonl')
DATA=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v2_reviewable.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/identity_duplicate_candidates_v2_full_ar.md')
records={}
with gzip.open(DATA,'rt',encoding='utf-8') as f:
    for line in f:
        if not line.strip(): continue
        r=json.loads(line); records[str(r['id'])]=r
rows=[json.loads(x) for x in CAND.open(encoding='utf-8') if x.strip()]
with OUT.open('w',encoding='utf-8') as f:
    f.write('# قائمة مرشحي التكرار القوي v2\n\n')
    f.write(f'عدد المجموعات: **{len(rows)}**. عدد السجلات المتأثرة: **{len({rid for x in rows for rid in x.get("record_ids",[])})}**. هذه مرشحات وليست قرارات حذف.\n\n')
    for i,row in enumerate(rows,1):
        f.write(f'## المجموعة {i}\n\n')
        f.write(f'- مفتاح المطابقة: `{json.dumps(row.get("key"),ensure_ascii=False)}`\n')
        f.write(f'- القرار الحالي: `{row.get("decision")}`\n')
        for rid in row.get('record_ids',[]):
            r=records.get(str(rid),{})
            loc=r.get('locales',{})
            ar=loc.get('ar-SA',{}); en=loc.get('en',{})
            f.write(f'- `{rid}` — AR: **{ar.get("display_name") or ""}**؛ EN: **{en.get("display_name") or ""}**؛ SKU: `{r.get("identifiers",{}).get("sku")}`؛ barcode: `{r.get("identifiers",{}).get("barcode")}`\n')
        f.write('\n')
print(json.dumps({'groups':len(rows),'records':len({rid for x in rows for rid in x.get('record_ids',[])}),'output':str(OUT)},ensure_ascii=False,indent=2))
