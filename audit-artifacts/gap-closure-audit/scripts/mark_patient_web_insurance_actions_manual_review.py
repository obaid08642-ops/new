#!/usr/bin/env python3
from pathlib import Path
R=Path(__file__).resolve().parents[3];T=R/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv';E='audit-artifacts/gap-closure-audit/patient-web-manual-evidence/INSURANCE_ACTIONS_MANUAL_REVIEW_2026-08-26.md'
IDS=['PM-126','PM-127','PM-130','PM-131','PM-134','PM-135','PM-136','PM-137','PM-138']
lines=T.read_text().splitlines();h=lines[0].split('\t');c={x:i for i,x in enumerate(h)};out=[lines[0]];seen=set()
for raw in lines[1:]:
 f=raw.split('\t');id=f[c['screen_id']]
 if id in IDS:
  v={'web_source_path':'app/[locale]/insurance/page.tsx','web_route_candidate':'/{locale}/insurance','web_sha256':'NONE','web_line_count':'0','web_action_signal_lines':'19-38','mapping_status':'MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY','mapping_note':'Insurance page is summary-only; no corresponding action workflow/CTA found. Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'MISSING_CAPABILITY','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE','approved_exception_reason':'NONE'}
  for k,val in v.items():f[c[k]]=val
  seen.add(id)
 out.append('\t'.join(f))
if set(IDS)!=seen:raise SystemExit('missing '+str(set(IDS)-seen))
T.write_text('\n'.join(out)+'\n');print('updated='+','.join(sorted(seen)))
