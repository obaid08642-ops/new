#!/usr/bin/env python3
from __future__ import annotations
import argparse,gzip,json,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
IN=ROOT/'data/derived/cleaned_catalog_v1_reviewable.jsonl.gz'; RAW=ROOT/'data/raw/medicines_6lang_21013.json.gz'; REPORT=ROOT/'data/derived/reports/cleaned_catalog_v1_sample_comparison.json'
def norm(v):
    if not isinstance(v,str):return ''
    s=unicodedata.normalize('NFKC',v).replace('\u00a0',' ')
    return re.sub(r'\s+',' ',s).strip().casefold()
def main():
    with gzip.open(RAW,'rt',encoding='utf-8') as f: raw={str(x['id']):x for x in json.load(f)['medicines']}
    rows=[]
    with gzip.open(IN,'rt',encoding='utf-8') as f: rows=[json.loads(x) for x in f if x.strip()]
    # deterministic spread: first, middle, last and every 997th record
    selected=[]; seen=set()
    for i in [0,len(rows)//4,len(rows)//2,3*len(rows)//4,len(rows)-1]+list(range(0,len(rows),997)):
        if 0<=i<len(rows) and rows[i]['id'] not in seen: selected.append(rows[i]); seen.add(rows[i]['id'])
    errors=[]; checked=0; collapsed=0; retained=0
    for row in selected:
        rid=str(row['id']); r=raw.get(rid,{}); checked+=1
        for loc,suffix in [('ar-SA','ar'),('en','en')]:
            desc=norm(r.get('description_'+suffix)); more=norm(r.get('more_info_'+suffix)); out=norm(row.get('locales',{}).get(loc,{}).get('content',{}).get('description'))
            expected=desc or more
            if out != expected: errors.append(f'{rid}:{loc}:description mismatch')
            if desc and more and desc==more: collapsed+=1
            elif more: retained+=1
        if row.get('id') != rid: errors.append(f'{rid}:id mismatch')
    result={'passed':not errors,'errors':errors,'sample_count':checked,'collapsed_matches_observed':collapsed,'retained_more_info_matches_observed':retained,'publication_ready':False,'indexing_eligibility_open':False}
    REPORT.parent.mkdir(parents=True,exist_ok=True); REPORT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,ensure_ascii=False,indent=2))
    if errors: raise SystemExit(1)
if __name__=='__main__':main()
