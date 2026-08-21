#!/usr/bin/env python3
import json
from collections import Counter,defaultdict
from pathlib import Path
TREE=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/al_dawaa_category_tree_v1.json')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/official_category_hierarchy_v2.json')
rows=json.loads(TREE.read_text(encoding='utf-8'))
mains=Counter();subs=Counter();sub3=Counter();examples=defaultdict(dict)
for r in rows:
 p=r.get('en_segments') or []
 if not p:continue
 mains[p[0]]+=1
 if len(p)>=2:subs['/'.join(p[:2])]+=1
 if len(p)>=3:sub3['/'.join(p[:3])]+=1
 examples['main'].setdefault(p[0],{'code':r['code'],'ar':(r.get('ar_segments') or [None])[0],'en':p[0]})
 if len(p)>=2:examples['sub'].setdefault('/'.join(p[:2]),{'code':r['code'],'ar':'/'.join((r.get('ar_segments') or [])[:2]),'en':'/'.join(p[:2])})
 if len(p)>=3:examples['sub3'].setdefault('/'.join(p[:3]),{'code':r['code'],'ar':'/'.join((r.get('ar_segments') or [])[:3]),'en':'/'.join(p[:3])})
report={'main_categories':len(mains),'subcategories':len(subs),'sub_subcategories':len(sub3),'main_counts':mains,'sub_counts':subs,'sub3_counts':sub3,'examples':examples}
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'main_categories':len(mains),'subcategories':len(subs),'sub_subcategories':len(sub3),'main_counts':mains},ensure_ascii=False,indent=2))
