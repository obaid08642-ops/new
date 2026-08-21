#!/usr/bin/env python3
import gzip,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
IN=ROOT/'data/derived/cleaned_catalog_v1_reviewable.jsonl.gz'; REPORT=ROOT/'data/derived/reports/reviewable_catalog_v1_validation.json'
def main():
    errors=[]; n=0; tax=0; slug=0; final=0; open_index=0
    with gzip.open(IN,'rt',encoding='utf-8') as f:
        for line in f:
            if not line.strip():continue
            r=json.loads(line); n+=1; m=r.get('cleaning_metadata',{}); q=m.get('review_queue',[])
            if m.get('taxonomy_candidate') is None or 'taxonomy_candidate_review' not in q: tax+=1
            if not m.get('slug_candidates') or 'slug_candidate_review' not in q: slug+=1
            if any(v.get('slug') for v in r.get('locales',{}).values()): final+=1
            g=r.get('governance',{})
            if g.get('indexing_eligibility') is not False: open_index+=1
    if tax: errors.append('records missing taxonomy candidate or review queue')
    if slug: errors.append('records missing slug candidates or review queue')
    if final: errors.append(f'final slugs written: {final}')
    if open_index: errors.append(f'indexing open: {open_index}')
    out={'passed':not errors,'errors':errors,'records':n,'taxonomy_missing':tax,'slug_missing':slug,'final_slugs':final,'indexing_open':open_index,'publication_ready':False}
    REPORT.parent.mkdir(parents=True,exist_ok=True); REPORT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(out,ensure_ascii=False,indent=2))
    if errors: raise SystemExit(1)
if __name__=='__main__':main()
