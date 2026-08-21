#!/usr/bin/env python3
import gzip,json
from collections import Counter
from pathlib import Path
RAW=Path('/home/ubuntu/catalog_pipeline/data/raw/medicines_6lang_21013.json.gz')
TREE=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/al_dawaa_category_tree_v1.json')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/legacy_category_profile_v7.json')
with gzip.open(RAW,'rt',encoding='utf-8') as f: rows=json.load(f).get('medicines',[])
legacy=Counter(str(x.get('category') or '').strip() or '<empty>' for x in rows)
tree=json.loads(TREE.read_text(encoding='utf-8'))
roots={}
for x in tree:
 if x['level']==1:
  roots[x['ar_segments'][0]]={'code':x['code'],'ar_path':x['ar_path'],'en_path':x['en_path']}
report={'records':len(rows),'legacy_category_count':len(legacy),'legacy_category_counts':legacy,'official_root_categories':roots,'official_category_total':len(tree)}
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
