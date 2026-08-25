from __future__ import annotations
import hashlib, json, re, zipfile
from pathlib import Path

ROOT=Path('/tmp/nabd-main-audit')
BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'
OUT=ROOT/'audit-artifacts/phase0d'
OUT.mkdir(parents=True, exist_ok=True)
ARCHIVES=['nabd_plus_patient_app.zip','nabd-patient-web.zip','NabdProvider-provider.zip','web_admin_dashboard.zip']

def classify(name):
    low=name.lower()
    if low.endswith(('.png','.jpg','.jpeg','.gif','.webp','.svg','.ico','.ttf','.otf','.woff','.woff2','.mp4','.mov','.mp3','.wav','.pdf','.zip','.tar','.gz')): return 'EXCLUSION_BINARY'
    if any(x in low for x in ['/node_modules/','/dist/','/build/','.map','/coverage/','/.expo/','/.next/']): return 'EXCLUSION_GENERATED_VENDOR'
    if re.search(r'(^|/)(test|tests|__tests__|e2e|spec|.*\.test\.|.*\.spec\.)',low): return 'OWNED_TEST'
    if low.endswith(('.ts','.tsx','.js','.jsx','.py','.java','.kt','.swift','.m','.mm','.dart','.vue','.svelte','.css','.scss','.html','.graphql','.gql')): return 'OWNED_SOURCE_MEMBER'
    if low.endswith(('.json','.yaml','.yml','.toml','.ini','.env.example','.md','.txt','.xml','.plist','.gradle','.properties','.lock')): return 'OWNED_CONFIG_DOC'
    return 'EXCLUSION_OTHER'

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

summary=[]
for archive in ARCHIVES:
    path=BASE/archive
    with zipfile.ZipFile(path) as z:
        infos=[i for i in z.infolist() if not i.is_dir()]
        counts={}
        for i in infos: counts[classify(i.filename)]=counts.get(classify(i.filename),0)+1
        summary.append({'archive':archive,'path':str(path),'bytes':path.stat().st_size,'sha256':sha(path),'members_total':len(infos),'counts':counts,'members':[{'path':i.filename,'bytes':i.file_size,'kind':classify(i.filename)} for i in infos]})
(OUT/'archive_inventory.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with (OUT/'archive_inventory.tsv').open('w',encoding='utf-8') as f:
    f.write('archive\tmember_path\tbytes\tkind\tarchive_sha256\n')
    for s in summary:
        for m in s['members']: f.write(f"{s['archive']}\t{m['path']}\t{m['bytes']}\t{m['kind']}\t{s['sha256']}\n")
for s in summary: print(s['archive'],s['sha256'],s['members_total'],s['counts'])
