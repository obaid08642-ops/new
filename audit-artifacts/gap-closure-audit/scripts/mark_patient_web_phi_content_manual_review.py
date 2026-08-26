#!/usr/bin/env python3
from __future__ import annotations
import hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
TSV=ROOT/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv'
WEB=ROOT/'audit-work/source/nabd-patient-web'
E='audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-08-26.md'
def mapped(path,route,lines,state,note,cta,scenario,contract):
 p=WEB/path
 return {'web_source_path':path,'web_route_candidate':route,'web_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'web_line_count':str(len(p.read_text().splitlines())),'web_action_signal_lines':lines,'mapping_status':f'MANUAL_MAPPING_COMPLETE__{state}','mapping_note':f'{note} Evidence: {E}','visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':cta,'scenario_parity_status':scenario,'contract_parity_status':contract,'approved_exception_reason':'NONE'}
U={
'PM-015':mapped('app/[locale]/health/page.tsx','/{locale}/health','35-50','STATIC_MATCHED_PARTIAL','Authenticated vital summary and navigation exist; provenance, edit/import/share and clinical escalation are not evidenced.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-028':mapped('app/[locale]/articles/[slug]/page.tsx','/{locale}/articles/{slug}','11','CONFIRMED_DEFECT','Article detail explicitly hides body and lacks a complete content/publication evidence chain.','CONFIRMED_DEFECT','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-030':mapped('app/[locale]/articles/page.tsx','/{locale}/articles','11','STATIC_MATCHED_PARTIAL','Public article search/category/detail handoff exists; content completeness and clinical governance are unproven.','STATIC_MATCHED_PARTIAL','STATIC_MATCHED_PARTIAL','INSUFFICIENT_EVIDENCE'),
'PM-041':mapped('app/[locale]/chat/[threadId]/page.tsx','/{locale}/chat/{threadId}','12','MISSING_CAPABILITY','Thread surface renders summary metadata and hides body; no compose/reply/upload/escalation CTA is evidenced.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-117':mapped('app/[locale]/health/reports/page.tsx','/{locale}/health/reports','10','MISSING_CAPABILITY','Protected report summary list has no detail/download/share/provenance or clinical workflow CTA.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-128':mapped('app/[locale]/insurance/page.tsx','/{locale}/insurance','19-38','CONFIRMED_DEFECT','Benefits are fetched but never parsed/rendered; no actionable coverage/co-pay path is evidenced.','CONFIRMED_DEFECT','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-129':mapped('app/[locale]/insurance/page.tsx','/{locale}/insurance','19-38','STATIC_MATCHED_PARTIAL','Claims are read-only summaries; no claim action/dispute/decision workflow exists.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-132':mapped('app/[locale]/insurance/page.tsx','/{locale}/insurance','19-38','MISSING_CAPABILITY','Insurance hub is read-only policy/claims summary without policy/benefit/co-pay/payer action flow.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-133':mapped('app/[locale]/insurance/page.tsx','/{locale}/insurance','19-38','MISSING_CAPABILITY','Insurance hub is read-only policy/claims summary without policy/benefit/co-pay/payer action flow.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-154':mapped('app/[locale]/mental-health/page.tsx','/{locale}/mental-health','11','MISSING_CAPABILITY','Wellbeing aggregates/history links exist but no active care, therapist, safety or crisis escalation workflow is evidenced.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-155':mapped('app/[locale]/mental-health/page.tsx','/{locale}/mental-health','11','MISSING_CAPABILITY','Wellbeing aggregates/history links exist but no active care, therapist, safety or crisis escalation workflow is evidenced.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-213':mapped('app/[locale]/health/reports/page.tsx','/{locale}/health/reports','10','MISSING_CAPABILITY','Protected report summary list has no report hub/detail/download/share/provenance workflow.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-216':mapped('app/[locale]/health/reports/page.tsx','/{locale}/health/reports','10','MISSING_CAPABILITY','Protected report summary list has no report body/download/share/provenance workflow.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-231':mapped('app/[locale]/notifications/settings/page.tsx','/{locale}/notifications/settings','12-31','MISSING_CAPABILITY','Notification settings render status labels only; no update/device/channel/delivery control is evidenced.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),
'PM-238':mapped('app/[locale]/chat/[threadId]/page.tsx','/{locale}/chat/{threadId}','12','MISSING_CAPABILITY','Thread surface renders summary metadata and hides body; no support-chat compose/escalation CTA is evidenced.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE')}
lines=TSV.read_text().splitlines(); h=lines[0].split('\t'); c={v:i for i,v in enumerate(h)}; out=[lines[0]]; seen=set()
for raw in lines[1:]:
 f=raw.split('\t'); u=U.get(f[c['screen_id']])
 if u:
  for k,v in u.items():f[c[k]]=v
  seen.add(f[c['screen_id']])
 out.append('\t'.join(f))
if set(U)!=seen:raise SystemExit('missing rows '+str(sorted(set(U)-seen)))
TSV.write_text('\n'.join(out)+'\n');print('updated='+','.join(sorted(seen)))
