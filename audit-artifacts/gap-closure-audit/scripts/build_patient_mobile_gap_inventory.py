from pathlib import Path
import csv,hashlib,re,zipfile
ROOT=Path('/tmp/nabd-main-audit')
ZIP=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/nabd_plus_patient_app.zip'
OUT=ROOT/'audit-artifacts/gap-closure-audit/PATIENT_MOBILE_SCREEN_ACTION_SCENARIO_INVENTORY_2026-08-26.tsv'

def domain(route):
 p=route.split('/')
 if len(p)>1 and p[0].startswith('('): return p[0].strip('()')
 return p[0] if len(p)>1 else 'root'
def route_from(path):
 p=path[len('app/'):]
 return p.rsplit('.',1)[0]
def lines(text,pat):
 return ','.join(str(i) for i,l in enumerate(text.splitlines(),1) if re.search(pat,l)) or 'NONE'
rows=[]
with zipfile.ZipFile(ZIP) as z:
 for info in sorted(z.infolist(),key=lambda x:x.filename):
  p=info.filename
  q=p.lower()
  if not q.startswith('app/') or not q.endswith(('.tsx','.ts','.jsx','.js')): continue
  if any(x in q for x in ['.test.','.spec.','/__tests__/','/tests/']) or Path(q).name.startswith('_layout'): continue
  b=z.read(info); text=b.decode('utf-8','replace'); r=route_from(p)
  rows.append({'screen_id':'PM-'+str(len(rows)+1).zfill(3),'mobile_route':r,'domain':domain(r),'source_path':p,'sha256':hashlib.sha256(b).hexdigest(),'line_count':text.count('\n')+(1 if text else 0),'action_signal_lines':lines(text,r'\b(onPress|onClick|navigate|router\.(push|replace)|href=|fetch\(|axios\.|api\.)'),'state_signal_lines':lines(text,r'\b(loading|error|empty|retry|cancel|refund|payment|insurance|offer|slot|order|offline)\b'),'screen_review_status':'NOT_YET_MANUALLY_REVIEWED','cta_inventory_status':'NOT_YET_MANUALLY_REVIEWED','scenario_matrix_status':'NOT_YET_MANUALLY_REVIEWED','web_equivalent_status':'NOT_MAPPED','contract_status':'NOT_RECONCILED','data_source_status':'NOT_REVIEWED','mock_placeholder_disposition':'NOT_REVIEWED','gap_disposition':'NOT_DECIDED'})
fields=list(rows[0])
with OUT.open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields,delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(rows)
print('MOBILE_ROUTE_ROWS='+str(len(rows)))
print('OUTPUT='+str(OUT))
