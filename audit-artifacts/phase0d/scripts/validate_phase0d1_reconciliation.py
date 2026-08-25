from __future__ import annotations
import csv, json, re, zipfile
from pathlib import Path
ROOT=Path('/tmp/nabd-main-audit'); BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'
FRONT={'patient-mobile':'nabd_plus_patient_app.zip','patient-web':'nabd-patient-web.zip','provider':'NabdProvider-provider.zip','admin':'web_admin_dashboard.zip'}; BACK='nabdah-backend.zip'
REQ={'surface','journey','journey_definition','screen_or_route','cta_action','actor','frontend_source_path','frontend_line','request_method_path_or_socket','request_payload_fields','backend_source_path','backend_line','backend_controller_service_dto_schema_state','ownership_role_checks','price_stock_provider_insurance_source','payment_trigger_and_state','provider_admin_step','result_report_notification','happy_state','unauth_state','wrong_role_state','owner_stranger_state','validation_state','error_state','loading_state','empty_state','retry_state','cancel_refund_state','evidence_classification','evidence_note'}
ALLOWED={'STATIC_MATCHED','STATIC_MISMATCH','RUNTIME_REQUIRED','INSUFFICIENT_EVIDENCE','MISSING_CAPABILITY'}
def text_sizes(zip_path):
  with zipfile.ZipFile(zip_path) as z:
    out={}
    for i in z.infolist():
      if i.is_dir(): continue
      try: out[i.filename]=len(z.read(i).decode('utf-8').splitlines())
      except UnicodeDecodeError: pass
    return out
def main():
  front={s:text_sizes(BASE/a) for s,a in FRONT.items()}; back=text_sizes(BASE/BACK); p=ROOT/'audit-artifacts/phase0d/PHASE0D_JOURNEY_CONTRACT_RECONCILIATION.tsv'; rows=list(csv.DictReader(p.open(encoding='utf-8'),delimiter='\t')); fails=[]
  if set(rows[0])!=REQ: fails.append('header mismatch')
  for idx,r in enumerate(rows,2):
    if r['evidence_classification'] not in ALLOWED: fails.append(f'row {idx}: bad classification')
    if r['surface'] not in front: fails.append(f'row {idx}: bad surface')
    if r['frontend_source_path']!='MISSING_CAPABILITY':
      if r['frontend_source_path'] not in front[r['surface']]: fails.append(f'row {idx}: missing frontend path')
      elif r['frontend_line']!='N/A' and (not r['frontend_line'].isdigit() or int(r['frontend_line'])<1 or int(r['frontend_line'])>front[r['surface']][r['frontend_source_path']]): fails.append(f'row {idx}: frontend line out of range')
    if r['backend_source_path']!='MISSING_CAPABILITY':
      if r['backend_source_path'] not in back: fails.append(f'row {idx}: missing backend path {r["backend_source_path"]}')
      elif r['backend_line']!='N/A' and (not r['backend_line'].isdigit() or int(r['backend_line'])<1 or int(r['backend_line'])>back[r['backend_source_path']]): fails.append(f'row {idx}: backend line out of range')
    for f in REQ:
      if not r.get(f,''): fails.append(f'row {idx}: empty required field {f}')
  result={'rows':len(rows),'expected_rows':40,'failure_count':len(fails),'failures':fails[:100]}
  (ROOT/'audit-artifacts/phase0d/PHASE0D_JOURNEY_CONTRACT_RECONCILIATION_VALIDATION.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,ensure_ascii=False,indent=2)); raise SystemExit(1 if fails or len(rows)!=40 else 0)
if __name__=='__main__': main()
