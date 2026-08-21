#!/usr/bin/env python3
from __future__ import annotations
import gzip,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'data/derived/cleaned_catalog_v1_reviewable.jsonl.gz'; REPORT=ROOT/'data/derived/reports/final_cleaning_validation_v1.json'
def main():
    ids=[]; errors=[]; open_flags=0; missing_candidates=0; nonempty_slugs=0; malformed=0
    with gzip.open(PATH,'rt',encoding='utf-8') as f:
        for line_no,line in enumerate(f,1):
            try:r=json.loads(line)
            except Exception: malformed+=1; continue
            ids.append(str(r.get('id'))); m=r.get('cleaning_metadata',{}); g=r.get('governance',{})
            if not m.get('taxonomy_candidate') or not m.get('slug_candidates'): missing_candidates+=1
            if any(v.get('slug') for v in r.get('locales',{}).values()): nonempty_slugs+=1
            if not (g.get('public_eligibility') is False and g.get('indexing_eligibility') is False and g.get('approval_state')=='needs_review'): open_flags+=1
    if len(ids)!=21013: errors.append(f'expected 21013 records, got {len(ids)}')
    if len(set(ids))!=len(ids): errors.append('duplicate ids in output')
    if malformed: errors.append(f'malformed records: {malformed}')
    if missing_candidates: errors.append(f'missing candidates: {missing_candidates}')
    if nonempty_slugs: errors.append(f'final slugs present: {nonempty_slugs}')
    if open_flags: errors.append(f'open governance flags: {open_flags}')
    out={'passed':not errors,'errors':errors,'records':len(ids),'unique_ids':len(set(ids)),'missing_candidates':missing_candidates,'final_slugs':nonempty_slugs,'open_governance_flags':open_flags,'sha256':hashlib.sha256(PATH.read_bytes()).hexdigest(),'compressed_bytes':PATH.stat().st_size,'publication_ready':False}
    REPORT.parent.mkdir(parents=True,exist_ok=True); REPORT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(out,ensure_ascii=False,indent=2))
    if errors: raise SystemExit(1)
if __name__=='__main__':main()
