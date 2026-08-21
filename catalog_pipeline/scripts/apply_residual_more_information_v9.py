#!/usr/bin/env python3
import gzip,json
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v8_official_main_taxonomy.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v9_ar_en_translation_candidate.jsonl.gz')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/residual_more_information_application_v9.json')
changed=[];n=0
with gzip.open(IN,'rt',encoding='utf-8') as src,gzip.open(OUT,'wt',encoding='utf-8',compresslevel=9) as dst:
 for line in src:
  if not line.strip():continue
  r=json.loads(line);n+=1
  if str(r['id'])=='507512':
   c=r.setdefault('common',{})
   if not c.get('brand'):c['brand']='Dawa-Aid'
   if not c.get('form'):c['form']='Cotton roll'
   r.setdefault('cleaning_metadata',{}).setdefault('evidence_extractions',[]).append({'source':'raw.more_information.ar/en','method':'manual_semantic_review','fields_added':{'common.brand':'Dawa-Aid','common.form':'Cotton roll'},'fields_previously_extracted':['locales.ar-SA.content.indications','locales.en.content.indications','locales.ar-SA.content.warnings','locales.en.content.warnings'],'confidence':'high'})
   r.setdefault('cleaning_metadata',{}).setdefault('changes',[]).append({'code':'residual_more_information_semantically_distributed','source_record_id':'507512'})
   changed.append('507512')
  dst.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
report={'records':n,'changed_ids':changed,'output':str(OUT),'more_information_state':'all source More Information was either exact duplicate, empty, or semantically distributed'}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
