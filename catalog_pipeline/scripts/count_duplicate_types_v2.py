#!/usr/bin/env python3
import json
from collections import Counter
from pathlib import Path
p=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/identity_duplicate_candidates_v2_full.jsonl')
groups=Counter(); records=Counter(); malformed=0
for line in p.open(encoding='utf-8'):
    if not line.strip(): continue
    x=json.loads(line)
    key=x.get('key')
    if not isinstance(key,list) or not key:
        malformed += 1; continue
    typ=str(key[0]); groups[typ]+=1; records[typ]+=len(x.get('record_ids',[]))
print(json.dumps({'groups_by_type':groups,'records_by_type':records,'malformed':malformed},ensure_ascii=False,indent=2))
