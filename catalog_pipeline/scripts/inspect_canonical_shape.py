#!/usr/bin/env python3
import gzip, json
from pathlib import Path
p=Path('/home/ubuntu/catalog_pipeline/data/internal/canonical_records.jsonl.gz')
with gzip.open(p,'rt',encoding='utf-8') as f:
    row=json.loads(next(line for line in f if line.strip()))
print(json.dumps({
    'top_keys': list(row.keys()),
    'product_kind': row.get('product_kind'),
    'common': row.get('common'),
    'taxonomy': row.get('taxonomy'),
    'locale_keys': {k:list(v.keys()) for k,v in row.get('locales',{}).items()},
    'locale_samples': {k:v for k,v in list(row.get('locales',{}).items())[:2]},
}, ensure_ascii=False, indent=2))
