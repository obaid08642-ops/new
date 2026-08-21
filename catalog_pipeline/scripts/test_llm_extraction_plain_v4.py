#!/usr/bin/env python3
import gzip,json
from pathlib import Path
from openai import OpenAI
RID='103108'; IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v6_deep_taxonomy.jsonl.gz'); OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/test_llm_extraction_plain_v4.json')
record=None
with gzip.open(IN,'rt',encoding='utf-8') as f:
 for line in f:
  r=json.loads(line)
  if str(r['id'])==RID:record=r;break
ar=record['locales']['ar-SA'];en=record['locales']['en']
p={'id':RID,'name_ar':ar.get('display_name'),'name_en':en.get('display_name'),'description_ar':ar['content'].get('description'),'description_en':en['content'].get('description')}
sys='Return a single JSON object only. Extract only explicit information from supplied evidence. Do not invent. Required keys: indications_ar,indications_en,dosage_ar,dosage_en,warnings_ar,warnings_en,storage_ar,storage_en. Arrays must contain at most 3 short explicit items. Strings must be 500 characters or less. Use [] or null when absent.'
r=OpenAI().chat.completions.create(model='gpt-5-mini',messages=[{'role':'system','content':sys},{'role':'user','content':json.dumps(p,ensure_ascii=False)}],max_completion_tokens=1800)
out={'response':r.model_dump(),'content':r.choices[0].message.content if r.choices else None}
OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(out,ensure_ascii=False,indent=2))
