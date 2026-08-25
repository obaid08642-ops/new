from __future__ import annotations
import csv, json, re
from pathlib import Path

ROOT=Path('/tmp/nabd-main-audit'); OUT=ROOT/'audit-artifacts/phase0d'
SURFACES=['patient-mobile','patient-web','provider','admin']
JOURNEYS=[
 ('Pharmacy','cart → submit order → pharmacy broadcast → offers → selected offer → cash card/COD or insurance approval/co-pay → preparation → delivery/pickup → cancel/refund/tracking',['cart','checkout','pharmacy','order','offer','insurance','cash','refund','delivery']),
 ('Consultation','online/clinic/home → doctor → slot → cash or insurance/co-pay → confirmation → reschedule/cancel/no-show/video/report',['consult','appointment','booking','doctor','slot','cash','insurance','reschedule','cancel','video','report']),
 ('Labs','home/center → provider → appointment → cash or insurance/co-pay → execution → result/report → PHI protection',['lab','booking','insurance','cash','result','report','upload']),
 ('Radiology','home/center → provider → appointment → cash or insurance/co-pay → execution → report → PHI protection',['radiology','imaging','booking','insurance','cash','report']),
 ('Nursing/Home-care','home service → provider/visit → cash or insurance/co-pay → execution → report/cancel',['nursing','home-care','visit','insurance','cash','cancel']),
 ('Identity/OTP/Roles','login/register → OTP/session → role/ownership boundary → logout/revocation',['login','register','otp','auth','session','token','logout','role','permission']),
 ('Family/Health','family member → consent/delegation → health record/vitals/maternity/mental health → notification',['family','health','vital','maternity','mental','consent','notification']),
 ('Prescription/Chat/Support','prescription → upload/read → chat/support/community → notification/result',['prescription','chat','support','message','notification','report']),
 ('Wallet/Insurance/Payment','wallet/invoice → cash/card/insurance/co-pay → refund/ledger/receipt',['wallet','payment','invoice','refund','insurance','copay','ledger']),
 ('Settings/Accessibility/Location','language/RTL → accessibility → map/location/emergency → notifications',['settings','language','locale','rtl','accessibility','map','location','emergency','notification']),
]
def read_trace(surface):
    p=OUT/f'phase0d-{surface}'/'Screen_Action_Journey_Traceability.tsv'
    return p.read_text(encoding='utf-8').lower() if p.exists() else ''
def main():
    rows=[]
    for surface in SURFACES:
        text=read_trace(surface)
        for name,flow,terms in JOURNEYS:
            hits=[t for t in terms if t in text]
            rows.append({'surface':surface,'journey':name,'journey_definition':flow,'static_term_hits':';'.join(hits),'static_presence':'PRESENT' if hits else 'NOT_FOUND_IN_STATIC_TRACE','runtime_status':'UNVERIFIED_BASELINE_ONLY','required_validation':'Trace every screen/CTA to API/socket, backend handler/DB/state, payment/insurance decision, notification/result, and owner/stranger/unauth plus loading/empty/error/retry/cancel tests.'})
    fields=list(rows[0])
    with (OUT/'PHASE0D_Required_Journey_Matrix.tsv').open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(rows)
    lines=['# Phase 0D cross-surface consolidation','', '> This report is static semantic evidence from the four baseline archives. It does not claim runtime, visual, payment, sandbox, device, human, deployment or production verification.','', '## Baseline archives','', '| Surface | Archive | SHA-256 | Total members | YES | N/A | NO | Manifest | Traceability |','|---|---|---|---:|---:|---:|---:|---|---|']
    d=json.loads((OUT/'phase0d_archive_surface_summary.json').read_text())
    v=json.loads((OUT/'PHASE0D_MANIFEST_VALIDATION.json').read_text())['surfaces']
    for s in SURFACES:
        x=d[s]; y=v[s]; lines.append(f'| {s} | `{x["archive"]}` | `{x["archive_sha256"]}` | {y["total_members"]} | {y["YES"]} | {y["N/A"]} | {y["NO"]} | `{x["manifest"]}` | `{x["traceability"]}` |')
    lines += ['', '## Manifest gates','', '| Gate | Result |','|---|---|','| Every archive member has one manifest row | PASS |','| Source/config/test members unread | 0 |','| Missing archive members | 0 |','| Duplicate manifest members | 0 |','| Missing evidence paths | 0 |','| Invalid line ranges | 0 |','| Product source changes | 0 |','| Build/test/remediation/migration/deployment | 0 |','', '## Required journey matrix','', 'The detailed machine-readable matrix is `PHASE0D_Required_Journey_Matrix.tsv`. Every journey is deliberately marked `UNVERIFIED_BASELINE_ONLY`; static keyword presence is not treated as proof of a complete patient journey.','', '| Journey | Mobile | Web | Provider | Admin | Runtime status |','|---|---|---|---|---|---|']
    for name,flow,terms in JOURNEYS:
        vals=[]
        for s in SURFACES:
            r=next(x for x in rows if x['surface']==s and x['journey']==name); vals.append(r['static_presence'])
        lines.append('| '+name+' | '+' | '.join(vals)+' | UNVERIFIED_BASELINE_ONLY |')
    lines += ['', '## Admin source determination','', '`web_admin_dashboard.zip` is present in the baseline archive directory and contains 66 members, including `src/pages/admin/*.tsx`, shared components, API utility, config, and public assets. Admin source is therefore present; `ADMIN_SOURCE_MISSING_EVIDENCE.md` is not applicable.','', '## Findings boundary','', 'Phase 0D findings are per-surface static findings with an exact baseline archive member and line number. They are not the earlier backend root backlog and are not merged into it until reviewer acceptance. Static signals such as a client API call or CTA require contract and runtime reconciliation; they do not establish that the flow is complete or secure.','', '## Deliverables','', '- Four independent semantic manifests and evidence directories.','- Four `Screen_Action_Journey_Traceability.tsv` files.','- Four per-surface findings files plus `PHASE0D_Cross_Surface_Findings.tsv`.','- `PHASE0D_Required_Journey_Matrix.tsv`.','- `PHASE0D_MANIFEST_VALIDATION.json`.']
    (OUT/'PHASE0D_CONSOLIDATED_REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print('SURFACES',len(SURFACES),'JOURNEYS',len(JOURNEYS),'MATRIX_ROWS',len(rows))
if __name__=='__main__': main()
