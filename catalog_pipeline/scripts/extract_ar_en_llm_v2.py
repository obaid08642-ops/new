#!/usr/bin/env python3
from __future__ import annotations
import gzip,json,re,threading
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from openai import OpenAI

IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v6_deep_taxonomy.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/llm_extractions_ar_en_v2.jsonl')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/llm_extractions_ar_en_v2_report.json')
MODEL='gpt-5-nano'; WORKERS=8
lock=threading.Lock()
SYSTEM='''You are a strict bilingual catalog extraction system. Inspect only the Arabic and English evidence provided for ONE product. Return a single valid JSON object only; no markdown. Never infer, synthesize, translate, or add medical facts. Copy or normalize only statements explicitly present in the supplied evidence. If a fact is not present, return [] or null. Never turn marketing claims into clinical indications. Classify the product broadly from name/evidence using one allowed main_category: makeup-and-accessories, skin-care, hair-care, mum-and-baby, personal-care, home-health-care, medicine-and-treatment, vitamins-and-healthy-nutrition, offers, or other. Use the input legacy category as context but not as proof for medical claims.\nRequired JSON keys exactly: product_kind, main_category, subcategory_signal, sub_subcategory_signal, indications_ar, indications_en, dosage_ar, dosage_en, warnings_ar, warnings_en, storage_ar, storage_en, semantic_duplicate_flags, confidence. product_kind is one of medicine,supplement,medical_device,cosmetic,personal_care,baby_product,service,other,unknown. confidence is high,medium,low. semantic_duplicate_flags is an array containing any of description_repeats_indications, description_repeats_dosage, description_repeats_warnings, description_repeats_storage, or empty array.'''

def parse_json(s):
 s=(s or '').strip()
 try:return json.loads(s)
 except Exception:
  m=re.search(r'\{.*\}',s,re.S)
  if not m:raise
  return json.loads(m.group(0))

def existing():
 if not OUT.exists():return set()
 done=set()
 with OUT.open(encoding='utf-8') as f:
  for line in f:
   try:done.add(str(json.loads(line)['id']))
   except Exception:pass
 return done

def slim(r):
 ar=r['locales']['ar-SA']; en=r['locales']['en']
 return {'id':str(r['id']),'name_ar':ar.get('display_name'),'name_en':en.get('display_name'),'legacy_category':r.get('cleaning_metadata',{}).get('taxonomy_candidate',{}).get('legacy_main_category'),'current_taxonomy':r.get('taxonomy'),'arabic':ar.get('content'),'english':en.get('content')}

def one(payload):
 c=OpenAI()
 try:
  resp=c.chat.completions.create(model=MODEL,messages=[{'role':'system','content':SYSTEM},{'role':'user','content':json.dumps(payload,ensure_ascii=False,separators=(',',':'))}],max_completion_tokens=900,extra_body={'reasoning':{'effort':'minimal'}})
  content=resp.choices[0].message.content if resp.choices else None
  result=parse_json(content)
  return {'id':payload['id'],'status':'success','model':MODEL,'result':result,'usage':resp.usage.model_dump() if resp.usage else None}
 except Exception as e:
  return {'id':payload['id'],'status':'error','error_type':type(e).__name__,'error':str(e)[:600]}

def main():
 done=existing(); items=[]
 with gzip.open(IN,'rt',encoding='utf-8') as f:
  for line in f:
   if line.strip():
    r=json.loads(line)
    if str(r['id']) not in done:items.append(slim(r))
 counts={'already_done':len(done),'queued':len(items),'success':0,'error':0}
 with OUT.open('a',encoding='utf-8') as out,ThreadPoolExecutor(max_workers=WORKERS) as ex:
  fs={ex.submit(one,x):x['id'] for x in items}
  for i,fu in enumerate(as_completed(fs),1):
   row=fu.result();counts[row['status']]=counts.get(row['status'],0)+1
   with lock:out.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n');out.flush()
   if i%50==0:print(json.dumps({'completed_now':i,'total_queued':len(items),'counts':counts},ensure_ascii=False),flush=True)
 report={'input':str(IN),'output':str(OUT),'model':MODEL,'workers':WORKERS,'counts':counts,'complete':counts.get('success',0)+counts.get('error',0)==len(items)}
 REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
