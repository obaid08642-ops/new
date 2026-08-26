#!/usr/bin/env python3
from pathlib import Path
import hashlib
R=Path(__file__).resolve().parents[3];T=R/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv';W=R/'audit-work/source/nabd-patient-web';E='audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md'
IDS=['PM-185','PM-188','PM-190','PM-191','PM-192','PM-193','PM-194','PM-199','PM-202','PM-204','PM-206']
lines=T.read_text().splitlines();h=lines[0].split('\t');c={x:i for i,x in enumerate(h)};out=[lines[0]];seen=set();wp=W/'app/[locale]/wishlist/page.tsx'
for raw in lines[1:]:
 f=raw.split('\t');id=f[c['screen_id']]
 if id in IDS:
  if id=='PM-206':
   v={'web_source_path':'app/[locale]/wishlist/page.tsx','web_route_candidate':'/{locale}/wishlist','web_sha256':hashlib.sha256(wp.read_bytes()).hexdigest(),'web_line_count':str(len(wp.read_text().splitlines())),'web_action_signal_lines':'14-29','mapping_status':'MANUAL_MAPPING_COMPLETE__STATIC_MATCHED_PARTIAL','mapping_note':'Protected wishlist reads item facts and links to medicine detail; no wishlist mutation or purchase/stock workflow. Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'STATIC_MATCHED_PARTIAL','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE','approved_exception_reason':'NONE'}
  else:
   v={'web_source_path':'NONE__PHARMACY_AUXILIARY_ROUTE_TREE_AND_CTA_SCAN','web_route_candidate':'NONE','web_sha256':'NONE','web_line_count':'0','web_action_signal_lines':'NONE','mapping_status':'MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY','mapping_note':'No corresponding localized Web pharmacy auxiliary surface/CTA found. Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'MISSING_CAPABILITY','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE__NO_WEB_SURFACE','approved_exception_reason':'NONE'}
  for k,val in v.items():f[c[k]]=val
  seen.add(id)
 out.append('\t'.join(f))
if set(IDS)!=seen:raise SystemExit('missing '+str(set(IDS)-seen))
T.write_text('\n'.join(out)+'\n');print('updated='+','.join(sorted(seen)))
