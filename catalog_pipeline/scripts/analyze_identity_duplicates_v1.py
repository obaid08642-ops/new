#!/usr/bin/env python3
"""Analyze identity duplicates and brand/manufacturer semantics without deleting records."""
from __future__ import annotations
import argparse, gzip, json, re, unicodedata
from collections import defaultdict, Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DEFAULT_INPUT=ROOT/'data/derived/cleaned_catalog_v1.jsonl.gz'
DEFAULT_OUTPUT=ROOT/'data/derived/cleaned_catalog_v1_identity.jsonl.gz'
DEFAULT_REPORT=ROOT/'data/derived/reports/identity_duplicates_v1_report.json'
DEFAULT_CANDIDATES=ROOT/'data/derived/reports/identity_duplicate_candidates_v1.jsonl'

def norm(v):
    if not isinstance(v,str): return ''
    s=unicodedata.normalize('NFKC',v).casefold()
    s=s.replace('ـ','')
    s=re.sub(r'[^\w\d]+',' ',s,flags=re.UNICODE)
    return re.sub(r'\s+',' ',s).strip()

def raw_key(raw):
    return tuple(norm(raw.get(k)) for k in ('name_ar','name_en','active_ingredient','generic_name','form','strength','package_size','package_content_details'))

def strong_key(raw):
    # Barcode/SKU overrides name-based ambiguity when present.
    barcode=norm(raw.get('barcode')); sku=norm(raw.get('sku'))
    if barcode or sku: return ('id',barcode,sku)
    return ('identity',)+raw_key(raw)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--input',type=Path,default=DEFAULT_INPUT); ap.add_argument('--raw-input',type=Path,default=ROOT/'data/raw/medicines_6lang_21013.json.gz'); ap.add_argument('--output',type=Path,default=DEFAULT_OUTPUT); ap.add_argument('--report',type=Path,default=DEFAULT_REPORT); ap.add_argument('--candidates',type=Path,default=DEFAULT_CANDIDATES); args=ap.parse_args()
    with gzip.open(args.raw_input,'rt',encoding='utf-8') as f: raw_rows=json.load(f).get('medicines',[])
    raw={str(r.get('id')):r for r in raw_rows if isinstance(r,dict)}
    groups=defaultdict(list); name_groups=defaultdict(list); brand_stats=Counter(); missing_brand=0; missing_manufacturer=0; records=[]
    with gzip.open(args.input,'rt',encoding='utf-8') as f:
        records=[json.loads(line) for line in f if line.strip()]
    for row in records:
        rid=str(row.get('id')); r=raw.get(rid,{})
        groups[strong_key(r)].append(rid)
        name_key=(norm(r.get('name_ar')),norm(r.get('name_en')))
        if all(name_key): name_groups[name_key].append(rid)
        brand=norm(r.get('brand')); manufacturer=norm(r.get('manufacturer'))
        if not brand: missing_brand+=1
        if not manufacturer: missing_manufacturer+=1
        if brand and manufacturer: brand_stats['both']+=1; brand_stats['different'] += brand != manufacturer
    duplicate_groups=[]; candidate_ids=set()
    for key,ids in groups.items():
        if key[0] in ('identity','id') and key != ('identity','','','','','','','') and len(ids)>1:
            duplicate_groups.append({'key':key,'record_ids':ids,'decision':'duplicate_candidate_requires_manual_confirmation'})
            candidate_ids.update(ids)
    name_duplicate_groups=[{'name_key':k,'record_ids':v,'decision':'name_duplicate_candidate_only'} for k,v in name_groups.items() if len(v)>1]
    args.output.parent.mkdir(parents=True,exist_ok=True); args.report.parent.mkdir(parents=True,exist_ok=True)
    with gzip.open(args.output,'wt',encoding='utf-8',compresslevel=9) as out:
        for row in records:
            rid=str(row.get('id')); r=raw.get(rid,{})
            meta=row.setdefault('cleaning_metadata',{})
            meta['identity_review']={'brand_source': 'raw.brand' if norm(r.get('brand')) else 'missing', 'manufacturer_source': 'raw.manufacturer' if norm(r.get('manufacturer')) else 'missing', 'brand_manufacturer_kept_separate': True, 'strong_duplicate_candidate': rid in candidate_ids, 'name_duplicate_candidate': any(rid in g['record_ids'] for g in name_duplicate_groups)}
            if not norm(r.get('brand')): meta.setdefault('review_queue',[]).append('brand_missing')
            if not norm(r.get('manufacturer')): meta.setdefault('review_queue',[]).append('manufacturer_missing')
            out.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
    with args.candidates.open('w',encoding='utf-8') as f:
        for g in duplicate_groups+name_duplicate_groups: f.write(json.dumps(g,ensure_ascii=False,separators=(',',':'))+'\n')
    report={'records':len(records),'strong_duplicate_candidate_groups':len(duplicate_groups),'strong_duplicate_candidate_records':len(candidate_ids),'name_duplicate_candidate_groups':len(name_duplicate_groups),'missing_brand':missing_brand,'missing_manufacturer':missing_manufacturer,'brand_manufacturer_both':brand_stats['both'],'brand_manufacturer_different':brand_stats['different'],'records_deleted':0,'brand_manufacturer_merged':0,'output':str(args.output),'candidates':str(args.candidates),'publication_ready':False}
    args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
