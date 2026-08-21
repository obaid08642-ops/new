#!/usr/bin/env python3
import re,json
from pathlib import Path
AR=Path('/home/ubuntu/upload/www.al-dawaa.com_sitemap_ar_Category-ar-SAR.xml_1787279170554.md')
EN=Path('/home/ubuntu/upload/www.al-dawaa.com_sitemap_en_Category-en-SAR.xml_1787279170466.md')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/al_dawaa_category_tree_v1.json')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/al_dawaa_category_tree_v1_report.json')

def parse(path, locale):
 text=path.read_text(encoding='utf-8')
 pat=r'https://www\.al-dawaa\.com/'+locale+r'/([^\s<]+)/c/(\d+)'
 d={}
 for p,code in re.findall(pat,text):
  parts=[x for x in p.strip('/').split('/') if x]
  d[code]={'path':p,'segments':parts,'level':len(parts)}
 return d
ar=parse(AR,'ar');en=parse(EN,'en'); codes=sorted(set(ar)|set(en),key=lambda x:int(x))
rows=[]; levels={}
for code in codes:
 a=ar.get(code,{});e=en.get(code,{})
 # Parent is deepest other path that is an exact prefix of this path.
 seg=a.get('segments') or e.get('segments') or []
 parent=None
 candidates=[]
 for pc,p in ar.items():
  q=p['segments']
  if len(q)<len(seg) and seg[:len(q)]==q:candidates.append((len(q),pc))
 if candidates:parent=max(candidates)[1]
 row={'code':code,'level':len(seg),'parent_code':parent,'ar_path':a.get('path'),'en_path':e.get('path'),'ar_segments':a.get('segments'),'en_segments':e.get('segments')}
 rows.append(row);levels[len(seg)]=levels.get(len(seg),0)+1
OUT.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
report={'categories':len(rows),'ar_categories':len(ar),'en_categories':len(en),'by_depth':levels,'output':str(OUT),'source':'Al-Dawaa category sitemaps'}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
