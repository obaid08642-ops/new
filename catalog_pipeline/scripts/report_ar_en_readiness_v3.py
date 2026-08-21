#!/usr/bin/env python3
import gzip,json,hashlib
from pathlib import Path
from collections import Counter
INPUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v3_ar_en_structured.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/ar_en_readiness_v3.json')
locales=['ar-SA','en']; fields=['display_name','official_name','description','more_information','indications','dosage','warnings','storage_conditions']
count=0; ids=set(); stats={l:{f:{'nonempty':0,'empty':0} for f in fields} for l in locales}; states=Counter(); tax=Counter(); slugs={l:set() for l in locales}; governance=Counter()
with gzip.open(INPUT,'rt',encoding='utf-8') as f:
    for line in f:
        if not line.strip(): continue
        r=json.loads(line); count+=1; ids.add(str(r['id'])); states[r.get('locales',{}).get('ar-SA',{}).get('translation_status')]+=1; tax[r.get('taxonomy',{}).get('state')]+=1; governance[(r.get('governance',{}).get('public_eligibility'),r.get('governance',{}).get('indexing_eligibility'),r.get('governance',{}).get('approval_state'))]+=1
        for l in locales:
            x=r.get('locales',{}).get(l,{})
            for field in fields:
                v=x.get(field) if field in ('display_name','official_name') else x.get('content',{}).get(field)
                ok=any(str(i).strip() for i in v) if isinstance(v,list) else bool(str(v).strip()) if v is not None else False
                stats[l][field]['nonempty' if ok else 'empty']+=1
            if x.get('slug'): slugs[l].add(x['slug'])
result={'input':str(INPUT),'records':count,'unique_ids':len(ids),'locales':stats,'unique_slugs':{l:len(v) for l,v in slugs.items()},'translation_status':states,'taxonomy_states':tax,'governance_states':{str(k):v for k,v in governance.items()},'publication_ready':False,'reason':'medical verification, content completeness, and taxonomy approval remain required','sha256':hashlib.sha256(INPUT.read_bytes()).hexdigest()}
OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,ensure_ascii=False,indent=2))
