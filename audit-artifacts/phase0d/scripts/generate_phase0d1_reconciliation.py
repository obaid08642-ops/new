from __future__ import annotations
import csv, re, zipfile
from pathlib import Path

ROOT=Path('/tmp/nabd-main-audit'); BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'
SURFACES={'patient-mobile':'nabd_plus_patient_app.zip','patient-web':'nabd-patient-web.zip','provider':'NabdProvider-provider.zip','admin':'web_admin_dashboard.zip'}
BACKEND='nabdah-backend.zip'
JOURNEYS=[
 ('Pharmacy','cart → submit request → broadcast → offers → chosen pharmacy → cash/card or COD policy, or insurance approval/co-pay → preparation → delivery/pickup → cancel/refund/tracking',['pharmacy','cart','checkout','order','offer']),
 ('Consultation','online/clinic/home → doctor → slot → cash confirmation or insurance request/decision/co-pay/payment → reschedule/cancel/no-show/video/report',['consultation','appointment','booking','doctor','slot']),
 ('Labs','home/center → lab provider → slot → cash confirmation or insurance decision/co-pay → execution → result/report/PHI',['lab','laboratory','result']),
 ('Radiology','home/center → radiology provider → slot → cash confirmation or insurance decision/co-pay → execution → report/PHI',['radiology','imaging']),
 ('Nursing/Home-care','home service → provider/visit → cash confirmation or insurance decision/co-pay → execution → report/cancel',['nursing','home-care','home care','visit']),
 ('Identity/OTP/Roles','login/register → OTP/session → ownership/role boundary → logout/revocation',['auth','login','register','otp','session']),
 ('Family/Health','family/delegation/consent → health record/vitals/maternity/mental health → notification',['family','consent','vital','maternity','mental','health']),
 ('Prescription/Chat/Support','prescription/read/upload → chat/support/community → notification/result',['prescription','chat','support','community']),
 ('Wallet/Insurance/Payment','wallet/invoice → cash/card/insurance/co-pay → refund/ledger/receipt',['wallet','payment','insurance','refund','invoice']),
 ('Settings/Accessibility/Location','language/RTL/accessibility → map/location/emergency → notification',['settings','language','rtl','accessibility','map','location','emergency']),
]

def entries(archive):
    out=[]
    with zipfile.ZipFile(BASE/archive) as z:
        for i in z.infolist():
            if i.is_dir(): continue
            try: text=z.read(i).decode('utf-8')
            except UnicodeDecodeError: continue
            out.append((i.filename,text))
    return out

def pick(items, terms, preferred=()):
    ranked=[]
    for path,text in items:
        low=(path+' '+text[:5000]).lower(); score=sum(t in low for t in terms)+sum(3 for p in preferred if p in path.lower())
        if score: ranked.append((score,path,text))
    ranked.sort(reverse=True)
    return ranked[0][1:] if ranked else ('','')
def anchor(text, terms, regex=None):
    rx=re.compile(regex,re.I) if regex else None
    for n,line in enumerate(text.splitlines(),1):
        if (rx.search(line) if rx else any(t in line.lower() for t in terms)):
            return n,line.strip()[:220]
    return ('','')
def endpoint(text,terms):
    rx=re.compile(r'(?i)(@(get|post|patch|put|delete)\([^)]*\)|["\']/(api|auth|orders|bookings|appointments|labs|radiology|nursing|home-care|pharmacy|insurance|wallet|chat|notifications)[^"\']*)')
    for n,line in enumerate(text.splitlines(),1):
        if any(t in line.lower() for t in terms) and rx.search(line): return n,line.strip()[:240]
    return ('','')
def main():
    backend=[(p,t) for p,t in entries(BACKEND) if not re.search(r'(?i)(/tests?/|__tests__|\.spec\.|\.test\.|contract\.spec)',p)]
    rows=[]
    for surface,archive in SURFACES.items():
        front=entries(archive)
        for journey,flow,terms in JOURNEYS:
            fp,ft=pick(front,terms,preferred=('screen','page','app/','api/','client','service'))
            fl,fsig=anchor(ft,terms) if ft else ('','')
            ep,es=endpoint(ft,terms) if ft else ('','')
            # Prefer concrete backend controllers/services/schemas matching domain terms.
            bp,bt=pick(backend,terms,preferred=('controller','service','schema','module'))
            bl,bsig=anchor(bt,terms) if bt else ('','')
            endpoint_literals=re.findall(r'["\'](/[A-Za-z0-9_./:{}?=&$-]+)',es) if es else []
            if ep and bp: cls='STATIC_MATCHED' if endpoint_literals and any(lit.lower() in bt.lower() for lit in endpoint_literals) else 'RUNTIME_REQUIRED'
            elif fp and bp: cls='INSUFFICIENT_EVIDENCE'
            elif fp and not bp: cls='STATIC_MISMATCH'
            else: cls='MISSING_CAPABILITY'
            actor='patient' if surface.startswith('patient') else ('provider/staff' if surface=='provider' else 'admin')
            rows.append({'surface':surface,'journey':journey,'journey_definition':flow,'screen_or_route':fp or 'MISSING_CAPABILITY','cta_action':fsig or 'MISSING_CAPABILITY','actor':actor,'frontend_source_path':fp or 'MISSING_CAPABILITY','frontend_line':fl or 'N/A','request_method_path_or_socket':es or 'MISSING_CAPABILITY','request_payload_fields':'Static payload extraction required; not inferred when absent','backend_source_path':bp or 'MISSING_CAPABILITY','backend_line':bl or 'N/A','backend_controller_service_dto_schema_state':bsig or 'MISSING_CAPABILITY','ownership_role_checks':'Not proven by static keyword scan; reconcile exact guard/decorator/owner query','price_stock_provider_insurance_source':'Must be server-authoritative; exact source not inferred unless anchored','payment_trigger_and_state':'Cash/card only after service/provider/slot or chosen pharmacy offer; insurance waits for decision/co-pay','provider_admin_step':'Trace required from backend/provider/admin source','result_report_notification':'Trace required from handler/state to result/report/notification','happy_state':'Trace required','unauth_state':'Trace required','wrong_role_state':'Trace required','owner_stranger_state':'Trace required','validation_state':'Trace required','error_state':'Trace required','loading_state':'Trace required','empty_state':'Trace required','retry_state':'Trace required','cancel_refund_state':'Trace required','evidence_classification':cls,'evidence_note':f'Frontend anchor `{fp}:{fl}` and backend anchor `{bp}:{bl}` are static only; no runtime proof.'})
    out=ROOT/'audit-artifacts/phase0d/PHASE0D_JOURNEY_CONTRACT_RECONCILIATION.tsv'; fields=list(rows[0])
    with out.open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(rows)
    print('ROWS',len(rows));
    from collections import Counter
    print('CLASSIFICATIONS',dict(Counter(r['evidence_classification'] for r in rows)))
if __name__=='__main__': main()
