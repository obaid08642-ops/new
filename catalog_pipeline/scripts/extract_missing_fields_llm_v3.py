#!/usr/bin/env python3
from __future__ import annotations
import gzip,json,re,threading
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from openai import OpenAI
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v6_deep_taxonomy.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/llm_missing_field_extractions_v3.jsonl')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/llm_missing_field_extractions_v3_report.json')
MODEL='gpt-5-nano'; WORKERS=4
SYSTEM='''Return ONE minified JSON object only, with exact keys: main_category,subcategory_signal,sub_subcategory_signal,indications_ar,indications_en,dosage_ar,dosage_en,warnings_ar,warnings_en,storage_ar,storage_en,confidence. Inspect only the supplied product names and descriptions. Do not infer or add facts. Only populate a field when its needs_* flag is true and the evidence explicitly states it; otherwise [] or null. Use no more than 5 short items per list and 500 characters per string. Do not copy large passages. Never translate. main_category must be one of makeup-and-accessories,skin-care,hair-care,mum-and-baby,personal-care,home-health-care,medicine-and-treatment,vitamins-and-healthy-nutrition,offers,other. confidence must be high,medium,low.'''

def parse(s):
 s=(s or '').strip()
 try:return json.loads(s)
 except Exception:
  m=re.search(r'\{.*\}',s,re.S)
  if m:return json.loads(m.group(0))
  raise

def done():
 out=set()
 if OUT.exists():
  for line in OUT.open(encoding='utf-8'):
   try:
    x=json.loads(line)
    if x.get('status')=='success':out.add(str(x['id']))
   except Exception:pass
 return out

def missing(content):
 return {'indications':not bool(content.get('indications')),'dosage':not bool(content.get('dosage')),'warnings':not bool(content.get('warnings')),'storage':not bool(content.get('storage_conditions'))}

def payload(r):
 ar=r['locales']['ar-SA'];en=r['locales']['en'];ac=ar['content'];ec=en['content']
 return {'id':str(r['id']),'name_ar':ar.get('display_name'),'name_en':en.get('display_name'),'legacy_category':r.get('cleaning_metadata',{}).get('taxonomy_candidate',{}).get('legacy_main_category'),'current_taxonomy':r.get('taxonomy'),'description_ar':ac.get('description'),'description_en':ec.get('description'),'needs_ar':missing(ac),'needs_en':missing(ec)}

def one(p):
 try:
  r=OpenAI().chat.completions.create(model=MODEL,messages=[{'role':'system','content':SYSTEM},{'role':'user','content':json.dumps(p,ensure_ascii=False,separators=(',',':'))}],max_completion_tokens=1100,extra_body={'reasoning':{'effort':'minimal'}})
  x=parse(r.choices[0].message.content if r.choices else None)
  return {'id':p['id'],'status':'success','model':MODEL,'result':x,'usage':r.usage.model_dump() if r.usage else None}
 except Exception as e:return {'id':p['id'],'status':'retryable_error','error_type':type(e).__name__,'error':str(e)[:300]}

def main():
 d=done();items=[]
 with gzip.open(IN,'rt',encoding='utf-8') as f:
  for line in f:
   if line.strip():
    r=json.loads(line)
    if str(r['id']) not in d:items.append(payload(r))
 counts={'already_success':len(d),'queued':len(items),'success':0,'retryable_error':0}
 lock=threading.Lock()
 with OUT.open('a',encoding='utf-8') as f,ThreadPoolExecutor(max_workers=WORKERS) as ex:
  fs=[ex.submit(one,x) for x in items]
  for i,fu in enumerate(as_completed(fs),1):
   row=fu.result();counts[row['status']]=counts.get(row['status'],0)+1
   with lock:f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n');f.flush()
   if i%50==0:print(json.dumps({'completed':i,'total':len(items),'counts':counts},ensure_ascii=False),flush=True)
 REPORT.write_text(json.dumps({'input':str(IN),'output':str(OUT),'model':MODEL,'workers':WORKERS,'counts':counts,'success_complete':counts['success']+counts['already_success']==20993},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if __name__=='__main__':main()
