#!/usr/bin/env python3
import gzip,json,re,unicodedata
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v3_safe_dedup.jsonl.gz')
TAX=Path('/home/ubuntu/catalog_pipeline/data/internal/taxonomy_candidates.jsonl')
SLUG=Path('/home/ubuntu/catalog_pipeline/data/internal/slug_candidates.jsonl')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v3_ar_en_structured.jsonl.gz')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/ar_en_structure_v3_report.json')

def load(path):
    with path.open(encoding='utf-8') as f:
        return {str(x.get('record_id')):x for line in f if line.strip() for x in [json.loads(line)]}

tax=load(TAX); slugs=load(SLUG); seen={'ar-SA':{},'en':{}}; total=0; tax_count=0; slug_count={'ar-SA':0,'en':0}; collisions={'ar-SA':0,'en':0}
with gzip.open(IN,'rt',encoding='utf-8') as src,gzip.open(OUT,'wt',encoding='utf-8',compresslevel=9) as dst:
    for line in src:
        if not line.strip(): continue
        r=json.loads(line); rid=str(r['id']); meta=r.setdefault('cleaning_metadata',{}); t=tax.get(rid); s=slugs.get(rid)
        if t and t.get('candidate_primary_taxonomy_id'):
            r.setdefault('taxonomy',{})['primary_taxonomy_id']=t['candidate_primary_taxonomy_id']; r['taxonomy']['state']='proposed'; meta['taxonomy_proposal_status']='review_required'; tax_count+=1
        if s:
            for locale in ('ar-SA','en'):
                candidate=(s.get('locales',{}).get(locale) or {}).get('slug_candidate')
                if not candidate: continue
                base='-'.join(str(candidate).split())
                if base in seen[locale]:
                    collisions[locale]+=1; base=f'{base}-{rid}'
                seen[locale][base]=rid; r.get('locales',{}).get(locale, {})['slug']=base; slug_count[locale]+=1
        for loc in r.get('locales',{}).values():
            loc['translation_status']='review_required'
        if r.get('governance'):
            r['governance'].update({'public_eligibility':False,'indexing_eligibility':False,'approval_state':'needs_review','medical_claims_status':'requires_verification'})
        dst.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n'); total+=1
report={'input':str(IN),'output':str(OUT),'records':total,'taxonomy_proposals':tax_count,'ar_en_slugs_written':slug_count,'slug_collisions_resolved':collisions,'final_medical_approval':False,'public_eligibility_open':False,'indexing_open':False}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(report,ensure_ascii=False,indent=2))
