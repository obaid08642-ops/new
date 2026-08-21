#!/usr/bin/env python3
import gzip,json,re,requests
from pathlib import Path
from collections import Counter
SITEMAPS={'ar':'https://www.al-dawaa.com/sitemap/ar/Product-ar-SAR.xml','en':'https://www.al-dawaa.com/sitemap/en/Product-en-SAR.xml'}
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v6_deep_taxonomy.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/al_dawaa_product_sitemap_index_v1.jsonl')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/al_dawaa_sitemap_index_v1_report.json')
urls={}
LOCAL={'ar':Path('/home/ubuntu/upload/www.al-dawaa.com_sitemap_ar_Product-ar-SAR.xml_1787279171711.md'),'en':Path('/home/ubuntu/upload/www.al-dawaa.com_sitemap_en_Product-en-SAR.xml_1787279200749.md')}
for locale,url in SITEMAPS.items():
 if LOCAL[locale].exists():
  text=LOCAL[locale].read_text(encoding='utf-8')
 else:
  r=requests.get(url,timeout=60,headers={'User-Agent':'Mozilla/5.0','Accept':'application/xml,text/xml,*/*'})
  r.raise_for_status(); text=r.text
 found=re.findall(r'https://www\.al-dawaa\.com/'+locale+r'/p/(\d+)/[^\s<]+',text)
 for pid in found:
  # URL extraction with a second regex to retain path
  m=re.search(r'https://www\.al-dawaa\.com/'+locale+r'/p/'+re.escape(pid)+r'/[^\s<]+',text)
  urls.setdefault(pid,{})[locale]=m.group(0) if m else None
catalog=[]
with gzip.open(IN,'rt',encoding='utf-8') as f:
 for line in f:
  if line.strip():catalog.append(str(json.loads(line)['id']))
matched=0
with OUT.open('w',encoding='utf-8') as f:
 for pid in catalog:
  x={'id':pid,'sitemap_ar_url':urls.get(pid,{}).get('ar'),'sitemap_en_url':urls.get(pid,{}).get('en'),'ar_found':pid in urls and 'ar' in urls[pid],'en_found':pid in urls and 'en' in urls[pid]}
  if x['ar_found'] or x['en_found']:matched+=1
  f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
report={'catalog_records':len(catalog),'sitemap_product_ids':len(urls),'matched_catalog_ids':matched,'unmatched_catalog_ids':len(catalog)-matched,'coverage_pct':round(100*matched/len(catalog),3),'sitemaps':SITEMAPS,'output':str(OUT)}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
