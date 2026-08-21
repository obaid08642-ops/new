#!/usr/bin/env python3
from __future__ import annotations
import argparse,gzip,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
IN=ROOT/'data/derived/cleaned_catalog_v1_identity.jsonl.gz'; OUT=ROOT/'data/derived/cleaned_catalog_v1_reviewable.jsonl.gz'; REPORT=ROOT/'data/derived/reports/taxonomy_slug_application_v1.json'
TAX=ROOT/'data/internal/taxonomy_candidates.jsonl'; SLUG=ROOT/'data/internal/slug_candidates.jsonl'
def load(path):
    with path.open(encoding='utf-8') as f:return {str(x['record_id']):x for line in f if line.strip() for x in [json.loads(line)]}
def main():
    tax=load(TAX); slugs=load(SLUG); total=tax_attached=slug_attached=0; conflicts=0; out_ids=[]
    OUT.parent.mkdir(parents=True,exist_ok=True)
    with gzip.open(IN,'rt',encoding='utf-8') as src,gzip.open(OUT,'wt',encoding='utf-8',compresslevel=9) as dst:
        for line in src:
            if not line.strip():continue
            row=json.loads(line); rid=str(row.get('id')); meta=row.setdefault('cleaning_metadata',{}); review=meta.setdefault('review_queue',[])
            t=tax.get(rid); s=slugs.get(rid); meta['taxonomy_candidate']=t or None; meta['slug_candidates']=s.get('locales',{}) if s else {}
            if t: tax_attached+=1; review.append('taxonomy_candidate_review')
            if s: slug_attached+=1; review.append('slug_candidate_review')
            for locale in row.get('locales',{}).values(): locale['slug']=None
            if row.get('governance'):
                row['governance'].update({'public_eligibility':False,'indexing_eligibility':False,'approval_state':'needs_review'})
            dst.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n'); total+=1; out_ids.append(rid)
    result={'records':total,'taxonomy_candidates_attached':tax_attached,'slug_candidates_attached':slug_attached,'final_slugs_written':0,'taxonomy_approved':0,'publication_ready':False,'output':str(OUT)}
    REPORT.parent.mkdir(parents=True,exist_ok=True); REPORT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
