#!/usr/bin/env python3
from __future__ import annotations
import hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[3]; T=R/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv'; W=R/'audit-work/source/nabd-patient-web'; E='audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PROFILE_ADDRESSES_MANUAL_REVIEW_2026-08-26.md'
def m(path,route,lines,state,note,cta,scenario,contract):
 p=W/path
 return {'web_source_path':path,'web_route_candidate':route,'web_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'web_line_count':str(len(p.read_text().splitlines())),'web_action_signal_lines':lines,'mapping_status':'MANUAL_MAPPING_COMPLETE__'+state,'mapping_note':note+' Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':cta,'scenario_parity_status':scenario,'contract_parity_status':contract,'approved_exception_reason':'NONE'}
def no(note): return {'web_source_path':'NONE__SOURCE_TREE_AND_PROFILE_SCAN','web_route_candidate':'NONE','web_sha256':'NONE','web_line_count':'0','web_action_signal_lines':'NONE','mapping_status':'MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY','mapping_note':note+' Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'MISSING_CAPABILITY','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE__NO_WEB_SURFACE','approved_exception_reason':'NONE'}
U={'PM-207':no('No localized addresses surface, address CTA, or address mutation was found in reviewed source.'),'PM-208':m('app/[locale]/profile/page.tsx','/{locale}/profile','27-58','MISSING_CAPABILITY','Profile is display-only; no profile or medical-profile edit CTA/mutation is evidenced.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),'PM-209':m('app/[locale]/profile/page.tsx','/{locale}/profile','27-58','STATIC_MATCHED_PARTIAL','Protected profile/medical/insurance display exists; field-level ownership/freshness and management controls remain unproven.','STATIC_MATCHED_PARTIAL','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE'),'PM-210':m('app/[locale]/profile/page.tsx','/{locale}/profile','27-39','MISSING_CAPABILITY','Profile shows selected insurance fields only; no policy/benefits/coverage/co-pay management path is evidenced.','MISSING_CAPABILITY','MISSING_CAPABILITY','INSUFFICIENT_EVIDENCE')}
lines=T.read_text().splitlines(); h=lines[0].split('\t'); c={x:i for i,x in enumerate(h)}; out=[lines[0]]; seen=set()
for raw in lines[1:]:
 f=raw.split('\t');u=U.get(f[c['screen_id']])
 if u:
  for k,v in u.items():f[c[k]]=v
  seen.add(f[c['screen_id']])
 out.append('\t'.join(f))
if set(U)!=seen:raise SystemExit('missing '+str(set(U)-seen))
T.write_text('\n'.join(out)+'\n');print('updated='+','.join(sorted(seen)))
