#!/usr/bin/env python3
import gzip,json,re
from collections import Counter
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v5_ar_en_content_extracted.jsonl.gz')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v6_deep_taxonomy.jsonl.gz')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/deep_taxonomy_v6_report.json')

def norm(x): return re.sub(r'\s+',' ',str(x or '').casefold()).strip()
def has(t,words): return any(w in t for w in words)

def med_sub(t):
    groups=[('vitamins-supplements',['فيتامين','مكمل','supplement','vitamin','omega','كالسيوم','calcium','زنك','zinc','magnesium','ماغنسيوم']),('pain-fever',['مسكن','ألم','pain','fever','باراسيتامول','paracetamol','ibuprofen','ايبوبروفين','diclofenac','ديكلوفيناك']),('cough-cold',['كحة','سعال','برد','زكام','cough','cold','flu','mucolytic']),('allergy',['حساسية','allergy','antihistamine','cetirizine','لوراتادين','loratadine']),('digestive',['معدة','قولون','إمساك','إسهال','digest','constipation','diarrhea','stomach','antacid','ارتجاع']),('dermatology',['فطريات','fungal','acne','حبوب','dermat','eczema','اكزيما','psoriasis','صدفية']),('anti-infective',['مضاد حيوي','antibiotic','infection','عدوى','amoxicillin','azithromycin','سيفال','cefal']),('diabetes',['سكري','انسولين','diabetes','insulin','metformin','ميتفورمين']),('cardiovascular',['ضغط','قلب','كوليسترول','blood pressure','heart','cholesterol','amlodipine','atorvastatin']),('respiratory',['ربو','تنفس','asthma','respiratory','inhaler','بخاخ']),('womens-health',['حمل','نسائي','دورة','pregnan','women','فوليك']),('mens-health',['بروستاتا','رجالي','prostate','erectile']),('eye-ear',['عين','أذن','eye','ear','ophthalm']),('nervous-system',['نوم','قلق','اكتئاب','sleep','anxiety','depression','neurop']),('antiseptics-first-aid',['مطهر','تعقيم','جرح','antiseptic','disinfect','wound','bandage'])]
    for k,w in groups:
        if has(t,w):return k
    return 'medicines-general'

def sub(main,t):
    if main=='medicines-supplements':return med_sub(t)
    rules={
      'makeup-cosmetics':[('face-makeup',['foundation','concealer','بودرة','برايمر','blush','كريم اساس']),('eye-makeup',['mascara','eyeliner','كحل','رموش','ظلال','eye shadow']),('lip-makeup',['lipstick','lip gloss','روج','شفاه']),('nails',['nail','اظافر','مناكير']),('makeup-tools',['فرش','brush','sponge','اسفنجة','makeup bag'])],
      'skin-care':[('cleansers',['cleanser','غسول','soap','صابون','micellar']),('moisturizers',['moistur','مرطب','hydrating','hydration']),('serums',['serum','سيروم','ampoule']),('sun-care',['sunscreen','sun block','واقي شمس']),('acne-care',['acne','حبوب','blemish','عيوب البشرة']),('masks-peels',['mask','ماسك','peel','تقشير','scrub']),('eye-care',['eye cream','كريم عين','under eye'])],
      'hair-care':[('shampoo',['shampoo','شامبو']),('conditioner',['conditioner','بلسم']),('hair-treatment',['mask','ماسك','treatment','علاج','ampoule']),('hair-oils-serums',['oil','زيت','serum','سيروم']),('hair-color',['color','صبغة','dye','حنة']),('hair-styling',['styling','gel','wax','مثبت','كريم تصفيف'])],
      'mother-baby':[('diapers-wipes',['diaper','حفاض','wipes','مناديل']),('baby-feeding',['feeding','bottle','رضاعة','حليب']),('baby-skin-care',['baby lotion','baby cream','كريم اطفال','للاطفال']),('pregnancy-mother-care',['pregnancy','pregnant','maternity','حامل','امومة']),('baby-accessories',['pacifier','لهاية','stroller','عربة'])],
      'personal-care-hygiene':[('oral-care',['tooth','oral','فرشاة','معجون','غسول فم']),('deodorants',['deodorant','مزيل عرق']),('feminine-care',['feminine','sanitary','فوط','دورة']),('shaving-hair-removal',['shaving','razor','hair removal','حلاقة','شفرة','ازالة الشعر']),('hand-foot-care',['hand','foot','يد','قدم','nail clipper'])],
      'bath-body-fragrance':[('body-wash-bath',['body wash','shower','bath','جل استحمام','غسول جسم']),('body-lotion',['body lotion','body cream','لوشن جسم','كريم جسم']),('fragrance',['perfume','fragrance','عطر','eau de']),('body-scrub',['scrub','مقشر']),('bath-accessories',['loofah','ليفة','منشفة'])],
      'medical-devices':[('diagnostic-devices',['thermometer','ميزان حرارة','blood pressure','ضغط','glucose','سكر']),('respiratory-devices',['nebulizer','بخار','inhaler','استنشاق']),('mobility-support',['walker','wheelchair','عكاز','كرسي']),('first-aid-supplies',['bandage','شاش','ضماد','cotton','قطن']),('vision-care',['lens','عدسات','glasses','نظارة'])],
      'offers':[('offers-general',[])],
    }
    for k,w in rules.get(main,[]):
        if not w or has(t,w):return k
    return f'{main}-general'

def sub3(subcat,t):
    form_rules=[('tablets',['tablet','tab','قرص','اقراص']),('capsules',['capsule','كبسول']),('syrup-solution',['syrup','شراب','solution','محلول']),('drops-spray',['drops','قطرة','spray','بخاخ']),('cream-gel-ointment',['cream','كريم','gel','جل','ointment','مرهم']),('powder-granules',['powder','بودرة','مسحوق','granules']),('wipes-pads',['wipes','مناديل','pads','فوط']),('liquid-oil',['lotion','لوشن','oil','زيت','liquid','سائل']),('accessories',['brush','فرش','kit','set','طقم','tool','اداة'])]
    for k,w in form_rules:
        if has(t,w):return f'{subcat}-{k}'
    return f'{subcat}-other'
mainc=Counter(); subc=Counter(); sub3c=Counter(); total=0
with gzip.open(IN,'rt',encoding='utf-8') as src,gzip.open(OUT,'wt',encoding='utf-8',compresslevel=9) as dst:
 for line in src:
  if not line.strip():continue
  r=json.loads(line); main=r.get('taxonomy',{}).get('primary_taxonomy_id') or 'other-health'; common=r.get('common',{}); ar=r.get('locales',{}).get('ar-SA',{}).get('display_name') or ''; en=r.get('locales',{}).get('en',{}).get('display_name') or ''
  text=norm(f'{ar} {en} {common.get("form") or ""} {common.get("strength") or ""}')
  s=sub(main,text); s3=sub3(s,text)
  r['taxonomy'].update({'primary_taxonomy_id':main,'secondary_taxonomy_ids':[s],'subcategory_id':s,'sub_subcategory_id':s3,'state':'proposed'})
  r.setdefault('cleaning_metadata',{})['taxonomy_proposal'].update({'subcategory_id':s,'sub_subcategory_id':s3,'taxonomy_version':'deep-taxonomy-v6','status':'review_required'})
  mainc[main]+=1; subc[s]+=1; sub3c[s3]+=1; total+=1
  dst.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
report={'input':str(IN),'output':str(OUT),'records':total,'main_categories':len(mainc),'subcategories':len(subc),'sub_subcategories':len(sub3c),'main_category_counts':mainc,'subcategory_counts':subc,'sub_subcategory_counts':sub3c,'taxonomy_state':'proposed_review_required','publication_ready':False}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
