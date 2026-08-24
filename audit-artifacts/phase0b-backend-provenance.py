from pathlib import Path
import csv
import hashlib
import shutil
import subprocess
import zipfile

ROOT = Path('/tmp/nabd-main-audit')
BASELINE = '22526bedb77a3d8148219036367e4714f401aecc'
ZIP = ROOT / 'audit-artifacts/phase0a-main-archives' / BASELINE / 'nabdah-backend.zip'
OUT = ROOT / 'audit-artifacts/phase0b-backend'
SRC = Path('/tmp/nabd-main-audit/phase0b-backend-source')
INDEX = ROOT / 'audit-artifacts/phase0a-main-audit/NABD_Main_Archive_Member_Inventory_2026-08-24.tsv'
OUT.mkdir(parents=True, exist_ok=True)
if SRC.exists():
    shutil.rmtree(SRC)
SRC.mkdir(parents=True)

with zipfile.ZipFile(ZIP) as zf:
    bad = zf.testzip()
    if bad:
        raise SystemExit(f'zip integrity failure: {bad}')
    zf.extractall(SRC)

expected = {}
with INDEX.open(encoding='utf-8') as f:
    for row in csv.DictReader(f, delimiter='\t'):
        if row['archive'] == 'nabdah-backend.zip':
            expected[row['member_path']] = row

rows = []
with zipfile.ZipFile(ZIP) as zf:
    names = [n for n in zf.namelist() if not n.endswith('/')]
for name in names:
    p = SRC / name
    h = hashlib.sha256(p.read_bytes()).hexdigest()
    exp = expected.get(name)
    if not exp:
        raise SystemExit(f'member missing from Phase 0A inventory: {name}')
    rows.append({
        'archive_path': 'nabdah-backend.zip',
        'member_path': name,
        'sha256': h,
        'phase0a_sha256': exp['sha256'],
        'sha256_match': 'YES' if h == exp['sha256'] else 'NO',
        'line_count': exp['line_count'],
        'kind': exp['kind'],
        'role': exp['role'],
        'domain': exp['domain'],
        'fully_read': 'NO',
        'evidence_file': 'UNASSIGNED',
        'evidence_section': 'UNASSIGNED',
        'line_ranges_read': 'UNASSIGNED',
        'routes_events': 'UNASSIGNED',
        'dto_schema_collection': 'UNASSIGNED',
        'consumers': 'UNASSIGNED',
        'auth_ownership': 'UNASSIGNED',
        'state_transitions': 'UNASSIGNED',
        'price_payment_insurance_source': 'UNASSIGNED',
        'tests': 'UNASSIGNED',
        'notes': 'Semantic read pending; inventory/provenance only'
    })

out = OUT / 'NABD_Phase0B_Backend_Semantic_Read_Manifest_2026-08-24.tsv'
fields = list(rows[0].keys()) if rows else []
with out.open('w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=fields, delimiter='\t', lineterminator='\n')
    w.writeheader(); w.writerows(rows)

summary = OUT / 'NABD_Phase0B_Backend_Provenance_2026-08-24.md'
owned = sum(r['kind'] == 'OWNED_SOURCE_MEMBER' for r in rows)
excluded = len(rows) - owned
mismatch = sum(r['sha256_match'] != 'YES' for r in rows)
with summary.open('w', encoding='utf-8') as f:
    f.write('# Phase 0B Backend provenance\n\n')
    f.write(f'Baseline: `{BASELINE}`\n\n')
    f.write(f'Source: `nabdah-backend.zip` materialized from the committed Phase 0A baseline archive bytes. Extraction path: `{SRC}` (local verification workspace).\n\n')
    f.write('| Metric | Result |\n|---|---:|\n')
    f.write(f'| Archive members | {len(rows)} |\n| Owned source/config members | {owned} |\n| Excluded members | {excluded} |\n| SHA-256 mismatches | {mismatch} |\n| Semantic `fully_read=YES` | 0 |\n| Semantic `fully_read=NO` | {len(rows)} |\n')
    f.write('\nEvery member is represented in `NABD_Phase0B_Backend_Semantic_Read_Manifest_2026-08-24.tsv`. SHA-256 is checked against the Phase 0A member inventory. This artifact is provenance/inventory only and does not claim semantic reading.\n')

print(f'members={len(rows)} owned={owned} excluded={excluded} sha_mismatch={mismatch}')
print(f'manifest={out}')
print(f'provenance={summary}')
