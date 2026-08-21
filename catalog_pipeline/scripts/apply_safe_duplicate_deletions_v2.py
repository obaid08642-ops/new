#!/usr/bin/env python3
import gzip,json
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v2_reviewable.jsonl.gz')
DEC=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/duplicate_decisions_v2_full.jsonl')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v3_safe_dedup.jsonl.gz')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/safe_dedup_v3_report.json')
remove=set(); decisions=[]
for line in DEC.open(encoding='utf-8'):
    if not line.strip(): continue
    x=json.loads(line); decisions.append(x)
    if x['decision']=='delete_duplicate_keep_lowest_id':
        ids=sorted((str(i) for i in x['record_ids']),key=lambda s:int(s))
        remove.update(ids[1:])
kept=removed=0
with gzip.open(IN,'rt',encoding='utf-8') as src,gzip.open(OUT,'wt',encoding='utf-8',compresslevel=9) as dst:
    for line in src:
        if not line.strip(): continue
        r=json.loads(line); rid=str(r['id'])
        if rid in remove:
            removed+=1; continue
        dst.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n'); kept+=1
report={'input':str(IN),'output':str(OUT),'input_records':kept+removed,'output_records':kept,'removed_records':removed,'removed_ids':sorted(remove,key=int),'safe_delete_groups':sum(x['decision']=='delete_duplicate_keep_lowest_id' for x in decisions),'review_groups':sum(x['decision']=='keep_separate_requires_review' for x in decisions),'publication_ready':False,'governance_preserved_closed':True}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(report,ensure_ascii=False,indent=2))
