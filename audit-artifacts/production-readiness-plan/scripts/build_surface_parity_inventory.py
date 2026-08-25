from pathlib import Path
import csv,hashlib,json,re,zipfile
ROOT=Path('/tmp/nabd-main-audit'); OUT=ROOT/'audit-artifacts/production-readiness-plan'
ARCHIVES={
 'patient-mobile':'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/nabd_plus_patient_app.zip',
 'patient-web':'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/nabd-patient-web.zip',
 'provider':'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/NabdProvider-provider.zip',
 'admin':'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/web_admin_dashboard.zip',
}
SRC_EXT={'.tsx','.ts','.jsx','.js'}
def kind(surface,p):
 q=p.lower()
 if any(x in q for x in ['.test.','.spec.','/__tests__/','/tests/']): return 'EXCLUDED_TEST'
 if Path(q).name.startswith('_layout'): return 'EXCLUDED_LAYOUT'
 if surface=='patient-mobile' and (q.startswith('app/') or '/screens/' in q or q.startswith('screens/')): return 'SCREEN_OR_ROUTE_CANDIDATE'
 if surface=='patient-web' and (q.startswith('app/') or q.startswith('pages/') or '/app/' in q or '/pages/' in q): return 'SCREEN_OR_ROUTE_CANDIDATE'
 if surface in {'provider','admin'} and (('/screens/' in q or '/pages/' in q or q.startswith('src/screens/') or q.startswith('src/pages/'))): return 'SCREEN_OR_ROUTE_CANDIDATE'
 return 'SOURCE_SUPPORT'
def line_matches(text,pattern):
 return [n for n,l in enumerate(text.splitlines(),1) if re.search(pattern,l)]
rows=[]
for surface,rel in ARCHIVES.items():
 with zipfile.ZipFile(ROOT/rel) as z:
  for info in z.infolist():
   p=info.filename
   if p.endswith('/') or Path(p).suffix.lower() not in SRC_EXT: continue
   b=z.read(info); text=b.decode('utf-8','replace'); k=kind(surface,p)
   if k=='SCREEN_OR_ROUTE_CANDIDATE':
    actions=line_matches(text,r'\b(onPress|onClick|navigate|router\.(push|replace)|href=|fetch\(|axios\.|api\.)')
    state=line_matches(text,r'\b(loading|error|empty|retry|cancel|refund|payment|insurance|offer|slot|order)\b')
    rows.append({'surface':surface,'candidate_kind':k,'source_path':p,'sha256':hashlib.sha256(b).hexdigest(),'line_count':text.count('\n')+(1 if text else 0),'action_lines':','.join(map(str,actions[:40])) or 'NONE','state_signal_lines':','.join(map(str,state[:40])) or 'NONE','notes':'Candidate only; requires human route/screen/action confirmation. No parity claim.'})
fields=list(rows[0]);
with (OUT/'SURFACE_SCREEN_ROUTE_CANDIDATES_2026-08-25.tsv').open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields,delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(rows)
summary={s:{'screen_or_route_candidates':sum(r['surface']==s for r in rows),'with_action_signal':sum(r['surface']==s and r['action_lines']!='NONE' for r in rows),'with_state_signal':sum(r['surface']==s and r['state_signal_lines']!='NONE' for r in rows)} for s in ARCHIVES}
(OUT/'SURFACE_SCREEN_ROUTE_CANDIDATES_SUMMARY_2026-08-25.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
