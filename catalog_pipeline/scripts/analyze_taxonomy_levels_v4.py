#!/usr/bin/env python3
import gzip,json
from collections import Counter,defaultdict
from pathlib import Path
DATA=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/cleaned_catalog_v3_ar_en_structured.jsonl.gz')
TAX=Path('/home/ubuntu/catalog_pipeline/data/internal/taxonomy_candidates.jsonl')
OUT=Path('/home/ubuntu/catalog_pipeline/data/derived/full_execution_v2/reports/taxonomy_levels_v4.json')
rows=[json.loads(x) for x in TAX.open(encoding='utf-8') if x.strip()]
primary=Counter(); kinds=Counter(); legacy=Counter(); actions=Counter(); no_tax=[]
for x in rows:
    p=x.get('candidate_primary_taxonomy_id')
    if p: primary[p]+=1
    else: no_tax.append(str(x.get('record_id')))
    if x.get('candidate_product_kind'): kinds[x['candidate_product_kind']]+=1
    if x.get('legacy_main_category'): legacy[x['legacy_main_category']]+=1
    actions[x.get('action')]+=1
result={'candidate_records':len(rows),'unique_primary_taxonomies':len(primary),'primary_taxonomy_counts':primary,'legacy_main_category_count':len(legacy),'legacy_main_categories':legacy,'product_kind_counts':kinds,'actions':actions,'records_without_primary_candidate':len(no_tax),'records_without_primary_ids':no_tax[:100],'has_secondary_level':False,'has_sub_subcategory_level':False,'note':'Current source taxonomy candidates contain only one proposed primary taxonomy id; they do not contain approved subcategory or sub-subcategory assignments.'}
OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,ensure_ascii=False,indent=2))
