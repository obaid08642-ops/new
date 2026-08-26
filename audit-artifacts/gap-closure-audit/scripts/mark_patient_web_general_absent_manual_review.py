#!/usr/bin/env python3
from pathlib import Path
R=Path(__file__).resolve().parents[3];T=R/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv';E='audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md'
IDS=['PM-020','PM-031','PM-032','PM-061','PM-082','PM-144','PM-178','PM-179','PM-181','PM-182','PM-183','PM-184','PM-211','PM-212','PM-214','PM-215','PM-220','PM-221','PM-222','PM-223','PM-224','PM-237','PM-239','PM-240','PM-246']
lines=T.read_text().splitlines();h=lines[0].split('\t');c={x:i for i,x in enumerate(h)};out=[lines[0]];seen=set()
for raw in lines[1:]:
 f=raw.split('\t');id=f[c['screen_id']]
 if id in IDS:
  v={'web_source_path':'NONE__GENERAL_ROUTE_TREE_AND_SOURCE_SCAN','web_route_candidate':'NONE','web_sha256':'NONE','web_line_count':'0','web_action_signal_lines':'NONE','mapping_status':'MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY','mapping_note':'No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'MISSING_CAPABILITY','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE__NO_WEB_SURFACE','approved_exception_reason':'NONE'}
  for k,val in v.items():f[c[k]]=val
  seen.add(id)
 out.append('\t'.join(f))
if set(IDS)!=seen:raise SystemExit('missing '+str(set(IDS)-seen))
T.write_text('\n'.join(out)+'\n');print('updated='+','.join(sorted(seen)))
