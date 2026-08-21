#!/usr/bin/env python3
import gzip,json,re
from collections import Counter
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v6_deep_taxonomy.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v7_offer_reclassified.jsonl.gz')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/offer_reclassification_v7.json')

def norm(x):return re.sub(r'\s+',' ',str(x or '').casefold())
def has(t,words):return any(w in t for w in words)
def decide(t):
 rules=[
 ('mum-and-baby','diapers-wipes','baby-diapers',['diaper','حفاض','baby','رضيع','infant','pampers','huggies','رضاعات','حليب اطفال']),
 ('skin-care','moisturizers','moisturizers-general',['moistur','مرطب','cleanser','غسول','serum','سيروم','sunscreen','واقي شمس','skin','بشرة','mask','ماسك','acne','حبوب']),
 ('hair-care','hair-care-general','hair-general',['shampoo','شامبو','conditioner','بلسم','hair','شعر','صبغة','dye','coloring']),
 ('makeup-cosmetics','makeup-general','makeup-general',['lipstick','mascara','foundation','makeup','مكياج','روج','كحل','كونسيلر','مناكير']),
 ('personal-care-hygiene','personal-care-general','personal-care-general',['deodorant','مزيل عرق','tooth','oral','معجون','toothbrush','feminine','نسائية','razor','shaving','حلاقة']),
 ('bath-body-fragrance','bath-body-general','bath-body-general',['perfume','عطر','fragrance','body wash','shower','bath','استحمام','لوشن جسم']),
 ('medical-devices','medical-devices-general','medical-devices-general',['thermometer','pressure monitor','ميزان حرارة','جهاز قياس','walker','wheelchair','عكاز','bandage','ضماد','cotton','قطن']),
 ('medicines-supplements','medicines-general','medicines-general',['tablet','capsule','syrup','medicine','دواء','قرص','كبسول','شراب','vitamin','مكمل','فيتامين','supplement'])]
 for m,s,s3,w in rules:
  if has(t,w):return m,s,s3,'name_or_description_signal'
 return 'other-health','other-general','other-general','insufficient_non_offer_signal'
count=Counter();total=0
with gzip.open(IN,'rt',encoding='utf-8') as src,gzip.open(OUT,'wt',encoding='utf-8',compresslevel=9) as dst:
 for line in src:
  if not line.strip():continue
  r=json.loads(line);total+=1;t=r.get('taxonomy',{})
  if t.get('primary_taxonomy_id')=='offers':
   a=r['locales']['ar-SA'];e=r['locales']['en'];text=norm(' '.join(str(x or '') for x in [a.get('display_name'),e.get('display_name'),a.get('content',{}).get('description'),e.get('content',{}).get('description')]))
   m,s,s3,reason=decide(text);t.update({'primary_taxonomy_id':m,'secondary_taxonomy_ids':[s],'subcategory_id':s,'sub_subcategory_id':s3,'state':'proposed'})
   p=r.setdefault('cleaning_metadata',{}).setdefault('taxonomy_proposal',{});p.update({'main_category_id':m,'subcategory_id':s,'sub_subcategory_id':s3,'source':'offer-layer-reclassification-v7','status':'review_required','reason':reason})
   r['cleaning_metadata'].setdefault('changes',[]).append({'code':'offer_layer_reclassified','reason':reason});count[m]+=1
  dst.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
report={'records':total,'reclassified_offer_records':sum(count.values()),'main_category_counts':count,'output':str(OUT),'taxonomy_state':'proposed_review_required'}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
