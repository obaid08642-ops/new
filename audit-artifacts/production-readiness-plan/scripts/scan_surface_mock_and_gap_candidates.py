from pathlib import Path
import csv,json,re,zipfile
ROOT=Path('/tmp/nabd-main-audit'); OUT=ROOT/'audit-artifacts/production-readiness-plan'
ARCHIVES={
 'patient-mobile':'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/nabd_plus_patient_app.zip',
 'patient-web':'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/nabd-patient-web.zip',
 'provider':'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/NabdProvider-provider.zip',
 'admin':'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/web_admin_dashboard.zip',
}
pat=re.compile(r'\b(mock|fake|placeholder|dummy|sample|demo|TODO|FIXME|not implemented|coming soon)\b',re.I)
rows=[]
for surface,rel in ARCHIVES.items():
 with zipfile.ZipFile(ROOT/rel) as z:
  for info in z.infolist():
   p=info.filename
   if p.endswith('/') or Path(p).suffix.lower() not in {'.tsx','.ts','.jsx','.js','.json'}: continue
   if any(x in p.lower() for x in ['.test.','.spec.','/__tests__/','/tests/','package-lock.json','yarn.lock','pnpm-lock.yaml','node_modules/']): continue
   text=z.read(info).decode('utf-8','replace')
   for ln,line in enumerate(text.splitlines(),1):
    m=pat.search(line)
    if m:
     rows.append({'surface':surface,'source_path':p,'line':ln,'signal':m.group(1).lower(),'snippet':line.strip()[:500],'classification':'STATIC_CANDIDATE_REQUIRES_SCREEN_AND_RUNTIME_REVIEW','required_disposition':'REAL_BACKEND_CONTRACT | TEST_ONLY_FIXTURE | LEGITIMATE_COPY | REMOVE'})
fields=list(rows[0]) if rows else ['surface','source_path','line','signal','snippet','classification','required_disposition']
with (OUT/'SURFACE_MOCK_PLACEHOLDER_GAP_CANDIDATES_2026-08-25.tsv').open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields,delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(rows)
summary={s:sum(r['surface']==s for r in rows) for s in ARCHIVES}; summary['total']=len(rows)
(OUT/'SURFACE_MOCK_PLACEHOLDER_GAP_CANDIDATES_SUMMARY_2026-08-25.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
