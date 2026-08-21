#!/usr/bin/env python3
import gzip,json
from collections import Counter
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v7_offer_reclassified.jsonl.gz')
SITEMAP=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/al_dawaa_product_sitemap_index_v1.jsonl')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/ar_en_v7_completeness_audit.json')
sm={str(x['id']):bool(x.get('ar_found') or x.get('en_found')) for x in (json.loads(z) for z in SITEMAP.read_text(encoding='utf-8').splitlines() if z.strip())}
metrics=Counter();main=Counter();sub=Counter();sub3=Counter();missing=[]
with gzip.open(IN,'rt',encoding='utf-8') as f:
 for line in f:
  if not line.strip():continue
  r=json.loads(line);rid=str(r['id']);metrics['records']+=1
  t=r['taxonomy'];main[t.get('primary_taxonomy_id')]+=1;sub[t.get('subcategory_id')]+=1;sub3[t.get('sub_subcategory_id')]+=1
  if sm.get(rid):metrics['sitemap_matched']+=1
  else:metrics['sitemap_unmatched']+=1
  missing_item={'id':rid,'missing':[]}
  for loc in ('ar-SA','en'):
   x=r['locales'][loc];c=x['content']
   for field in ('description','indications','dosage','warnings','storage_conditions'):
    if not c.get(field):metrics[f'{loc}_{field}_missing']+=1;missing_item['missing'].append(f'{loc}.{field}')
    else:metrics[f'{loc}_{field}_present']+=1
   if c.get('more_information') is not None:metrics[f'{loc}_more_information_nonnull']+=1;missing_item['missing'].append(f'{loc}.more_information_not_cleared')
   if not x.get('slug'):metrics[f'{loc}_slug_missing']+=1;missing_item['missing'].append(f'{loc}.slug')
  for fld in ('primary_taxonomy_id','subcategory_id','sub_subcategory_id'):
   if not t.get(fld):metrics[f'{fld}_missing']+=1;missing_item['missing'].append('taxonomy.'+fld)
  if missing_item['missing']:missing.append(missing_item)
report={'records':metrics['records'],'sitemap':{'matched':metrics['sitemap_matched'],'unmatched':metrics['sitemap_unmatched']},'field_metrics':dict(metrics),'taxonomy':{'main_count':len(main),'subcategory_count':len(sub),'sub_subcategory_count':len(sub3),'main_distribution':main},'records_with_any_missing_content_or_structure':len(missing),'sample_missing':missing[:100],'production_ready':False,'blockers':['medical_fields_missing_in_source','taxonomy_proposed_not_approved','external_api_bulk_access_blocked','llm_bulk_extraction_blocked_by_insufficient_credits']}
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'records':report['records'],'sitemap':report['sitemap'],'taxonomy':report['taxonomy'],'records_with_any_missing_content_or_structure':len(missing)},ensure_ascii=False,indent=2))
