#!/usr/bin/env python3
from __future__ import annotations
import gzip, json, os, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from openai import OpenAI

INPUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v2_reviewable.jsonl.gz')
OUTPUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/translation_drafts_v2.jsonl')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/translation_drafts_v2_report.json')
TARGETS=['ur','hi','bn','fil']
FIELDS=['display_name','official_name','description','more_information','indications','dosage','warnings','storage_conditions']
BATCH_SIZE=4
MAX_WORKERS=6
MODEL='gpt-5-mini'


def compact(value):
    if isinstance(value,list): return [str(x) for x in value if str(x).strip()]
    if value is None: return None
    s=str(value).strip()
    return s or None


def make_jobs():
    jobs=[]
    with gzip.open(INPUT,'rt',encoding='utf-8') as f:
        for line in f:
            if not line.strip(): continue
            row=json.loads(line); en=row.get('locales',{}).get('en',{}); ec=en.get('content',{})
            source={}
            for field in FIELDS:
                value=compact(ec.get(field) if field not in ('display_name','official_name') else en.get(field))
                if value is not None: source[field]=value
            if not source: continue
            jobs.append({'id':str(row['id']),'source':source,'targets':TARGETS})
    return jobs


def call_batch(batch):
    client=OpenAI(timeout=45.0, max_retries=0)
    payload=[{'id':x['id'],'source_en':x['source'],'target_locales':TARGETS} for x in batch]
    system=("You are a medical catalog translation engine. Translate only the supplied English text into Urdu (ur), Hindi (hi), Bengali (bn), and Filipino (fil). "
            "Return JSON only with key translations, an array containing one object per id and locale. Preserve medicine names, brand names, units, numbers, dosage amounts, frequencies, warnings, and HTML-free meaning exactly; do not add medical advice, diagnoses, claims, or facts. "
            "If a source field is null or absent, omit it. For arrays translate each item. If a proper medicine name should remain transliterated or unchanged, preserve it. These are DRAFT translations and must not be considered medically verified.")
    user=json.dumps(payload,ensure_ascii=False,separators=(',',':'))
    for attempt in range(4):
        try:
            r=client.chat.completions.create(model=MODEL,messages=[{'role':'system','content':system},{'role':'user','content':user}],response_format={'type':'json_object'},max_completion_tokens=16000)
            text=r.choices[0].message.content
            data=json.loads(text)
            if not isinstance(data.get('translations'),list): raise ValueError('missing translations array')
            return data['translations']
        except Exception:
            if attempt==3: raise
            time.sleep(2**attempt)


def main():
    jobs=make_jobs(); OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    done=set()
    if OUTPUT.exists():
        with OUTPUT.open(encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    x=json.loads(line); done.add((str(x['id']),x['locale']))
    pending=[j for j in jobs if any((j['id'],loc) not in done for loc in TARGETS)]
    batches=[pending[i:i+BATCH_SIZE] for i in range(0,len(pending),BATCH_SIZE)]
    ok=0; failed=0
    with OUTPUT.open('a',encoding='utf-8') as out:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
            futs={ex.submit(call_batch,b):b for b in batches}
            for fut in as_completed(futs):
                batch=futs[fut]
                try:
                    results=fut.result()
                    for item in results:
                        if not isinstance(item,dict) or 'id' not in item or 'locale' not in item: continue
                        item['translation_status']='review_required'
                        item['machine_translation']=True
                        out.write(json.dumps(item,ensure_ascii=False,separators=(',',':'))+'\n')
                        out.flush(); done.add((str(item['id']),item['locale'])); ok+=1
                except Exception as e:
                    failed+=len(batch)*len(TARGETS)
                    print(json.dumps({'error':str(e),'batch_ids':[x['id'] for x in batch]},ensure_ascii=False),flush=True)
    report={'input':str(INPUT),'output':str(OUTPUT),'model':MODEL,'targets':TARGETS,'source_records':len(jobs),'completed_pairs':ok,'already_present':len(done)-ok,'failed_pairs_estimate':failed,'draft_only':True,'medical_verification_required':True}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
