from pathlib import Path
import csv,hashlib,re,zipfile
ROOT=Path('/tmp/nabd-main-audit'); BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'; OUT=ROOT/'audit-artifacts/gap-closure-audit'
ARCH={'provider':BASE/'NabdProvider-provider.zip','admin':BASE/'web_admin_dashboard.zip'}
def candidate(surface,p):
 q=p.lower()
 if any(x in q for x in ['.test.','.spec.','/__tests__/','/tests/']): return False
 if surface=='provider': return '/screens/' in q and q.endswith(('.tsx','.ts','.jsx','.js'))
 return ('/pages/admin/' in q or '/pages/' in q) and q.endswith(('.tsx','.ts','.jsx','.js'))
def lines(t,pat): return ','.join(str(i) for i,l in enumerate(t.splitlines(),1) if re.search(pat,l,re.I)) or 'NONE'
for surface,zp in ARCH.items():
 rows=[]
 with zipfile.ZipFile(zp) as z:
  for info in sorted(z.infolist(),key=lambda x:x.filename):
   p=info.filename
   if p.endswith('/') or not candidate(surface,p): continue
   b=z.read(info); t=b.decode('utf-8','replace')
   rows.append({'screen_id':('PR' if surface=='provider' else 'AD')+'-'+str(len(rows)+1).zfill(3),'surface':surface,'source_path':p,'sha256':hashlib.sha256(b).hexdigest(),'line_count':t.count('\n')+(1 if t else 0),'action_signal_lines':lines(t,r'\b(onPress|onClick|navigate|navigation\.navigate|fetch\(|axios\.|client\.(get|post|put|patch|delete))'),'state_signal_lines':lines(t,r'\b(loading|error|empty|retry|cancel|refund|payment|insurance|offer|slot|order|offline|pending|approved|rejected)'),'mock_blueprint_signal_lines':lines(t,r'\b(blueprint|mock|fake|dummy|simulated|not implemented|coming soon|TODO|FIXME)\b'),'role_matrix_status':'NOT_YET_MANUALLY_REVIEWED','cta_inventory_status':'NOT_YET_MANUALLY_REVIEWED','scenario_matrix_status':'NOT_YET_MANUALLY_REVIEWED','contract_status':'NOT_RECONCILED','data_source_status':'NOT_REVIEWED','security_review_status':'NOT_REVIEWED','gap_disposition':'NOT_DECIDED'})
 f=OUT/(('PROVIDER' if surface=='provider' else 'ADMIN')+'_SCREEN_ACTION_SCENARIO_INVENTORY_2026-08-26.tsv')
 with f.open('w',encoding='utf-8',newline='') as h:
  w=csv.DictWriter(h,fieldnames=list(rows[0]),delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(rows)
 print(surface.upper()+'_ROWS='+str(len(rows)))
