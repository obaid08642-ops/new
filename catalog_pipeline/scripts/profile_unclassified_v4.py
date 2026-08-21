#!/usr/bin/env python3
import gzip,json
from pathlib import Path
TAX={str(x.get('record_id')):x for line in Path('/home/ubuntu/catalog_pipeline/data/internal/taxonomy_candidates.jsonl').open(encoding='utf-8') if line.strip() for x in [json.loads(line)]}
DATA=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v3_ar_en_structured.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/unclassified_profile_v4.json')
rows=[]; counts={'total':0,'with_brand':0,'with_form':0,'with_strength':0,'with_sku':0,'with_barcode':0,'medicine_suspect':0}
with gzip.open(DATA,'rt',encoding='utf-8') as f:
 for line in f:
  if not line.strip(): continue
  r=json.loads(line); rid=str(r['id']); t=TAX.get(rid,{})
  if t.get('candidate_primary_taxonomy_id'): continue
  counts['total']+=1; common=r.get('common',{}); ident=r.get('identifiers',{}); ar=r.get('locales',{}).get('ar-SA',{}).get('display_name'); en=r.get('locales',{}).get('en',{}).get('display_name')
  for key in ('brand','form','strength'):
   if common.get(key): counts[f'with_{key}']+=1
  if ident.get('sku'): counts['with_sku']+=1
  if ident.get('barcode'): counts['with_barcode']+=1
  text=f'{ar or ""} {en or ""}'.casefold()
  if any(x in text for x in ['دواء','حبوب','قرص','كبسول','شراب','medicine','tablet','capsule','syrup','mg','mcg']): counts['medicine_suspect']+=1
  if len(rows)<100: rows.append({'id':rid,'ar':ar,'en':en,'common':common,'identifiers':ident,'legacy_category':t.get('legacy_main_category')})
OUT.write_text(json.dumps({'counts':counts,'first_100':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(counts,ensure_ascii=False,indent=2))
