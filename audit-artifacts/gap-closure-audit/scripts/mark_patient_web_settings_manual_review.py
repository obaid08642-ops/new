#!/usr/bin/env python3
from pathlib import Path
R=Path(__file__).resolve().parents[3];T=R/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv';E='audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md'
def row(state,note,path='NONE__SETTINGS_ROUTE_TREE_AND_MUTATION_SCAN',route='NONE',lines='NONE'):
 return {'web_source_path':path,'web_route_candidate':route,'web_sha256':'NONE','web_line_count':'0','web_action_signal_lines':lines,'mapping_status':'MANUAL_MAPPING_COMPLETE__'+state,'mapping_note':note+' Evidence: '+E,'visual_parity_status':'NOT_REVIEWED__SOURCE_ONLY','cta_parity_status':state,'scenario_parity_status':'MISSING_CAPABILITY' if state!='STATIC_MATCHED_PARTIAL' else 'STATIC_MATCHED_PARTIAL','contract_parity_status':'INSUFFICIENT_EVIDENCE','approved_exception_reason':'NONE'}
U={'PM-225':row('MISSING_CAPABILITY','No localized about settings route/CTA found.'),'PM-226':row('MISSING_CAPABILITY','Storage summary is read-only; no export/delete/retention control exists.','app/[locale]/settings/page.tsx','/{locale}/settings','18-43'),'PM-227':row('MISSING_CAPABILITY','No feedback route/form/mutation found.'),'PM-228':row('MISSING_CAPABILITY','No help route/CTA found.'),'PM-229':row('STATIC_MATCHED_PARTIAL','Protected settings summary exists but has no management controls.','app/[locale]/settings/page.tsx','/{locale}/settings','12-44'),'PM-230':row('MISSING_CAPABILITY','No language settings route/control found.'),'PM-232':row('MISSING_CAPABILITY','Notification surfaces are summaries; no update/device/delivery control is evidenced.','app/[locale]/notifications/settings/page.tsx','/{locale}/notifications/settings','12-31'),'PM-233':row('MISSING_CAPABILITY','Privacy booleans are read-only; no update/revocation/consent control exists.','app/[locale]/settings/page.tsx','/{locale}/settings','18-43'),'PM-234':row('MISSING_CAPABILITY','Security/session summaries are read-only; no 2FA/session revoke/device recovery control exists.','app/[locale]/settings/page.tsx','/{locale}/settings','18-43'),'PM-235':row('MISSING_CAPABILITY','No support-chat settings route/CTA found.'),'PM-236':row('MISSING_CAPABILITY','No terms settings route/CTA found.')}
lines=T.read_text().splitlines();h=lines[0].split('\t');c={x:i for i,x in enumerate(h)};out=[lines[0]];seen=set()
for raw in lines[1:]:
 f=raw.split('\t');id=f[c['screen_id']]
 if id in U:
  for k,v in U[id].items():f[c[k]]=v
  seen.add(id)
 out.append('\t'.join(f))
if set(U)!=seen:raise SystemExit('missing '+str(set(U)-seen))
T.write_text('\n'.join(out)+'\n');print('updated='+','.join(sorted(seen)))
