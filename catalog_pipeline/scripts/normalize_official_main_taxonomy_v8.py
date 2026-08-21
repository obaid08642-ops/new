#!/usr/bin/env python3
import gzip,json
from collections import Counter
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v7_offer_reclassified.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v8_official_main_taxonomy.jsonl.gz')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/official_main_taxonomy_v8_report.json')
MAP={'makeup-cosmetics':'makeup-and-accessories','skin-care':'skin-care','hair-care':'hair-care','mother-baby':'mum-and-baby','mum-and-baby':'mum-and-baby','personal-care-hygiene':'personal-care','bath-body-fragrance':'personal-care','medical-devices':'home-health-care','other-health':'other-health'}
count=Counter();changed=Counter();total=0
with gzip.open(IN,'rt',encoding='utf-8') as src,gzip.open(OUT,'wt',encoding='utf-8',compresslevel=9) as dst:
 for line in src:
  if not line.strip():continue
  r=json.loads(line);total+=1;t=r['taxonomy'];old=t.get('primary_taxonomy_id');new=MAP.get(old,old)
  if old=='medicines-supplements':
   sub=t.get('subcategory_id') or ''
   new='vitamins-and-healthy-nutrition' if sub=='vitamins-supplements' else 'medicine-and-treatment'
  if new!=old:changed[f'{old}->{new}']+=1
  t['primary_taxonomy_id']=new;t['official_main_category_id']=new;t['state']='proposed'
  p=r.setdefault('cleaning_metadata',{}).setdefault('taxonomy_proposal',{});p.update({'main_category_id':new,'source':'official-main-taxonomy-v8','status':'review_required'})
  count[new]+=1
  dst.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
report={'records':total,'main_categories':len(count),'main_distribution':count,'changes':changed,'output':str(OUT),'taxonomy_state':'proposed_review_required'}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
