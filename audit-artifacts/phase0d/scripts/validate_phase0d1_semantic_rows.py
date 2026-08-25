from __future__ import annotations
import csv,json,re,zipfile
from pathlib import Path
ROOT=Path('/tmp/nabd-main-audit'); BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'
ARCH={'patient-mobile':'nabd_plus_patient_app.zip','patient-web':'nabd-patient-web.zip','provider':'NabdProvider-provider.zip','admin':'web_admin_dashboard.zip','backend':'nabdah-backend.zip'}
ALLOWED={'CONFIRMED_DEFECT','STATIC_MATCHED_PARTIAL','RUNTIME_REQUIRED','INSUFFICIENT_EVIDENCE','MISSING_CAPABILITY'}
GENERIC={'Trace required','MISSING_CAPABILITY — exact','Explicit next state must be validated','Must be server-authoritative; exact source not inferred'}
def load(a):
 with zipfile.ZipFile(BASE/a) as z:
  out={}
  for i in z.infolist():
   if i.is_dir(): continue
   try: out[i.filename]=len(z.read(i).decode('utf-8').splitlines())
   except UnicodeDecodeError: pass
 return out
def path_line(value):
 m=re.match(r'^(.*?):(\d+)',value or '')
 return (m.group(1),int(m.group(2))) if m else (None,None)
def main():
 p=ROOT/'audit-artifacts/phase0d/PHASE0D1_EVIDENCE_FIRST_JOURNEY_ROWS.tsv'; rows=list(csv.DictReader(p.open(encoding='utf-8'),delimiter='\t')); sizes={k:load(v) for k,v in ARCH.items()}; fails=[]
 if len(rows)<=40: fails.append('active rows are not multiple-step rows')
 seen=set(); fields=rows[0].keys()
 for idx,r in enumerate(rows,2):
  key=(r['journey'],r['surface'],r['step'])
  if key in seen: fails.append(f'row {idx}: duplicate journey/surface/step')
  seen.add(key)
  if r['evidence_classification'] not in ALLOWED: fails.append(f'row {idx}: invalid classification')
  if r['exact_screen_or_route']=='MISSING_CAPABILITY': fails.append(f'row {idx}: no exact frontend screen path')
  else:
   if r['exact_screen_or_route'] not in sizes[r['surface']]: fails.append(f'row {idx}: frontend member absent')
   if r['frontend_line']!='N/A' and (not r['frontend_line'].isdigit() or int(r['frontend_line'])<1 or int(r['frontend_line'])>sizes[r['surface']][r['exact_screen_or_route']]): fails.append(f'row {idx}: frontend line invalid')
  for col in ('backend_controller_path_line','backend_service_path_line','backend_dto_schema_state_path_line'):
   path,line=path_line(r[col])
   if path and path in sizes['backend'] and (line<1 or line>sizes['backend'][path]): fails.append(f'row {idx}: {col} line invalid')
   if path and path not in sizes['backend'] and 'Path not present' not in r['evidence_note']: fails.append(f'row {idx}: absent backend path not evidenced')
  note=r['evidence_note']
  if not note or r['exact_screen_or_route'] not in note or ':' not in note: fails.append(f'row {idx}: evidence note lacks exact frontend path/line')
  for col in ('navigation_next_state','request_method_path_or_socket','request_payload_fields','ownership_role_enforcement_path_line','authoritative_price_stock_provider_insurance_path_line','provider_admin_action_path_line','notification_result_report_path_line','happy_state','unauth_state','wrong_role_state','owner_stranger_state','validation_state','error_state','loading_state','empty_state','retry_state','cancel_refund_state'):
   val=r[col]
   if not val or val in GENERIC or val=='Trace required': fails.append(f'row {idx}: generic/empty {col}')
   if 'MISSING_CAPABILITY' in val and r['exact_screen_or_route'] not in val and r['exact_screen_or_route'] not in note: fails.append(f'row {idx}: missing field lacks row evidence {col}')
  if r['journey'] not in ('Pharmacy','Consultation','Labs','Radiology','Nursing/Home-care','Wallet/Insurance/Payment') and 'Cash follows service' in r['payment_intent_webhook_ledger_cod_copay_path_line']: fails.append(f'row {idx}: payment rule assigned to unrelated journey')
  if r['request_method_path_or_socket']!='MISSING_CAPABILITY' and r['backend_controller_path_line'].startswith('MISSING_CAPABILITY'): fails.append(f'row {idx}: endpoint without backend mismatch classification')
 result={'rows':len(rows),'unique_keys':len(seen),'failure_count':len(fails),'failures':fails[:200]}
 (ROOT/'audit-artifacts/phase0d/PHASE0D1_SEMANTIC_VALIDATION.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,ensure_ascii=False,indent=2)); raise SystemExit(1 if fails else 0)
if __name__=='__main__': main()
