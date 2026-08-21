#!/usr/bin/env python3
import gzip,json,re
from collections import Counter
from pathlib import Path
IN=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v3_ar_en_structured.jsonl.gz')
TAX=Path('/home/ubuntu/catalog_pipeline/data/internal/taxonomy_candidates.jsonl')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v4_taxonomy_complete.jsonl.gz')
REPORT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/taxonomy_complete_v4_report.json')

def norm(x): return re.sub(r'\s+',' ',str(x or '').casefold()).strip()

def load(path): return {str(x.get('record_id')):x for line in path.open(encoding='utf-8') if line.strip() for x in [json.loads(line)]}

def main_category(legacy):
    x=norm(legacy)
    return {'المكياج والتجميل':'makeup-cosmetics','العناية بالبشرة':'skin-care','العناية بالشعر':'hair-care','الأم والطفل':'mother-baby','العناية الشخصية':'personal-care-hygiene','تجميل وعناية':'bath-body-fragrance','أدوية ومكملات':'medicines-supplements','العروض':'offers','الأجهزة الطبية':'medical-devices'}.get(x,'other-health')

def medicine_sub(text):
    rules=[('vitamins-supplements',['فيتامين','مكمل','supplement','vitamin','omega','كالسيوم','calcium','زنك','zinc']),('pain-fever',['مسكن','ألم','pain','fever','باراسيتامول','paracetamol','ibuprofen','ايبوبروفين']),('cough-cold',['كحة','سعال','برد','زكام','cough','cold','flu']),('allergy',['حساسية','allergy','antihistamine']),('digestive',['معدة','قولون','إمساك','إسهال','digest','constipation','diarrhea','stomach']),('dermatology',['جلد','فطريات','حبوب','كريم','مرهم','skin','fungal','cream','ointment']),('anti-infective',['مضاد حيوي','عدوى','antibiotic','infection']),('diabetes',['سكري','انسولين','diabetes','insulin']),('cardiovascular',['ضغط','قلب','كوليسترول','blood pressure','heart','cholesterol']),('respiratory',['ربو','تنفس','asthma','respiratory']),('womens-health',['حمل','نسائي','دورة','pregnan','women']),('mens-health',['بروستاتا','رجالي','prostate','men'])]
    for sub,terms in rules:
        if any(t in text for t in terms): return sub
    return 'medicines-general'

def subcategory(main,text):
    if main=='medicines-supplements': return medicine_sub(text)
    if main=='makeup-cosmetics':
        for sub,terms in [('face-makeup',['وجه','foundation','كريم اساس','بودرة','powder']),('eye-makeup',['عين','رموش','mascara','eyeliner']),('lip-makeup',['شفاه','روج','lipstick','lip']),('nails',['اظافر','nail'])]:
            if any(t in text for t in terms): return sub
        return 'makeup-general'
    if main=='skin-care':
        for sub,terms in [('cleansers',['غسول','cleanser']),('moisturizers',['مرطب','moistur','hydrating']),('serums',['سيروم','serum']),('sun-care',['واقي شمس','sunscreen','sun'])]:
            if any(t in text for t in terms): return sub
        return 'skin-care-general'
    if main=='hair-care': return 'hair-care-general'
    if main=='mother-baby': return 'mother-baby-general'
    if main=='personal-care-hygiene': return 'personal-care-general'
    if main=='bath-body-fragrance': return 'bath-body-fragrance-general'
    if main=='medical-devices': return 'medical-devices-general'
    if main=='offers': return 'offers-general'
    return 'other-health-general'

def main():
    tax=load(TAX); total=0; counts=Counter(); source_counts=Counter(); sub_counts=Counter(); missing=[]
    with gzip.open(IN,'rt',encoding='utf-8') as src,gzip.open(OUT,'wt',encoding='utf-8',compresslevel=9) as dst:
        for line in src:
            if not line.strip(): continue
            r=json.loads(line); rid=str(r['id']); t=tax.get(rid) or {}; legacy=t.get('legacy_main_category') or ''
            main_id=t.get('candidate_primary_taxonomy_id') or main_category(legacy)
            if not main_id: main_id='other-health'; missing.append(rid)
            ar=r.get('locales',{}).get('ar-SA',{}).get('display_name') or ''; en=r.get('locales',{}).get('en',{}).get('display_name') or ''
            text=norm(f'{ar} {en} {r.get("common",{}).get("form") or ""} {r.get("common",{}).get("strength") or ""}')
            sub=subcategory(main_id,text); sub3=f'{sub}-general'
            r.setdefault('taxonomy',{})['primary_taxonomy_id']=main_id; r['taxonomy']['secondary_taxonomy_ids']=[sub]; r['taxonomy']['state']='proposed'; r['taxonomy']['subcategory_id']=sub; r['taxonomy']['sub_subcategory_id']=sub3
            meta=r.setdefault('cleaning_metadata',{}); meta['taxonomy_proposal']={'main_category_id':main_id,'subcategory_id':sub,'sub_subcategory_id':sub3,'source':'legacy_category_and_record_names','status':'review_required','medical_approval':False}
            if t.get('candidate_primary_taxonomy_id'): source='existing_candidate'
            elif legacy: source='legacy_main_category_mapping'
            else: source='fallback_other_health'
            source_counts[source]+=1; counts[main_id]+=1; sub_counts[sub]+=1; total+=1
            dst.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
    report={'input':str(IN),'output':str(OUT),'records':total,'main_category_count':len(counts),'main_category_counts':counts,'subcategory_count':len(sub_counts),'subcategory_counts':sub_counts,'source_counts':source_counts,'records_without_category':len(missing),'taxonomy_state':'proposed_review_required','public_eligibility_open':False,'medical_approval':False}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
