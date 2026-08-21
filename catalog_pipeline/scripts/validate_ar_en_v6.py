#!/usr/bin/env python3
import gzip,json,hashlib
from collections import Counter
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v6_deep_taxonomy.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/ar_en_v6_double_check.json')
ids=set(); slugs={'ar-SA':set(),'en':set()}; total=0; errors=[]; more=Counter(); main=Counter(); sub=Counter(); sub3=Counter(); status=Counter(); gov=Counter()
with gzip.open(IN,'rt',encoding='utf-8') as f:
 for line_no,line in enumerate(f,1):
  if not line.strip():continue
  r=json.loads(line); total+=1; rid=str(r.get('id'))
  if rid in ids:errors.append({'id':rid,'error':'duplicate_id'})
  ids.add(rid); t=r.get('taxonomy',{})
  for k in ('primary_taxonomy_id','subcategory_id','sub_subcategory_id'):
   if not t.get(k):errors.append({'id':rid,'error':'missing_taxonomy','field':k})
  main[t.get('primary_taxonomy_id')]+=1;sub[t.get('subcategory_id')]+=1;sub3[t.get('sub_subcategory_id')]+=1
  for l in ('ar-SA','en'):
   x=r.get('locales',{}).get(l,{})
   if x.get('content',{}).get('more_information') is not None:more[l]+=1; errors.append({'id':rid,'error':'more_information_not_cleared','locale':l})
   s=x.get('slug')
   if not s:errors.append({'id':rid,'error':'missing_slug','locale':l})
   elif s in slugs[l]:errors.append({'id':rid,'error':'duplicate_slug','locale':l,'slug':s})
   else:slugs[l].add(s)
   status[(l,x.get('translation_status'))]+=1
  g=r.get('governance',{});gov[(g.get('public_eligibility'),g.get('indexing_eligibility'),g.get('approval_state'))]+=1
result={'records':total,'unique_ids':len(ids),'main_categories':len(main),'subcategories':len(sub),'sub_subcategories':len(sub3),'more_information_nonnull':more,'unique_slugs':{l:len(s) for l,s in slugs.items()},'translation_status':{str(k):v for k,v in status.items()},'governance':{str(k):v for k,v in gov.items()},'error_count':len(errors),'errors':errors[:100],'structurally_complete':len(errors)==0,'production_ready':False,'production_blockers':['taxonomy_proposed_not_approved','medical_source_gaps','medical_claims_not_verified'],'sha256':hashlib.sha256(IN.read_bytes()).hexdigest()}
OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(result,ensure_ascii=False,indent=2))
