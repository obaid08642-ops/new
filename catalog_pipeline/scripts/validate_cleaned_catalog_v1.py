#!/usr/bin/env python3
from __future__ import annotations
import gzip, json, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CANON=ROOT/'data/internal/canonical_records.jsonl.gz'
OUT=ROOT/'data/derived/cleaned_catalog_v1.jsonl.gz'
REPORT=ROOT/'data/derived/reports/cleaned_catalog_v1_validation.json'

def rows(path):
    with gzip.open(path,'rt',encoding='utf-8') as f:
        return [json.loads(line) for line in f if line.strip()]

def main():
    src=rows(CANON); out=rows(OUT); errors=[]
    if len(src)!=len(out): errors.append(f'count mismatch {len(src)} != {len(out)}')
    if [r.get('id') for r in src] != [r.get('id') for r in out]: errors.append('id/order changed')
    open_flags=0; collapsed=0; retained=0; reviews=0
    for row in out:
        gov=row.get('governance',{})
        if not (gov.get('public_eligibility') is False and gov.get('indexing_eligibility') is False and gov.get('approval_state')=='needs_review' and gov.get('medical_claims_status')=='requires_verification'):
            open_flags += 1
        meta=row.get('cleaning_metadata',{})
        codes=[x.get('code') for x in meta.get('changes',[]) if isinstance(x,dict)]
        collapsed += codes.count('duplicate_more_info_collapsed')
        retained += codes.count('more_info_retained_for_review')
        reviews += bool(meta.get('review_queue'))
    if open_flags: errors.append(f'governance flags open: {open_flags}')
    result={'passed':not errors,'errors':errors,'source_count':len(src),'output_count':len(out),'output_sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'collapsed_more_info_events':collapsed,'retained_more_info_events':retained,'review_queue_records':reviews,'source_modified':False,'publication_ready':False}
    REPORT.parent.mkdir(parents=True,exist_ok=True); REPORT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if errors: raise SystemExit(1)
if __name__=='__main__': main()
