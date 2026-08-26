#!/usr/bin/env python3
from pathlib import Path
import hashlib
R=Path(__file__).resolve().parents[3];T=R/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv';W=R/'audit-work/source/nabd-patient-web';E='audit-artifacts/gap-closure-audit/patient-web-manual-evidence/MENTAL_HEALTH_INTERVENTION_MANUAL_REVIEW_2026-08-26.md'
def partial(path,route,lines,note):
 p=W/path
 return {'web_source_path':path,'web_route_candidate':route,'web_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'web_line_count':str(len(p.read_text().splitlines())),'web_action_signal_lines':lines,'mapping_status':'MANUAL_MAPPING_COMPLETE__STATIC_MATCHED_PARTIAL','mapping_note':note+' Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'STATIC_MATCHED_PARTIAL','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE','approved_exception_reason':'NONE'}
def missing(note):return {'web_source_path':'NONE__MENTAL_HEALTH_ROUTE_TREE_AND_CTA_SCAN','web_route_candidate':'NONE','web_sha256':'NONE','web_line_count':'0','web_action_signal_lines':'NONE','mapping_status':'MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY','mapping_note':note+' Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'MISSING_CAPABILITY','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE__NO_WEB_SURFACE','approved_exception_reason':'NONE'}
U={'PM-152':partial('app/[locale]/mental-health/breathing/page.tsx','/{locale}/mental-health/breathing','12','Protected breathing history exists, but no start/live guidance/entry/escalation CTA.'),'PM-156':partial('app/[locale]/mental-health/meditation/page.tsx','/{locale}/mental-health/meditation','12','Protected meditation history exists, but no start/program/feedback/intervention CTA.'),'PM-153':missing('Crisis-contact cards do not provide call/SOS/geolocation/handoff/confirmation safety workflow.'),'PM-157':missing('No mood-journal entry or clinical escalation surface found.'),'PM-158':missing('No self-assessment/scoring consent or clinical referral surface found.'),'PM-159':missing('No therapist-match/provider/booking surface found.')}
lines=T.read_text().splitlines();h=lines[0].split('\t');c={x:i for i,x in enumerate(h)};out=[lines[0]];seen=set()
for raw in lines[1:]:
 f=raw.split('\t');id=f[c['screen_id']]
 if id in U:
  for k,v in U[id].items():f[c[k]]=v
  seen.add(id)
 out.append('\t'.join(f))
if set(U)!=seen:raise SystemExit('missing '+str(set(U)-seen))
T.write_text('\n'.join(out)+'\n');print('updated='+','.join(sorted(seen)))
