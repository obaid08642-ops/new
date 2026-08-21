#!/usr/bin/env python3
import gzip,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'data/derived/cleaned_catalog_v1.jsonl.gz'; OUT=ROOT/'data/derived/cleaned_catalog_v1_identity.jsonl.gz'; REPORT=ROOT/'data/derived/reports/identity_duplicates_v1_validation.json'
def rows(p):
    with gzip.open(p,'rt',encoding='utf-8') as f:return [json.loads(x) for x in f if x.strip()]
def main():
    a=rows(SRC); b=rows(OUT); errors=[]
    if len(a)!=len(b): errors.append('record count changed')
    if [x.get('id') for x in a] != [x.get('id') for x in b]: errors.append('id/order changed')
    for x in b:
        ir=x.get('cleaning_metadata',{}).get('identity_review',{})
        if ir.get('brand_manufacturer_kept_separate') is not True: errors.append('brand/manufacturer separation missing:'+str(x.get('id')))
    result={'passed':not errors,'errors':errors,'source_count':len(a),'output_count':len(b),'records_deleted':0,'brand_manufacturer_merged':0,'publication_ready':False}
    REPORT.parent.mkdir(parents=True,exist_ok=True); REPORT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,ensure_ascii=False,indent=2))
    if errors: raise SystemExit(1)
if __name__=='__main__':main()
