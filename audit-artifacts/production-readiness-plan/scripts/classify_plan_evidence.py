from pathlib import Path
import csv,json,re
from collections import Counter,defaultdict
ROOT=Path('/tmp/nabd-main-audit'); OUT=ROOT/'audit-artifacts/production-readiness-plan'
# Parse root register only, preserving reviewer boundaries.
roots=[]
for line in (ROOT/'audit-artifacts/phase0b-backend/NABD_Normalized_Remediation_Backlog_2026-08-25.md').read_text(encoding='utf-8').splitlines():
 if not line.startswith('| RD-'): continue
 cells=[x.strip() for x in line.strip().strip('|').split('|')]
 if len(cells)>=12: roots.append({'root_id':cells[0],'severity':cells[1],'queue':cells[2],'workstream':cells[3],'category':cells[4],'owner':cells[5],'status':cells[6],'observations':cells[7],'journeys':cells[8],'source_paths':cells[9],'root_cause':cells[10],'decision':cells[11],'acceptance':cells[12] if len(cells)>12 else ''})
# Phase 0D findings: only declared UNIQUE_DEFECT may enter reconfirmation queue; other relations not defects.
static=list(csv.DictReader((ROOT/'audit-artifacts/phase0d/PHASE0D_Cross_Surface_Findings.tsv').open(encoding='utf-8'),delimiter='\t'))
active=list(csv.DictReader((ROOT/'audit-artifacts/phase0d/PHASE0D1_EVIDENCE_FIRST_JOURNEY_ROWS.tsv').open(encoding='utf-8'),delimiter='\t'))
rejected=list(csv.DictReader((ROOT/'audit-artifacts/phase0d/PHASE0D_JOURNEY_CONTRACT_RECONCILIATION_REJECTED_MECHANICAL_ANCHOR.tsv').open(encoding='utf-8'),delimiter='\t'))
rows=[]
for r in roots:
 rows.append({'planning_id':r['root_id'],'evidence_class':'NORMALIZED_CONFIRMED_ROOT_CONTROL','allowed_for_build':'NO_UNTIL_DECISION_AND_CONTRACT','workstream':r['workstream'],'severity':r['severity'],'owner':r['owner'],'status':r['status'],'source':r['source_paths'],'summary':r['root_cause'],'required_gate':r['acceptance']})
for r in static:
 if r['relation']=='UNIQUE_DEFECT':
  rows.append({'planning_id':r['id'],'evidence_class':'STATIC_DEFECT_RECONFIRM_REQUIRED','allowed_for_build':'NO_UNTIL_INDEPENDENT_RECONFIRMATION','workstream':r['journey'],'severity':r['severity'],'owner':r['surface'],'status':r['relation'],'source':f"{r['source_path']}:{r['line']}",'summary':r['finding'],'required_gate':r['accepted_test']})
for r in active:
 rows.append({'planning_id':r['row_id'],'evidence_class':'CATALOG_ONLY__INSUFFICIENT_EVIDENCE','allowed_for_build':'NO','workstream':r['journey'],'severity':'N/A','owner':r['surface'],'status':r['evidence_classification'],'source':f"{r['exact_screen_or_route']}:{r['frontend_line']}",'summary':'Evidence-first catalog row; not a defect or reconciliation closure.','required_gate':'Independent contract chain review required.'})
for hist_no,r in enumerate(rejected,1):
 rows.append({'planning_id':f'HIST-MECH-{hist_no:03d}','evidence_class':'REJECTED_MECHANICAL_ANCHOR','allowed_for_build':'NO','workstream':r['journey'],'severity':'N/A','owner':r['surface'],'status':'REJECTED_MECHANICAL_ANCHOR','source':f"{r['frontend_source_path']}:{r['frontend_line']}",'summary':'Historical mechanical row; excluded from backlog.','required_gate':'Do not use for planning.'})
fields=list(rows[0]);
with (OUT/'PRODUCTION_PLAN_EVIDENCE_CLASSIFICATION_2026-08-25.tsv').open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields,delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(rows)
summary={'normalized_confirmed_roots':len(roots),'root_by_workstream':dict(Counter(r['workstream'] for r in roots)),'root_by_queue':dict(Counter(r['queue'] for r in roots)),'static_defect_reconfirm_required':sum(r['relation']=='UNIQUE_DEFECT' for r in static),'static_runtime_or_insufficient_excluded':sum(r['relation']!='UNIQUE_DEFECT' for r in static),'catalog_only_excluded':len(active),'mechanical_historical_excluded':len(rejected),'planning_rows':len(rows)}
(OUT/'PRODUCTION_PLAN_EVIDENCE_CLASSIFICATION_SUMMARY_2026-08-25.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
