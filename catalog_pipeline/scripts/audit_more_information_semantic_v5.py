#!/usr/bin/env python3
import gzip,json,re,unicodedata
from collections import Counter
from pathlib import Path
RAW=Path('/home/ubuntu/catalog_pipeline/data/raw/medicines_6lang_21013.json.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/more_information_semantic_audit_v5.json')
RESIDUAL=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/more_information_residual_v5.jsonl')

def clean(x):
    s=unicodedata.normalize('NFKC',str(x or '')).casefold()
    s=re.sub(r'<[^>]+>',' ',s)
    s=re.sub(r'[^\w\u0600-\u06ff]+',' ',s)
    return re.sub(r'\s+',' ',s).strip()
def tokens(x): return set(clean(x).split())
def score(a,b):
    aa,bb=tokens(a),tokens(b)
    if not aa or not bb:return 0.0
    return len(aa&bb)/min(len(aa),len(bb))
counts=Counter(); residual=[]
with gzip.open(RAW,'rt',encoding='utf-8') as f:
 rows=json.load(f).get('medicines',[])
for row in rows:
    for suffix in ('ar','en'):
        more=row.get(f'more_info_{suffix}')
        if not isinstance(more,str) or not more.strip(): counts[(suffix,'empty')]+=1; continue
        fields={
            'description':row.get(f'description_{suffix}'),
            'indications':row.get(f'indications_{suffix}'),
            'dosage':row.get(f'dosage_{suffix}') or row.get(f'usage_instructions_{suffix}'),
            'warnings':row.get(f'warnings_{suffix}') or row.get(f'precautions_{suffix}'),
            'storage_conditions':row.get(f'storage_conditions_{suffix}')}
        matches={k:score(more,v) for k,v in fields.items() if isinstance(v,str) and v.strip()}
        exact=[k for k,v in fields.items() if clean(more) and clean(more)==clean(v)]
        contained=[k for k,v in fields.items() if clean(more) and clean(more) in clean(v) or clean(v) and clean(v) in clean(more)]
        maxfield=max(matches,key=matches.get) if matches else None; maxscore=matches.get(maxfield,0.0) if maxfield else 0.0
        if exact: status='exact_duplicate'
        elif contained: status='contained_overlap'
        elif maxscore>=0.8: status='high_semantic_overlap'
        else: status='residual_requires_field_extraction'
        counts[(suffix,status)]+=1
        if status!='exact_duplicate': residual.append({'id':str(row.get('id')),'locale':suffix,'status':status,'best_field':maxfield,'best_score':round(maxscore,4),'more_information':more,'fields':fields})
with RESIDUAL.open('w',encoding='utf-8') as f:
 for x in residual:f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
result={'records':len(rows),'counts':{f'{a}:{b}':v for (a,b),v in counts.items()},'residual_count':len(residual),'residual_path':str(RESIDUAL)}
OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,ensure_ascii=False,indent=2))
