#!/usr/bin/env python3
import gzip,json
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v6_deep_taxonomy.jsonl.gz')
SITEMAP=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/al_dawaa_product_sitemap_index_v1.jsonl')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/external_lookup_exceptions_v1.jsonl')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/external_lookup_exceptions_v1_report.json')
sitemap_rows=[json.loads(line) for line in SITEMAP.read_text(encoding='utf-8').splitlines() if line.strip()]
found={str(x['id']):(x.get('ar_found') or x.get('en_found')) for x in sitemap_rows}
count=0
with gzip.open(IN,'rt',encoding='utf-8') as src,OUT.open('w',encoding='utf-8') as dst:
 for line in src:
  if not line.strip():continue
  r=json.loads(line);rid=str(r['id'])
  if not found.get(rid):
   ar=r['locales']['ar-SA'];en=r['locales']['en'];t=r['taxonomy']
   row={'id':rid,'name_ar':ar.get('display_name'),'name_en':en.get('display_name'),'taxonomy':{'main':t.get('primary_taxonomy_id'),'sub':t.get('subcategory_id'),'sub_sub':t.get('sub_subcategory_id')},'content_presence':{'ar_description':bool(ar['content'].get('description')),'en_description':bool(en['content'].get('description')),'ar_indications':bool(ar['content'].get('indications')),'en_indications':bool(en['content'].get('indications'))},'external_status':'not_in_current_al_dawaa_product_sitemap','next_action':'retain_internal_record_and_require_alternate_source_or_review'}
   dst.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n');count+=1
REPORT.write_text(json.dumps({'exceptions':count,'output':str(OUT),'reason':'not present in current product sitemap; API direct access blocked by CAPTCHA/403','action':'no records deleted or altered'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'exceptions':count,'output':str(OUT)},ensure_ascii=False))
