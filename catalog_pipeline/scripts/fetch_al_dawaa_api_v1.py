#!/usr/bin/env python3
from __future__ import annotations
import json, time, gzip
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

LEDGER=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/coverage_ledger_v1.jsonl')
CACHE=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/api_cache_v1')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/coverage_ledger_v1_api.jsonl')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/api_fetch_v1_report.json')
MAX_WORKERS=6; TIMEOUT=25

def cache_path(rid,locale):return CACHE/f'{rid}.{locale}.json.gz'
def get_one(rid,locale,url):
    p=cache_path(rid,locale)
    if p.exists(): return rid,locale,'cached',p
    try:
        r=requests.get(url,timeout=TIMEOUT,headers={'Accept':'application/json','User-Agent':'catalog-quality-audit/1.0'})
        status=f'http_{r.status_code}'
        if r.status_code==200:
            try: payload=r.json()
            except Exception: return rid,locale,'invalid_json',None
            p.parent.mkdir(parents=True,exist_ok=True)
            with gzip.open(p,'wt',encoding='utf-8',compresslevel=6) as f:json.dump(payload,f,ensure_ascii=False,separators=(',',':'))
            return rid,locale,'success',p
        return rid,locale,status,None
    except requests.Timeout:return rid,locale,'timeout',None
    except requests.RequestException as e:return rid,locale,f'network_error_{type(e).__name__}',None

def main():
 rows=[json.loads(x) for x in LEDGER.open(encoding='utf-8') if x.strip()]; tasks=[]
 for r in rows:
  for locale,key in [('ar','ar'),('en','en')]:tasks.append((r['id'],locale,r['api_urls'][key]))
 result={}; counts={}
 with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
  fs={ex.submit(get_one,*t):t[:2] for t in tasks}
  for i,f in enumerate(as_completed(fs),1):
   rid,locale,status,p=f.result();result[(rid,locale)]=status;counts[status]=counts.get(status,0)+1
   if i%250==0:print(json.dumps({'completed':i,'total':len(tasks),'counts':counts},ensure_ascii=False),flush=True)
 with OUT.open('w',encoding='utf-8') as f:
  for r in rows:
   r['api_ar_status']=result.get((r['id'],'ar'),'not_run');r['api_en_status']=result.get((r['id'],'en'),'not_run')
   f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
 report={'records':len(rows),'requests':len(tasks),'statuses':counts,'cache':str(CACHE),'output':str(OUT),'complete':len(result)==len(tasks)}
 REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
