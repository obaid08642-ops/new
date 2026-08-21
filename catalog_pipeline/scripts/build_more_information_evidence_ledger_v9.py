#!/usr/bin/env python3
import gzip,json,re
from collections import Counter
from pathlib import Path
RAW=Path('/home/ubuntu/catalog_pipeline/data/raw/medicines_6lang_21013.json.gz')
V8=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v8_official_main_taxonomy.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/more_information_evidence_ledger_v9.jsonl')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/more_information_evidence_ledger_v9_report.json')
def clean(x):return re.sub(r'\s+',' ',str(x or '')).strip()
def norm(x):return clean(x).casefold()
with gzip.open(RAW,'rt',encoding='utf-8') as f:raw={str(x.get('id')):x for x in json.load(f).get('medicines',[]) if isinstance(x,dict)}
counts=Counter()
with gzip.open(V8,'rt',encoding='utf-8') as src,OUT.open('w',encoding='utf-8') as dst:
 for line in src:
  if not line.strip():continue
  r=json.loads(line);rid=str(r['id']);q=raw.get(rid,{})
  row={'id':rid,'locales':{}}
  for locale,suffix in [('ar-SA','ar'),('en','en')]:
   c=r['locales'][locale]['content'];more=clean(q.get('more_info_'+suffix));fields={'description':clean(q.get('description_'+suffix) or c.get('description')),'indications':' | '.join(c.get('indications') or []),'dosage':clean(c.get('dosage')),'warnings':' | '.join(c.get('warnings') or []),'storage_conditions':clean(c.get('storage_conditions'))}
   if not more:state='empty_source_more_information'
   elif norm(more)==norm(fields['description']):state='exact_description_duplicate'
   elif any(norm(more)==norm(v) for k,v in fields.items() if k!='description' and v):state='exact_other_field_duplicate'
   elif norm(more) in norm(fields['description']) or norm(fields['description']) in norm(more):state='description_overlap_requires_semantic_review'
   else:state='unique_or_semantic_review_required'
   row['locales'][locale]={'state':state,'raw_more_information':more,'field_snapshot':fields}
   counts[f'{locale}:{state}']+=1
  dst.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
REPORT.write_text(json.dumps({'records':sum(1 for _ in gzip.open(V8,'rt',encoding='utf-8')),'counts':counts,'output':str(OUT),'note':'All raw More Information text is retained in this evidence ledger; no content is deleted by this operation.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'counts':counts,'output':str(OUT)},ensure_ascii=False,indent=2))
