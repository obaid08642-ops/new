#!/usr/bin/env python3
from __future__ import annotations
import hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[3]
T=R/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv'
W=R/'audit-work/source/nabd-patient-web'
E='audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md'
def m(path,route,lines,state,note,cta,scenario,contract):
 p=W/path
 return {'web_source_path':path,'web_route_candidate':route,'web_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'web_line_count':str(len(p.read_text().splitlines())),'web_action_signal_lines':lines,'mapping_status':'MANUAL_MAPPING_COMPLETE__'+state,'mapping_note':note+' Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':cta,'scenario_parity_status':scenario,'contract_parity_status':contract,'approved_exception_reason':'NONE'}
def no(note): return {'web_source_path':'NONE__HEALTH_SOURCE_TREE_AND_CTA_SCAN','web_route_candidate':'NONE','web_sha256':'NONE','web_line_count':'0','web_action_signal_lines':'NONE','mapping_status':'MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY','mapping_note':note+' Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'MISSING_CAPABILITY','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE__NO_WEB_SURFACE','approved_exception_reason':'NONE'}
U={
'PM-101':m('app/[locale]/health/chronic-diseases/page.tsx','/{locale}/health/chronic-diseases','12','STATIC_MATCHED_PARTIAL','Protected condition read exists but no add/edit/remove or clinical-review CTA is evidenced.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-102':m('app/[locale]/health/chronic-medications/page.tsx','/{locale}/health/chronic-medications','12','STATIC_MATCHED_PARTIAL','Protected chronic-medication/refill facts exist but no adherence/refill/update/prescribing CTA is evidenced.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-105':m('app/[locale]/health/emergency-contacts/page.tsx','/{locale}/health/emergency-contacts','12','STATIC_MATCHED_PARTIAL','Masked emergency contacts are read-only; no add/edit/delete/call/escalation CTA is evidenced.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-111':no('No reminder-creation form or mutation surface was located; reminders page is summary/list only.'),
'PM-112':m('app/[locale]/reminders/page.tsx','/{locale}/reminders','13-28','STATIC_MATCHED_PARTIAL','Protected reminder/today-dose summary exists but no mark-taken/snooze/edit/delete CTA is evidenced.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-115':m('app/[locale]/health/chronic-medications/page.tsx','/{locale}/health/chronic-medications','12','MISSING_CAPABILITY','Optional refill date is display-only; no refill eligibility/request/pharmacy/payment workflow is evidenced.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-116':m('app/[locale]/reminders/page.tsx','/{locale}/reminders','13-28','STATIC_MATCHED_PARTIAL','Protected reminder/today-dose summary exists but no mark-taken/snooze/edit/delete CTA is evidenced.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-118':m('app/[locale]/health/sleep/page.tsx','/{locale}/health/sleep','12','STATIC_MATCHED_PARTIAL','Protected sleep score/history display exists but no logging/correction/device-sync/intervention CTA is evidenced.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-119':m('app/[locale]/health/sleep/page.tsx','/{locale}/health/sleep','12','STATIC_MATCHED_PARTIAL','Protected sleep history exists but no tracking input, device sync, correction or intervention CTA is evidenced.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-121':m('app/[locale]/health/trends/page.tsx','/{locale}/health/trends','13','STATIC_MATCHED_PARTIAL','Protected trend display exists but no methodology, interpretation, anomaly escalation or corrective-action CTA is evidenced.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-122':m('app/[locale]/health/vitals/page.tsx','/{locale}/health/vitals','12','MISSING_CAPABILITY','Vitals history is explicitly read-only; no manual log/add/edit/delete/import or alert threshold flow is evidenced.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-123':m('app/[locale]/health/vitals/page.tsx','/{locale}/health/vitals','12','STATIC_MATCHED_PARTIAL','Protected vital-history display exists; provenance, ownership and clinical-action paths are not evidenced.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-124':no('No wearable/device connection surface was located in the Web health route tree.'),}
lines=T.read_text().splitlines();h=lines[0].split('\t');c={x:i for i,x in enumerate(h)};out=[lines[0]];seen=set()
for raw in lines[1:]:
 f=raw.split('\t');u=U.get(f[c['screen_id']])
 if u:
  for k,v in u.items():f[c[k]]=v
  seen.add(f[c['screen_id']])
 out.append('\t'.join(f))
if set(U)!=seen:raise SystemExit('missing '+str(set(U)-seen))
T.write_text('\n'.join(out)+'\n');print('updated='+','.join(sorted(seen)))
