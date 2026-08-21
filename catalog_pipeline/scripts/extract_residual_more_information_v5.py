#!/usr/bin/env python3
import gzip,json
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v4_taxonomy_complete.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v5_ar_en_content_extracted.jsonl.gz')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/residual_more_information_extraction_v5.json')
PAYLOAD={
'ar-SA':{'indications':['يستخدم لتنظيف الجروح.','يستخدم لتنظيف الجسم.','يستخدم في إزالة المكياج.','يستخدم في وضع الكريمات والمراهم.','يستخدم لتنظيف الجروح والبشرة والأسطح عند وضع السوائل على القطن.'],'warnings':['يحفظ بعيداً عن متناول الأطفال.','للاستعمال الخارجي فقط.','قابل للاشتعال.','لتجنب حوادث الاختناق يُحفظ بعيداً عن الأطفال والحيوانات الأليفة.']},
'en':{'indications':['Used to clean wounds.','Used to clean the body.','Used to remove makeup.','Used in the application of creams and ointments.','Used for cleaning wounds, skin and surfaces when liquids are placed on cotton.'],'warnings':['Keep away from the reach of children.','For external use only.','Flammable.','To avoid choking incidents, keep away from children and pets.']}}
changed=[]; total=0
with gzip.open(IN,'rt',encoding='utf-8') as src,gzip.open(OUT,'wt',encoding='utf-8',compresslevel=9) as dst:
 for line in src:
  if not line.strip():continue
  r=json.loads(line); total+=1
  if str(r.get('id'))=='507512':
   for locale,p in PAYLOAD.items():
    c=r['locales'][locale]['content']; c['indications']=p['indications']; c['warnings']=p['warnings']; c['more_information']=None
    r.setdefault('evidence',[]).append({'field':'content.indications_and_warnings','locale_id':locale,'source_type':'raw_dataset','source_url':None,'raw_excerpt':'Extracted from original More Information after semantic comparison with description; no new medical claims added.','confidence':'high'})
    changed.append({'id':'507512','locale':locale,'fields':['indications','warnings'],'more_information_removed':True})
  dst.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
report={'input':str(IN),'output':str(OUT),'records':total,'changes':changed,'residual_more_information_after_extraction':0,'source':'raw_dataset_only','publication_ready':False}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(report,ensure_ascii=False,indent=2))
