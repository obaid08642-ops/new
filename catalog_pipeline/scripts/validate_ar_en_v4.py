#!/usr/bin/env python3
import gzip,json,hashlib
from pathlib import Path
from collections import Counter
INPUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v4_taxonomy_complete.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/ar_en_v4_final_gate.json')
ids=set(); total=0; errors=[]; slugs={'ar-SA':set(),'en':set()}; categories=Counter(); subcategories=Counter(); sub3=Counter(); governance=Counter(); empty_tax=0
with gzip.open(INPUT,'rt',encoding='utf-8') as f:
 for line_no,line in enumerate(f,1):
  if not line.strip(): continue
  r=json.loads(line); total+=1; rid=str(r.get('id'))
  if rid in ids: errors.append({'line':line_no,'error':'duplicate_id','id':rid})
  ids.add(rid); t=r.get('taxonomy',{})
  for k in ('primary_taxonomy_id','subcategory_id','sub_subcategory_id'):
   if not t.get(k): empty_tax+=1; errors.append({'line':line_no,'error':'missing_taxonomy_field','field':k})
  categories[t.get('primary_taxonomy_id')]+=1; subcategories[t.get('subcategory_id')]+=1; sub3[t.get('sub_subcategory_id')]+=1
  for l in ('ar-SA','en'):
   s=r.get('locales',{}).get(l,{}).get('slug')
   if not s: errors.append({'line':line_no,'error':'missing_slug','locale':l,'id':rid})
   else: slugs[l].add(s)
  g=r.get('governance',{}); governance[(g.get('public_eligibility'),g.get('indexing_eligibility'),g.get('approval_state'))]+=1
result={'input':str(INPUT),'records':total,'unique_ids':len(ids),'categories':len(categories),'subcategories':len(subcategories),'sub_subcategories':len(sub3),'taxonomy_missing_fields':empty_tax,'unique_slugs':{k:len(v) for k,v in slugs.items()},'governance':{str(k):v for k,v in governance.items()},'errors':errors[:100],'error_count':len(errors),'structurally_complete':not errors and total==len(ids),'production_ready':False,'production_blockers':['medical_claims_not_verified','taxonomy_is_proposed','translation_status_review_required','source_missing_fields_remain'],'sha256':hashlib.sha256(INPUT.read_bytes()).hexdigest()}
OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,ensure_ascii=False,indent=2))
