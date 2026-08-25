from __future__ import annotations
import csv,re,zipfile
from pathlib import Path
from collections import Counter
ROOT=Path('/tmp/nabd-main-audit'); BASE=ROOT/'audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc'
ARCH={'patient-mobile':'nabd_plus_patient_app.zip','patient-web':'nabd-patient-web.zip','provider':'NabdProvider-provider.zip','admin':'web_admin_dashboard.zip','backend':'nabdah-backend.zip'}
# Explicit catalog: every row is a named journey step and an exact member path, never a ranked match.
CATALOG={
'Pharmacy':[
 ('cart','patient-mobile','app/pharmacy/cart.tsx',r'(?i)(add|quantity|cart)'),('submit request','patient-mobile','app/pharmacy/checkout.tsx',r'(?i)(submit|checkout|order)'),('broadcast/offers','patient-mobile','app/pharmacy/broadcast-status.tsx',r'(?i)(broadcast|offer|pharmacy)'),('payment/COD/insurance','patient-mobile','app/pharmacy/payment.tsx',r'(?i)(cash|card|cod|insurance|payment)'),('confirmation/tracking','patient-mobile','app/pharmacy/order-confirm.tsx',r'(?i)(confirm|success|order)'),
 ('cart','patient-web','app/[locale]/cart/page.tsx',r'(?i)(cart|quantity|checkout)'),('submit/payment','patient-web','app/[locale]/cart/checkout/page.tsx',r'(?i)(checkout|payment|submit|order)'),('order/result','patient-web','app/[locale]/orders/[orderId]/page.tsx',r'(?i)(order|status|cancel)'),('tracking','patient-web','app/[locale]/orders/[orderId]/tracking/page.tsx',r'(?i)(tracking|delivery)'),
 ('pharmacy fulfillment','provider','src/screens/pharmacy/PharmacyDashboard.tsx',r'(?i)(order|offer|accept|reject|delivery)'),('procurement/admin','admin','src/pages/admin/pharmacy-procurement.tsx',r'(?i)(procurement|pharmacy|order|approve)'),
],
'Consultation':[
 ('doctor search','patient-mobile','app/consultations/doctor-search.tsx',r'(?i)(doctor|search|select)'),('slot/service','patient-mobile','app/consultations/book/[id].tsx',r'(?i)(slot|book|service)'),('cash/insurance confirmation','patient-mobile','app/consultations/booking-confirm.tsx',r'(?i)(confirm|cash|insurance|payment)'),('cancel/reschedule','patient-mobile','app/consultations/cancel-reschedule.tsx',r'(?i)(cancel|reschedule)'),('video/report','patient-mobile','app/consultations/video-call.tsx',r'(?i)(video|call|report)'),
 ('doctor list','patient-web','app/[locale]/consultations/doctors/page.tsx',r'(?i)(doctor|select|href)'),('doctor/slot','patient-web','app/[locale]/consultations/doctors/[doctorId]/page.tsx',r'(?i)(slot|book|appointment)'),('book/payment','patient-web','app/api/appointments/book/route.ts',r'(?i)(POST|book|appointment)'),('cancel/reschedule','patient-web','app/[locale]/appointments/[appointmentId]/page.tsx',r'(?i)(cancel|reschedule)'),('call token','patient-web','app/api/appointments/[appointmentId]/call-token/route.ts',r'(?i)(token|appointment)'),
 ('provider queue','provider','src/screens/doctor/DoctorQueueList.tsx',r'(?i)(queue|appointment|accept|reject)'),('admin provider audit','admin','src/pages/admin/provider-audits.tsx',r'(?i)(provider|appointment|audit)'),
],
'Labs':[
 ('lab services','patient-mobile','app/diagnostics/labs.tsx',r'(?i)(lab|service|search)'),('lab booking/result','patient-mobile','app/diagnostics/lab-booking.tsx',r'(?i)(book|slot|payment|result)'),('lab report','patient-mobile','app/reports/view-report.tsx',r'(?i)(report|result)'),
 ('lab services','patient-web','app/[locale]/diagnostics/labs/page.tsx',r'(?i)(lab|service|search)'),('lab detail/booking','patient-web','app/[locale]/diagnostics/[domain]/[bookingId]/page.tsx',r'(?i)(booking|payment|result|report)'),
 ('lab fulfillment','provider','src/screens/lab/LabDashboard.tsx',r'(?i)(lab|booking|result|accept)'),('lab QC','provider','src/screens/lab/LabQcActions.tsx',r'(?i)(qc|result|approve|reject)'),('lab admin','admin','src/pages/admin/lab-services/index.tsx',r'(?i)(lab|service|approve|price)'),
],
'Radiology':[
 ('radiology services','patient-mobile','app/diagnostics/radiology.tsx',r'(?i)(radiology|service|search)'),('radiology booking','patient-mobile','app/diagnostics/radiology-booking.tsx',r'(?i)(book|slot|payment)'),('radiology report','patient-mobile','app/reports/view-report.tsx',r'(?i)(radiology|report|result)'),
 ('radiology services','patient-web','app/[locale]/diagnostics/radiology/page.tsx',r'(?i)(radiology|service|search)'),('radiology detail/booking','patient-web','app/[locale]/diagnostics/[domain]/[bookingId]/page.tsx',r'(?i)(radiology|booking|payment|report)'),
 ('radiology fulfillment','provider','src/screens/radiology/RadiologyDashboard.tsx',r'(?i)(radiology|booking|result|accept)'),('radiology admin','admin','src/pages/admin/catalog-manager.tsx',r'(?i)(radiology|catalog|approve|price)'),
],
'Nursing/Home-care':[
 ('service/provider','patient-mobile','app/nursing/service-details.tsx',r'(?i)(service|provider|price|book)'),('visit/booking','patient-mobile','app/nursing/service-info.tsx',r'(?i)(visit|book|slot|payment)'),('live tracking','patient-mobile','app/nursing/live-tracking.tsx',r'(?i)(tracking|visit|location)'),
 ('services','patient-web','app/[locale]/home-care/services/page.tsx',r'(?i)(service|provider|price)'),('service booking','patient-web','app/[locale]/home-care/services/[serviceId]/page.tsx',r'(?i)(book|slot|payment|insurance)'),('booking list','patient-web','app/[locale]/home-care/page.tsx',r'(?i)(booking|visit|cancel)'),
 ('nursing operations','provider','src/screens/nursing/NursingFieldOps.tsx',r'(?i)(visit|accept|complete|cancel)'),('nursing portal','admin','src/pages/admin/nursing-portal.tsx',r'(?i)(nursing|visit|approve|provider)'),
],
'Identity/OTP/Roles':[
 ('login/OTP','patient-mobile','app/(auth)/login.tsx',r'(?i)(login|otp|phone|email)'),('session/guard','patient-mobile','src/navigation/guards/AuthGuard.tsx',r'(?i)(auth|session|redirect)'),('logout/settings','patient-mobile','app/settings/security.tsx',r'(?i)(logout|session|security)'),
 ('login/OTP','patient-web','app/[locale]/login/page.tsx',r'(?i)(login|otp|email|phone)'),('OTP request/verify','patient-web','app/api/auth/otp/request/route.ts',r'(?i)(POST|otp|request)'),('session exchange/logout','patient-web','app/api/auth/session/exchange/route.ts',r'(?i)(exchange|session|cookie)'),
 ('provider auth','provider','src/screens/auth/AuthScreens.tsx',r'(?i)(login|otp|auth)'),('provider role guard','provider','src/security/Security.ts',r'(?i)(role|permission|token)'),('admin login/guard','admin','src/pages/login.tsx',r'(?i)(login|auth)'),('admin guard','admin','src/components/AdminGuard.tsx',r'(?i)(admin|role|redirect)'),
],
'Family/Health':[
 ('family members/consent','patient-mobile','app/family/permissions.tsx',r'(?i)(permission|consent|member)'),('health record','patient-mobile','app/family/member-health.tsx',r'(?i)(health|member|record)'),('family','patient-web','app/[locale]/family/page.tsx',r'(?i)(family|member|invite|permission)'),('family API','patient-web','lib/api/family-server.ts',r'(?i)(family|member|permission)'),('provider health context','provider','src/screens/shared/RealScreens.tsx',r'(?i)(patient|health|record)'),
],
'Prescription/Chat/Support':[
 ('prescription','patient-mobile','app/consultations/prescription-from-doctor.tsx',r'(?i)(prescription|download|share)'),('chat','patient-mobile','app/support/chat.tsx',r'(?i)(message|chat|send)'),('support ticket','patient-mobile','app/support/ticket.tsx',r'(?i)(ticket|support|submit)'),
 ('prescription','patient-web','app/[locale]/prescriptions/page.tsx',r'(?i)(prescription|download)'),('chat','patient-web','app/[locale]/chat/[threadId]/page.tsx',r'(?i)(message|chat|send)'),('support','patient-web','lib/api/chat.ts',r'(?i)(chat|message|send)'),('provider chat','provider','src/screens/facility/FacilityInternalChatScreen.tsx',r'(?i)(chat|message|send)'),('admin support','admin','src/pages/admin/support-tickets.tsx',r'(?i)(ticket|support|status)'),
],
'Wallet/Insurance/Payment':[
 ('wallet/cards','patient-mobile','app/wallet/cards.tsx',r'(?i)(card|payment|delete|add)'),('insurance/copay','patient-mobile','src/features/consultation/InsuranceCopayScreen.tsx',r'(?i)(insurance|copay|payment|approve)'),('transactions','patient-mobile','app/wallet/transactions.tsx',r'(?i)(transaction|refund|receipt)'),
 ('insurance','patient-web','app/[locale]/insurance/page.tsx',r'(?i)(insurance|coverage|copay)'),('payment intent','patient-web','app/api/appointments/[appointmentId]/payment-intent/route.ts',r'(?i)(payment|intent|POST)'),('payment API','patient-web','lib/api/payments-server.ts',r'(?i)(payment|refund|invoice)'),('provider payout','provider','src/screens/shared/InsuranceRequestsScreen.tsx',r'(?i)(insurance|approve|reject|copay)'),('admin ledger','admin','src/pages/admin/financial-ledger.tsx',r'(?i)(ledger|payment|refund|invoice)'),
],
'Settings/Accessibility/Location':[
 ('language/settings','patient-mobile','app/settings/language.tsx',r'(?i)(language|locale|save)'),('location/emergency','patient-mobile','app/map/index.tsx',r'(?i)(location|map|permission)'),('settings','patient-web','app/[locale]/settings/page.tsx',r'(?i)(language|settings|save)'),('emergency contacts','patient-web','app/[locale]/health/emergency-contacts/page.tsx',r'(?i)(emergency|contact|save)'),('provider location','provider','src/components/LocationPickerModal.tsx',r'(?i)(location|map|save)'),('admin settings','admin','src/pages/admin/config-portal.tsx',r'(?i)(config|save|setting)'),
],
}
BACKEND={
'Pharmacy':('src/modules/pharmacy_ops/pharmacy_ops.controller.ts','src/modules/pharmacy_ops/pharmacy_ops.service.ts','src/schemas/order.schema.ts'),
'Consultation':('src/modules/unified-bookings/unified-bookings.module.ts','src/modules/unified-bookings/unified-bookings.service.ts','src/schemas/appointment.schema.ts'),
'Labs':('src/modules/labs/labs.controller.ts','src/modules/labs/labs.service.ts','src/schemas/lab.schema.ts'),
'Radiology':('src/modules/radiology/radiology.controller.ts','src/modules/radiology/radiology.service.ts','src/schemas/radiology.schema.ts'),
'Nursing/Home-care':('src/modules/home-care/home-care.controller.ts','src/modules/home-care/home-care.service.ts','src/schemas/home-care.schema.ts'),
'Identity/OTP/Roles':('src/modules/auth/auth.controller.ts','src/modules/auth/auth.service.ts','src/schemas/user.schema.ts'),
'Family/Health':('src/modules/family/family.controller.ts','src/modules/family/family.service.ts','src/schemas/family.schemas.ts'),
'Prescription/Chat/Support':('src/modules/prescriptions/prescriptions.controller.ts','src/modules/prescriptions/prescriptions.service.ts','src/schemas/prescription.schema.ts'),
'Wallet/Insurance/Payment':('src/modules/wallet/wallet.controller.ts','src/modules/wallet/wallet.service.ts','src/schemas/wallet.schema.ts'),
'Settings/Accessibility/Location':('src/modules/users/users.controller.ts','src/modules/users/users.service.ts','src/schemas/emergency.schema.ts'),
}
def load(archive):
 out={}
 with zipfile.ZipFile(BASE/archive) as z:
  for i in z.infolist():
   if i.is_dir(): continue
   try: out[i.filename]=z.read(i).decode('utf-8')
   except UnicodeDecodeError: pass
 return out
def anchor(files,path,rx):
 if path not in files: return ('MISSING_CAPABILITY','N/A','Path not present in baseline archive; explicit catalog entry was not materialized.')
 for n,line in enumerate(files[path].splitlines(),1):
  if re.search(rx,line): return ('MATCH',str(n),line.strip()[:240])
 return ('MISSING_CAPABILITY','1',f'Exact member exists but no domain-specific `{rx}` signal was found; absence requires targeted review.')
def step_note(journey,step,surface,label):
 return f'MISSING_CAPABILITY — {surface}/{journey}/{step}: {label}; exact source path and line must be anchored before closure.'
def payment_note(journey,step,surface):
 key=f'{surface}/{journey}/{step}'
 if journey=='Pharmacy': return f'{key}: chosen-offer gate required; Cash/card only after selected offer, COD only with explicit deferred-collection policy, Insurance waits for pharmacy decision and co-pay.'
 if journey in ('Consultation','Labs','Radiology','Nursing/Home-care'): return f'{key}: Cash follows service/provider/slot selection; Insurance request is pre-payment and waits for provider decision/co-pay before patient share and confirmation.'
 if journey=='Wallet/Insurance/Payment': return f'{key}: payment/insurance state must be server-authoritative with intent/webhook/ledger or explicit coverage decision.'
 return f'{key}: payment rule not applicable to this step; no payment claim is made.'
def main():
 data={k:load(a) for k,a in ARCH.items()}; rows=[]; rid=1
 for journey,steps in CATALOG.items():
  ctrl,svc,sch=BACKEND[journey]
  for step,surface,fp,rx in steps:
   status,fl,fs=anchor(data[surface],fp,rx)
   cstat,bl,cs=anchor(data['backend'],ctrl,rx)
   sstat,sl,ss=anchor(data['backend'],svc,rx)
   hstat,hl,hs=anchor(data['backend'],sch,rx)
   # No row is created from generic presence: the explicit catalog step must have an exact member path.
   if status=='MISSING_CAPABILITY' and fp not in data[surface]: continue
   if status=='MATCH' and cstat=='MATCH' and sstat=='MATCH' and False: cls='STATIC_MATCHED_PARTIAL'
   elif status=='MATCH' and cstat=='MATCH' and sstat=='MATCH': cls='INSUFFICIENT_EVIDENCE'
   elif status=='MATCH' and (cstat=='MISSING_CAPABILITY' or sstat=='MISSING_CAPABILITY'): cls='RUNTIME_REQUIRED'
   else: cls='INSUFFICIENT_EVIDENCE'
   actor='patient' if surface.startswith('patient') else ('provider/staff' if surface=='provider' else 'admin')
   prefix=f'{surface}/{journey}/{step}'
   backend_anchor=f'{ctrl}:{bl} -> {svc}:{sl} -> {sch}:{hl}'
   rows.append({'row_id':f'0D1-{rid:04d}','journey':journey,'step':step,'surface':surface,'actor':actor,'exact_screen_or_route':fp,'frontend_line':fl,'exact_cta_action':fs,'navigation_next_state':step_note(journey,step,surface,'no generic navigation claim is accepted'),'request_method_path_or_socket':step_note(journey,step,surface,'no exact method/path or socket event was anchored in the explicit member'),'request_payload_fields':step_note(journey,step,surface,'no payload fields are asserted without the exact request source'),'backend_controller_path_line':f'{ctrl}:{bl}' if cstat=='MATCH' else f'{ctrl}:{bl} ({cs})','backend_service_path_line':f'{svc}:{sl}' if sstat=='MATCH' else f'{svc}:{sl} ({ss})','backend_dto_schema_state_path_line':f'{sch}:{hl}' if hstat=='MATCH' else f'{sch}:{hl} ({hs})','ownership_role_enforcement_path_line':step_note(journey,step,surface,f'ownership/role anchor absent; backend context {backend_anchor}'),'authoritative_price_stock_provider_insurance_path_line':step_note(journey,step,surface,'authoritative price/stock/provider/insurance source line absent'),'payment_intent_webhook_ledger_cod_copay_path_line':payment_note(journey,step,surface),'provider_admin_action_path_line':step_note(journey,step,surface,'provider/admin action anchor absent'),'notification_result_report_path_line':step_note(journey,step,surface,'notification/result/report anchor absent'),'happy_state':step_note(journey,step,surface,'happy-state branch absent'),'unauth_state':step_note(journey,step,surface,'unauth branch absent'),'wrong_role_state':step_note(journey,step,surface,'wrong-role branch absent'),'owner_stranger_state':step_note(journey,step,surface,'owner/stranger branch absent'),'validation_state':step_note(journey,step,surface,'validation branch absent'),'error_state':step_note(journey,step,surface,'error branch absent'),'loading_state':step_note(journey,step,surface,'loading branch absent'),'empty_state':step_note(journey,step,surface,'empty branch absent'),'retry_state':step_note(journey,step,surface,'retry branch absent'),'cancel_refund_state':step_note(journey,step,surface,'cancel/refund branch absent'),'evidence_classification':cls,'evidence_note':f'Explicit catalog row. Frontend: {fp}:{fl}. Frontend signal: {fs}. Backend anchors: {backend_anchor}. No ranking was used; missing fields are explicit gaps.','status':'ACTIVE_EVIDENCE_FIRST'})
   rid+=1
 out=ROOT/'audit-artifacts/phase0d/PHASE0D1_EVIDENCE_FIRST_JOURNEY_ROWS.tsv'; fields=list(rows[0])
 with out.open('w',encoding='utf-8',newline='') as f:
  w=csv.DictWriter(f,fieldnames=fields,delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(rows)
 print('ROWS',len(rows)); print('BY_JOURNEY',dict(Counter(r['journey'] for r in rows))); print('BY_CLASS',dict(Counter(r['evidence_classification'] for r in rows)))
if __name__=='__main__': main()
