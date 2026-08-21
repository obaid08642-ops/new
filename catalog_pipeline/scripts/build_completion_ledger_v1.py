#!/usr/bin/env python3
import gzip,json
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v6_deep_taxonomy.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/coverage_ledger_v1.jsonl')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/coverage_ledger_v1_report.json')
base='https://stgprevapi.al-dawaa.com/occ/v2/aldawaa/products/{id}?fields=FULL&lang={lang}&curr=SAR'
count=0
with gzip.open(IN,'rt',encoding='utf-8') as src,OUT.open('w',encoding='utf-8') as dst:
 for line in src:
  if not line.strip():continue
  r=json.loads(line); rid=str(r['id']); count+=1
  ar=r.get('locales',{}).get('ar-SA',{});en=r.get('locales',{}).get('en',{}); t=r.get('taxonomy',{})
  ledger={'id':rid,'input_name_ar':ar.get('display_name'),'input_name_en':en.get('display_name'),'api_urls':{'ar':base.format(id=rid,lang='ar'),'en':base.format(id=rid,lang='en')},'internal_taxonomy_complete':all(t.get(k) for k in ('primary_taxonomy_id','subcategory_id','sub_subcategory_id')),'more_information_cleared':ar.get('content',{}).get('more_information') is None and en.get('content',{}).get('more_information') is None,'api_ar_status':'pending','api_en_status':'pending','llm_extraction_status':'pending','cross_locale_match_status':'pending','resolution_status':'pending','exception_reason':None}
  dst.write(json.dumps(ledger,ensure_ascii=False,separators=(',',':'))+'\n')
report={'records':count,'output':str(OUT),'all_product_ids_listed':True,'completion_requires':['api_fetch_or_explicit_unavailable','llm_extraction','cross_locale_match','exception_resolution']}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
