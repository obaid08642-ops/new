from pathlib import Path
import hashlib
import re
from collections import Counter

ROOT = Path('/tmp/nabd-main-audit')
BASELINE = '22526bedb77a3d8148219036367e4714f401aecc'
ARCHIVE_ROOT = ROOT / 'audit-artifacts' / 'phase0a-main-archives' / BASELINE
OUT_ROOT = ROOT / 'audit-artifacts' / 'phase0a-main-audit'
OUT_ROOT.mkdir(parents=True, exist_ok=True)

TEXT_EXTS = {'.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.yaml','.yml','.toml','.sql','.graphql','.gql','.css','.scss','.md','.html','.xml','.sh','.conf','.ini','.env','.txt','.tsv','.csv'}
BINARY_EXTS = {'.png','.jpg','.jpeg','.gif','.webp','.svg','.ico','.mp4','.mov','.mp3','.wav','.ttf','.woff','.woff2','.pdf','.zip','.jar','.so','.dylib','.apk','.aab','.keystore'}
GENERATED_PARTS = ('node_modules/', 'dist/', 'build/', 'coverage/', '.next/', '.expo/', 'vendor/', 'generated/', 'generated-client/', '__pycache__/', '.turbo/')
SOURCE_HINTS = ('src/','app/','server/','client/','components/','components-next/','lib/','shared/','utils/','scripts/','test/','tests/','e2e/','drizzle/','infra/','public/','i18n/','messages/','assets/')
ROLE_HINTS = {
    'controller': ('controller',), 'service': ('service',), 'schema': ('schema',), 'dto': ('dto',), 'guard': ('guard',),
    'route': ('route.ts','routes/'), 'screen': ('app/','screens/','pages/'), 'test': ('.spec.','.test.','e2e/','tests/'),
    'config': ('config','package.json','tsconfig','next.config','dockerfile','.env.example','manifest','sitemap','robots'),
    'migration': ('migration','drizzle/'), 'repository': ('repository','repo'), 'job': ('job','worker','queue'),
    'gateway': ('gateway','webhook','livekit','payment'), 'ci/deployment': ('.github/','dockerfile','compose','deploy','infra/')
}

def sha256(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()

def line_count(p):
    try:
        data = p.read_bytes()
        if b'\x00' in data[:8192]:
            return ''
        return data.count(b'\n') + (1 if data and not data.endswith(b'\n') else 0)
    except Exception:
        return ''

def classify(rel):
    low = rel.lower().replace('\\','/')
    suffix = Path(low).suffix
    if suffix in BINARY_EXTS:
        return 'EXCLUSION_BINARY', 'binary asset/package', 'NO'
    if any(part in low for part in GENERATED_PARTS):
        return 'EXCLUSION_GENERATED_OR_DEPENDENCY', 'generated/build/dependency tree', 'NO'
    role = 'source/config'
    for candidate, hints in ROLE_HINTS.items():
        if any(h in low for h in hints):
            role = candidate
            break
    owned = suffix in TEXT_EXTS or any(h in low for h in SOURCE_HINTS)
    if not owned:
        return 'EXCLUSION_OTHER', 'non-source archive member', 'NO'
    return 'OWNED_SOURCE_MEMBER', role, 'NO'

def domain(archive, rel):
    low = rel.lower()
    if 'nabd_plus' in archive: return 'patient-mobile'
    if 'patient-web' in archive: return 'patient-web'
    if 'provider' in archive.lower(): return 'provider'
    if 'admin' in archive.lower(): return 'admin'
    return 'backend'

rows = []
for zip_dir in sorted(p for p in ARCHIVE_ROOT.iterdir() if p.is_dir()):
    archive = zip_dir.name + '.zip'
    for p in sorted(x for x in zip_dir.rglob('*') if x.is_file()):
        rel = p.relative_to(zip_dir).as_posix()
        status, role, read = classify(rel)
        rows.append({
            'archive': archive, 'member': rel, 'sha256': sha256(p), 'lines': line_count(p),
            'kind': status, 'role': role, 'domain': domain(archive, rel), 'status': 'INVENTORIED',
            'fully_read': read, 'evidence': 'UNVERIFIED — semantic read not yet demonstrated for this member' if read == 'NO' else 'evidence index pending', 'routes_screens_consumers': 'UNVERIFIED', 'schema_api_tests': 'UNVERIFIED'
        })

# Machine-readable complete member inventory.
tsv = OUT_ROOT / 'NABD_Main_Archive_Member_Inventory_2026-08-24.tsv'
with tsv.open('w', encoding='utf-8') as f:
    f.write('archive\tmember_path\tsha256\tline_count\tkind\trole\tdomain\tstatus\tfully_read\tevidence\troutes_screens_consumers\tschema_api_tests\n')
    for r in rows:
        vals = [str(r[k]).replace('\t',' ').replace('\n',' ') for k in ('archive','member','sha256','lines','kind','role','domain','status','fully_read','evidence','routes_screens_consumers','schema_api_tests')]
        f.write('\t'.join(vals) + '\n')

# Exclusion inventory.
ex = OUT_ROOT / 'NABD_Main_Archive_Exclusions_2026-08-24.tsv'
with ex.open('w', encoding='utf-8') as f:
    f.write('archive\tmember_path\tsha256\treason\n')
    for r in rows:
        if r['kind'].startswith('EXCLUSION'):
            f.write('\t'.join([r['archive'],r['member'],r['sha256'],r['role']]) + '\n')

counts = Counter((r['archive'], r['kind'], r['fully_read']) for r in rows)
summary = OUT_ROOT / 'NABD_Main_Source_Manifest_2026-08-24.md'
with summary.open('w', encoding='utf-8') as f:
    f.write('# Nabd Main Source Manifest — Phase 0A inventory\n\n')
    f.write(f'Baseline: `{BASELINE}`\n\n')
    f.write('This manifest is generated from archive bytes materialized with `git show <baseline>:<archive>` only. It is not a semantic-read closure: `Fully read=YES` is intentionally not asserted for any member by this generator.\n\n')
    f.write('| Archive | Total members | Owned source/config members | Exclusions | Fully read YES | Fully read NO |\n|---|---:|---:|---:|---:|---:|\n')
    for archive in sorted({r['archive'] for r in rows}):
        subset = [r for r in rows if r['archive']==archive]
        owned = sum(r['kind']=='OWNED_SOURCE_MEMBER' for r in subset)
        excl = sum(r['kind']!='OWNED_SOURCE_MEMBER' for r in subset)
        yes = sum(r['fully_read']=='YES' for r in subset)
        no = sum(r['fully_read']=='NO' for r in subset)
        f.write(f'| `{archive}` | {len(subset)} | {owned} | {excl} | {yes} | {no} |\n')
    owned_total = sum(r['kind']=='OWNED_SOURCE_MEMBER' for r in rows)
    excl_total = len(rows)-owned_total
    f.write(f'| **TOTAL** | **{len(rows)}** | **{owned_total}** | **{excl_total}** | **0** | **{len(rows)}** |\n\n')
    f.write('## Member-level fields\n\nEvery archive member is represented in `NABD_Main_Archive_Member_Inventory_2026-08-24.tsv` with archive/member path, SHA-256, line count, kind, role, domain, status, read state, evidence reference, routes/screens/consumers field, and schema/API/tests field. Excluded binary/generated/dependency members are listed separately in `NABD_Main_Archive_Exclusions_2026-08-24.tsv`.\n\n')
    f.write('## Closure gate\n\nThis is an inventory-complete but semantic-read-incomplete state. The audit must not claim Root Audit Final Closure until every owned member has either a defensible full semantic read with evidence and route/screen/schema/test linkage, or a documented first-party exclusion approved by the reviewer.\n')

print(f'rows={len(rows)} owned={sum(r["kind"]=="OWNED_SOURCE_MEMBER" for r in rows)} exclusions={sum(r["kind"]!="OWNED_SOURCE_MEMBER" for r in rows)}')
print(f'manifest={summary}')
print(f'inventory={tsv}')
print(f'exclusions={ex}')
