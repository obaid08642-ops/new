#!/usr/bin/env python3
from pathlib import Path
import hashlib
R=Path(__file__).resolve().parents[3];T=R/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv';W=R/'audit-work/source/nabd-patient-web';E='audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md'
def missing(note):return {'web_source_path':'NONE__CONSULTATION_ROUTE_TREE_AND_CTA_SCAN','web_route_candidate':'NONE','web_sha256':'NONE','web_line_count':'0','web_action_signal_lines':'NONE','mapping_status':'MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY','mapping_note':note+' Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'MISSING_CAPABILITY','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE__NO_WEB_SURFACE','approved_exception_reason':'NONE'}
p=W/'app/[locale]/consultations/doctors/page.tsx'
U={'PM-046':{'web_source_path':'app/[locale]/consultations/doctors/page.tsx','web_route_candidate':'/{locale}/consultations/doctors','web_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'web_line_count':str(len(p.read_text().splitlines())),'web_action_signal_lines':'10-18','mapping_status':'MANUAL_MAPPING_COMPLETE__STATIC_MATCHED_PARTIAL','mapping_note':'Public doctor search/sort/detail handoff exists; price/availability/insurance authority and full booking lifecycle remain unproven. Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'STATIC_MATCHED_PARTIAL','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE','approved_exception_reason':'NONE'}}
for id,note in {'PM-039':'No call-history Web surface found.','PM-042':'No clinic-confirmation Web surface found.','PM-043':'No clinic-location Web surface found.','PM-044':'No clinic-detail Web surface found.','PM-048':'No consultation follow-up Web surface found.','PM-049':'No home-visit tracking Web surface found.','PM-050':'No incoming-call Web surface found.','PM-051':'No consultation-offer Web surface found.','PM-052':'No post-call rating Web surface found.','PM-053':'No consultation prescription Web surface found.','PM-054':'No consultation report-share Web surface found.','PM-056':'No consultation summary Web surface found.','PM-058':'No video-room Web surface found; token readiness alone is not room join.','PM-059':'No virtual-waiting-room Web surface found.','PM-060':'No waiting-room Web surface found.'}.items():U[id]=missing(note)
lines=T.read_text().splitlines();h=lines[0].split('\t');c={x:i for i,x in enumerate(h)};out=[lines[0]];seen=set()
for raw in lines[1:]:
 f=raw.split('\t');id=f[c['screen_id']]
 if id in U:
  for k,v in U[id].items():f[c[k]]=v
  seen.add(id)
 out.append('\t'.join(f))
if set(U)!=seen:raise SystemExit('missing '+str(set(U)-seen))
T.write_text('\n'.join(out)+'\n');print('updated='+','.join(sorted(seen)))
