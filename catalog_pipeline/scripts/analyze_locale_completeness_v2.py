#!/usr/bin/env python3
import gzip, json
from collections import Counter, defaultdict
from pathlib import Path

INPUT = Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v2_reviewable.jsonl.gz')
FIELDS = ['display_name','official_name','description','more_information','indications','dosage','warnings','storage_conditions']
counts = Counter(); total=0
with gzip.open(INPUT, 'rt', encoding='utf-8') as f:
    for line in f:
        if not line.strip():
            continue
        row=json.loads(line); total += 1
        for locale, data in row.get('locales', {}).items():
            counts[(locale,'records')] += 1
            content = data.get('content', {}) if isinstance(data.get('content'), dict) else {}
            for field in FIELDS:
                value = content.get(field) if field not in ('display_name','official_name') else data.get(field)
                if isinstance(value,list): ok=any(str(x).strip() for x in value)
                else: ok=bool(str(value).strip()) if value is not None else False
                counts[(locale,field,'nonempty' if ok else 'empty')] += 1
result={'input':str(INPUT),'records':total,'locales':{}}
for locale in sorted({k[0] for k in counts}):
    result['locales'][locale]={'records':counts[(locale,'records')]}
    for field in FIELDS:
        result['locales'][locale][field]={'nonempty':counts[(locale,field,'nonempty')],'empty':counts[(locale,field,'empty')]}
Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/locale_completeness_v2_full.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
