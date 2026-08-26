#!/usr/bin/env python3
from pathlib import Path
R=Path(__file__).resolve().parents[3];T=R/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv';E='audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md'
IDS=[f'PM-{i:03d}' for i in list(range(145,152))+list(range(165,178))]
lines=T.read_text().splitlines();h=lines[0].split('\t');c={x:i for i,x in enumerate(h)};out=[lines[0]];seen=set()
for raw in lines[1:]:
 f=raw.split('\t');id=f[c['screen_id']]
 if id in IDS:
  note=('No localized Web nutrition route/source/CTA found.' if 165<=int(id.split('-')[1])<=177 else 'No localized Web maternity route/source/CTA found.')
  values={'web_source_path':'NONE__ROUTE_TREE_AND_SOURCE_SCAN','web_route_candidate':'NONE','web_sha256':'NONE','web_line_count':'0','web_action_signal_lines':'NONE','mapping_status':'MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY','mapping_note':note+' Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'MISSING_CAPABILITY','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE__NO_WEB_SURFACE','approved_exception_reason':'NONE'}
  for k,v in values.items():f[c[k]]=v
  seen.add(id)
 out.append('\t'.join(f))
if set(IDS)!=seen:raise SystemExit('missing '+str(set(IDS)-seen))
T.write_text('\n'.join(out)+'\n');print('updated='+','.join(sorted(seen)))
