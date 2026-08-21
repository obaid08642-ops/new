#!/usr/bin/env python3
import gzip,json,os
from openai import OpenAI
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v6_deep_taxonomy.jsonl.gz')
RID='103108'
record=None
with gzip.open(IN,'rt',encoding='utf-8') as f:
 for line in f:
  r=json.loads(line)
  if str(r.get('id'))==RID:record=r;break
if record is None:raise SystemExit('record not found')
ar=record['locales']['ar-SA'];en=record['locales']['en']
payload={'id':RID,'name_ar':ar.get('display_name'),'name_en':en.get('display_name'),'ar_content':ar.get('content'),'en_content':en.get('content'),'current_taxonomy':record.get('taxonomy')}
schema={'type':'object','properties':{'product_kind':{'type':'string','enum':['medicine','supplement','medical_device','cosmetic','personal_care','baby_product','service','other','unknown']},'taxonomy_signal':{'type':'string'},'indications_ar':{'type':'array','items':{'type':'string'}},'indications_en':{'type':'array','items':{'type':'string'}},'dosage_ar':{'type':['string','null']},'dosage_en':{'type':['string','null']},'warnings_ar':{'type':'array','items':{'type':'string'}},'warnings_en':{'type':'array','items':{'type':'string'}},'storage_ar':{'type':['string','null']},'storage_en':{'type':['string','null']},'confidence':{'type':'string','enum':['high','medium','low']}},'required':['product_kind','taxonomy_signal','indications_ar','indications_en','dosage_ar','dosage_en','warnings_ar','warnings_en','storage_ar','storage_en','confidence'],'additionalProperties':False}
client=OpenAI()
resp=client.chat.completions.create(model='gpt-5-mini',messages=[{'role':'system','content':'Extract only statements explicitly contained in the supplied Arabic/English catalog record. Never infer or add medical facts. Preserve language. If a field is not explicitly present, return empty array or null. taxonomy_signal must be a brief neutral product-type phrase from the names only.'},{'role':'user','content':json.dumps(payload,ensure_ascii=False)}],response_format={'type':'json_schema','json_schema':{'name':'catalog_extraction','strict':True,'schema':schema}},max_completion_tokens=1600)
raw=resp.model_dump()
if not resp.choices or not resp.choices[0].message.content:
 out={'id':RID,'model':'gpt-5-mini','input':payload,'error':'empty_or_missing_choice','raw_response':raw}
else:
 out={'id':RID,'model':'gpt-5-mini','input':payload,'output':json.loads(resp.choices[0].message.content),'usage':resp.usage.model_dump() if resp.usage else None}
Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/test_llm_extraction_v1.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(out,ensure_ascii=False,indent=2))
