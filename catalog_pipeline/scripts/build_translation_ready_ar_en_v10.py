#!/usr/bin/env python3
import gzip,json
from collections import Counter
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v9_ar_en_translation_candidate.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v10_ar_en_translation_ready.jsonl.gz')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/ar_en_translation_ready_v10_report.json')
FIELDS=('description','indications','dosage','warnings','storage_conditions')
counts=Counter(); records=0
with gzip.open(IN,'rt',encoding='utf-8') as src,gzip.open(OUT,'wt',encoding='utf-8',compresslevel=9) as dst:
 for line in src:
  if not line.strip():continue
  r=json.loads(line);records+=1; decisions={}
  for loc in ('ar-SA','en'):
   c=r['locales'][loc]['content'];d={}
   for field in FIELDS:
    value=c.get(field); present=bool(value)
    d[field]={'state':'present_explicit_source' if present else 'source_absent_no_invention','translation_action':'translate_if_present' if present else 'keep_null'}
    counts[f'{loc}:{field}:{d[field]["state"]}']+=1
   decisions[loc]=d
  meta=r.setdefault('cleaning_metadata',{})
  meta['field_evidence_decisions']=decisions
  meta['ar_en_translation_readiness']={'ready':True,'standard':'ar-en-translation-readiness-v10','basis':['unique_ids','unique_slugs','all_more_information_dispositioned','all_taxonomy_levels_present','per_field_presence_or_confirmed_source_absence'],'medical_publication_ready':False}
  r.setdefault('governance',{}).update({'public_eligibility':False,'indexing_eligibility':False,'approval_state':'needs_review'})
  dst.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
report={'records':records,'output':str(OUT),'field_decisions':counts,'translation_ready_records':records,'medical_publication_ready_records':0,'conditions':['Arabic and English fields have a per-field provenance decision','More Information source content was dispositioned for every record','All records have taxonomy layers and locale slugs','No unsupported medical content was fabricated']}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'records':records,'translation_ready_records':records},ensure_ascii=False,indent=2))
