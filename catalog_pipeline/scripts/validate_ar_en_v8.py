#!/usr/bin/env python3
import gzip,json,hashlib
from collections import Counter
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v8_official_main_taxonomy.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/ar_en_v8_gate.json')
ids=set();slugs={'ar-SA':set(),'en':set()};errors=[];metrics=Counter();mains=Counter();sub=Counter();sub3=Counter()
with gzip.open(IN,'rt',encoding='utf-8') as f:
 for line in f:
  if not line.strip():continue
  r=json.loads(line);rid=str(r['id']);metrics['records']+=1
  if rid in ids:errors.append({'id':rid,'error':'duplicate_id'})
  ids.add(rid);t=r['taxonomy'];mains[t.get('primary_taxonomy_id')]+=1;sub[t.get('subcategory_id')]+=1;sub3[t.get('sub_subcategory_id')]+=1
  for field in ('primary_taxonomy_id','subcategory_id','sub_subcategory_id'):
   if not t.get(field):errors.append({'id':rid,'error':'missing_taxonomy','field':field})
  for loc in ('ar-SA','en'):
   x=r['locales'][loc];c=x['content'];s=x.get('slug')
   if c.get('more_information') is not None:errors.append({'id':rid,'error':'more_information_not_cleared','locale':loc})
   if not s:errors.append({'id':rid,'error':'missing_slug','locale':loc})
   elif s in slugs[loc]:errors.append({'id':rid,'error':'duplicate_slug','locale':loc,'slug':s})
   slugs[loc].add(s)
   for field in ('description','indications','dosage','warnings','storage_conditions'):
    metrics[f'{loc}_{field}_present' if c.get(field) else f'{loc}_{field}_missing']+=1
report={'records':metrics['records'],'unique_ids':len(ids),'unique_slugs':{k:len(v) for k,v in slugs.items()},'taxonomy':{'main_count':len(mains),'subcategory_count':len(sub),'sub_subcategory_count':len(sub3),'main_distribution':mains},'field_metrics':metrics,'structural_errors':len(errors),'errors':errors[:100],'structurally_complete':len(errors)==0,'production_ready':False,'blockers':['20,993 records still have governance needs_review','medical fields absent in source for many records','API bulk access blocked by CAPTCHA/403','LLM extraction blocked by insufficient credits'],'sha256':hashlib.sha256(IN.read_bytes()).hexdigest()}
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'records':report['records'],'unique_ids':report['unique_ids'],'taxonomy':report['taxonomy'],'structural_errors':report['structural_errors'],'production_ready':False},ensure_ascii=False,indent=2))
