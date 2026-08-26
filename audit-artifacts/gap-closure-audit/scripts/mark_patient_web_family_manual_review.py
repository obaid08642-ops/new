#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
R=Path(__file__).resolve().parents[3]
T=R/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv'
E='audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md'
U={
'PM-088':'No family-chat route or CTA found; family list is summary-only.',
'PM-094':'Family cards are non-linked summaries; no delegated health-detail surface found.',
'PM-100':'No add/invite-member form or mutation exists in reviewed family source.',
'PM-106':'No family calendar or care-coordination action surface found.',
'PM-107':'No family-chat route or CTA found; family list is summary-only.',
'PM-108':'Family surface is membership summary only, not a family hub workflow.',
'PM-109':'Family cards are non-linked summaries; no member-detail/delegated-health surface found.'}
lines=T.read_text().splitlines();h=lines[0].split('\t');c={x:i for i,x in enumerate(h)};out=[lines[0]];seen=set()
for raw in lines[1:]:
 f=raw.split('\t');id=f[c['screen_id']]
 if id in U:
  values={'web_source_path':'NONE__FAMILY_SOURCE_TREE_AND_CTA_SCAN','web_route_candidate':'NONE','web_sha256':'NONE','web_line_count':'0','web_action_signal_lines':'NONE','mapping_status':'MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY','mapping_note':U[id]+' Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':'MISSING_CAPABILITY','scenario_parity_status':'MISSING_CAPABILITY','contract_parity_status':'INSUFFICIENT_EVIDENCE__NO_WEB_SURFACE','approved_exception_reason':'NONE'}
  if id in {'PM-108'}:
   values['web_source_path']='app/[locale]/family/page.tsx';values['web_route_candidate']='/{locale}/family';values['web_action_signal_lines']='15-44';values['contract_parity_status']='INSUFFICIENT_EVIDENCE'
  for k,v in values.items():f[c[k]]=v
  seen.add(id)
 out.append('\t'.join(f))
if set(U)!=seen:raise SystemExit('missing '+str(set(U)-seen))
T.write_text('\n'.join(out)+'\n');print('updated='+','.join(sorted(seen)))
