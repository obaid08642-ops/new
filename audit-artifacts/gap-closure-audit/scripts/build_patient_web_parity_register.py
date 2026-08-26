from pathlib import Path
import csv,hashlib,zipfile,re
ROOT=Path('/tmp/nabd-main-audit'); BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'
MOBILE=ROOT/'audit-artifacts/gap-closure-audit/PATIENT_MOBILE_SCREEN_ACTION_SCENARIO_INVENTORY_2026-08-26.tsv'
WEBZIP=BASE/'nabd-patient-web.zip'; OUT=ROOT/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv'

def web_route(path):
 p=path.replace('src/','')
 if p.startswith('app/') or p.startswith('pages/'):
  p=p.split('/',1)[1]
 p=p.rsplit('.',1)[0]
 p=re.sub(r'/(page|index)$','',p)
 return p or 'index'
def norm(x):
 x=x.lower().replace('(tabs)/','').replace('(auth)/','').replace('(onboarding)/','')
 x=x.replace('[id]','[param]').replace('[slug]','[param]').replace('[type]','[param]')
 return x.strip('/')
web=[]
with zipfile.ZipFile(WEBZIP) as z:
 for info in sorted(z.infolist(),key=lambda x:x.filename):
  p=info.filename; q=p.lower()
  if p.endswith('/') or not q.endswith(('.tsx','.ts','.jsx','.js')): continue
  if any(x in q for x in ['.test.','.spec.','/__tests__/','/tests/','/_layout.']): continue
  qp=q.replace('src/','')
  if not (qp.startswith('app/') or qp.startswith('pages/')): continue
  b=z.read(info); text=b.decode('utf-8','replace')
  web.append({'web_source_path':p,'web_route_candidate':web_route(p),'web_sha256':hashlib.sha256(b).hexdigest(),'web_line_count':text.count('\n')+(1 if text else 0),'web_action_signal_lines':','.join(str(i) for i,l in enumerate(text.splitlines(),1) if re.search(r'\b(onClick|router\.(push|replace)|href=|fetch\(|axios\.|api\.)',l)) or 'NONE'})
mobile=list(csv.DictReader(MOBILE.open(encoding='utf-8'),delimiter='\t'))
rows=[]
for m in mobile:
 exact=[w for w in web if norm(w['web_route_candidate'])==norm(m['mobile_route'])]
 if exact:
  w=exact[0]; status='EXACT_ROUTE_CANDIDATE__MANUAL_BEHAVIOR_REVIEW_REQUIRED'
  note='Exact normalized path match only; CTA/scenario/contract parity is not yet proven.'
 else:
  w={'web_source_path':'NONE','web_route_candidate':'NONE','web_sha256':'NONE','web_line_count':'NONE','web_action_signal_lines':'NONE'}; status='MANUAL_MAPPING_REQUIRED'; note='No exact path match found; do not infer a web equivalent from a name/keyword.'
 rows.append({'screen_id':m['screen_id'],'mobile_route':m['mobile_route'],'mobile_source_path':m['source_path'],'mobile_action_signal_lines':m['action_signal_lines'],**w,'mapping_status':status,'mapping_note':note,'visual_parity_status':'NOT_REVIEWED','cta_parity_status':'NOT_REVIEWED','scenario_parity_status':'NOT_REVIEWED','contract_parity_status':'NOT_REVIEWED','approved_exception_reason':'NONE','owner_agent':'AGENT_1_PATIENT_MOBILE_WEB'})
fields=list(rows[0])
with OUT.open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields,delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(rows)
print('MOBILE_ROWS='+str(len(rows)));print('WEB_ROUTE_CANDIDATES='+str(len(web)));print('EXACT_PATH_CANDIDATES='+str(sum(r['mapping_status'].startswith('EXACT') for r in rows)));print('MANUAL_MAPPING_REQUIRED='+str(sum(r['mapping_status']=='MANUAL_MAPPING_REQUIRED' for r in rows)))
