#!/usr/bin/env python3
import gzip,json,hashlib
from collections import Counter
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v10_ar_en_translation_ready.jsonl.gz')
LEDGER=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/more_information_evidence_ledger_v9.jsonl')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/ar_en_translation_acceptance_v10.json')
FIELDS=('description','indications','dosage','warnings','storage_conditions')
ledger={str(x['id']):x for x in (json.loads(line) for line in LEDGER.read_text(encoding='utf-8').splitlines() if line.strip())}
ids=set();slugs={'ar-SA':set(),'en':set()};errors=[];counts=Counter();mains=Counter();subs=Counter();sub3=Counter()
with gzip.open(IN,'rt',encoding='utf-8') as f:
 for line in f:
  if not line.strip():continue
  r=json.loads(line);rid=str(r['id']);counts['records']+=1
  if rid in ids:errors.append({'id':rid,'check':'unique_id'})
  ids.add(rid)
  if rid not in ledger:errors.append({'id':rid,'check':'more_information_ledger_presence'})
  meta=r.get('cleaning_metadata',{});decisions=meta.get('field_evidence_decisions',{})
  ready=meta.get('ar_en_translation_readiness',{}).get('ready')
  if not ready:errors.append({'id':rid,'check':'translation_readiness_marker'})
  t=r.get('taxonomy',{});mains[t.get('primary_taxonomy_id')]+=1;subs[t.get('subcategory_id')]+=1;sub3[t.get('sub_subcategory_id')]+=1
  if t.get('primary_taxonomy_id')=='offers':errors.append({'id':rid,'check':'offers_not_main_category'})
  for tf in ('primary_taxonomy_id','subcategory_id','sub_subcategory_id'):
   if not t.get(tf):errors.append({'id':rid,'check':'taxonomy_level', 'field':tf})
  for loc in ('ar-SA','en'):
   x=r.get('locales',{}).get(loc,{})
   if not x.get('display_name'):errors.append({'id':rid,'check':'display_name','locale':loc})
   slug=x.get('slug')
   if not slug:errors.append({'id':rid,'check':'slug','locale':loc})
   elif slug in slugs[loc]:errors.append({'id':rid,'check':'unique_slug','locale':loc,'slug':slug})
   slugs[loc].add(slug)
   c=x.get('content',{})
   if c.get('more_information') is not None:errors.append({'id':rid,'check':'more_information_cleared','locale':loc})
   for field in FIELDS:
    d=decisions.get(loc,{}).get(field);present=bool(c.get(field));expected='present_explicit_source' if present else 'source_absent_no_invention'
    if not d or d.get('state')!=expected:errors.append({'id':rid,'check':'field_evidence_decision','locale':loc,'field':field,'expected':expected,'got':d})
  if r.get('governance',{}).get('public_eligibility'):errors.append({'id':rid,'check':'governance_public_closed'})
allowed={'empty_source_more_information','exact_description_duplicate','exact_other_field_duplicate','description_overlap_requires_semantic_review','unique_or_semantic_review_required'}
for rid,x in ledger.items():
 for loc,data in x['locales'].items():
  if data['state'] not in allowed:errors.append({'id':rid,'check':'more_information_ledger_state','locale':loc,'state':data['state']})
report={'version':'ar-en-translation-ready-v10','records':counts['records'],'unique_ids':len(ids),'unique_slugs':{k:len(v) for k,v in slugs.items()},'taxonomy':{'main_categories':len(mains),'subcategories':len(subs),'sub_subcategories':len(sub3),'main_distribution':mains},'more_information_ledger_records':len(ledger),'acceptance_errors':len(errors),'errors':errors[:200],'translation_ready':len(errors)==0,'medical_publication_ready':False,'sha256':hashlib.sha256(IN.read_bytes()).hexdigest()}
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
