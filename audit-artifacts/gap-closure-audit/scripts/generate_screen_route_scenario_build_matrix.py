#!/usr/bin/env python3
from pathlib import Path
import csv

ROOT=Path(__file__).resolve().parents[3]
TSV=ROOT/'audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv'
OUT=ROOT/'audit-artifacts/gap-closure-audit/NABD_SCREEN_ROUTE_SCENARIO_BUILD_MATRIX_2026-08-26.md'

rules={
 'consultations':('P0','Unified booking','discover → provider → slot hold → quote → cash/card OR insurance decision → co-pay → confirmation → delivery/call → post-care'),
 'diagnostics':('P0','Unified booking + results','catalog → provider/slot/home eligibility → hold/quote → payment/insurance → confirmation → collection/scan → signed result → support'),
 'pharmacy':('P0','Pharmacy offers','cart/Rx/address → geo broadcast → offers with stock/substitution/price/ETA → selection lock → payment/COD/insurance → fulfillment → issue/refund'),
 'nursing':('P0','Home-care/nursing','service/address/assessment → caregiver/slot → quote/payment/insurance → assignment → visit progress → completion/issue'),
 'home-care':('P0','Home-care','service/address/assessment → provider/slot → quote/payment/insurance → assignment → visit progress → completion/issue'),
 'insurance':('P0','Payer/co-pay','policy consent → eligibility/request → full/partial/reject/co-pay decision + reason → patient alternative/payment → confirmation'),
 'payments':('P0','Payments/ledger','payment intent → provider authorization → verified webhook → ledger/receipt → failure/retry/refund/dispute'),
 'wallet':('P1','Ledger wallet','funding/transfer/transaction → policy/risk → immutable ledger → reconciliation/receipt/dispute'),
 'returns':('P0','Refund/dispute','eligibility → evidence → approval/reject → PSP reversal/refund + ledger/inventory adjustment → notification'),
 'health':('P1','PHI workspace','authorized read/edit boundary → provenance/freshness → consent/delegation/audit → notifications/escalation when clinically appropriate'),
 'family':('P0','Family delegation','invite → accept → scoped permission/time limit → audited resource access → revoke/expiry'),
 'profile':('P0','Profile/address/insurance','identity-bound read/edit → validation → audit/consent → real persistence and error recovery'),
 'settings':('P0','Privacy/security controls','display → actionable control → confirmation/re-auth where needed → audited server mutation → result/recovery'),
 'emergency':('P0-SAFETY','Emergency','only after jurisdiction SOP: consent/location → dispatch/escalation → acknowledgement → failure/false-alarm handling → audit'),
 'ai':('P0-SAFETY','AI/clinical safety','approved use → consent/input minimization → grounded output/uncertainty → refusal/human escalation → evaluation/audit'),
 'mental-health':('P0-SAFETY','Mental-health safety','approved content/workflow → crisis path/escalation → clinical ownership → safe failure/audit'),
 'maternity':('P1-SAFETY','Maternity','clinically approved content/data → consent → review/escalation → accurate state and audit'),
 'nutrition':('P1-SAFETY','Nutrition','clinically approved data/content → consent → transparent limitations → human referral/escalation'),
 'loyalty':('P1','Loyalty','eligibility → earn/redeem → immutable balance/reversal → anti-abuse/audit'),
 'offers':('P1','Commercial offers','eligibility/publish window → truthful price terms → redemption → audit/reversal'),
 'reports':('P1','PHI reports','authorized report state → provenance/signature → secure access/export/share → amendment/audit'),
 'articles':('P1','Content','draft → clinical/editorial review → publish → update/unpublish → moderation/SEO lifecycle'),
 'community':('P1','Community','identity/policy → create → moderation/report/block → publish/remove → audit'),
 'wearables':('P1-SAFETY','Wearables','OS permission → encrypted sync → provenance/freshness/conflict → revoke/delete → clinical-safe display'),
 'room':('P0','Video call','booking entitlement → one-time scoped token → room join/device failure → leave/end/audit/retention'),
 'voice':('P1','Voice','consent → capture/transcribe → PII minimization → action confirmation → failure/delete/audit'),
 'search':('P1','Search','authorized query → result provenance/ranking → PII-safe logging → empty/error/no-result'),
 'services':('P0','Service directory','published provider/service capability/availability → typed handoff to correct journey'),
 'support':('P0','Support','identity verification → case/attachment policy → queue/SLA → resolution/escalation/audit'),
 'notifications':('P0','Notifications','preference → event → delivery/retry → deep link/action → read/dismiss/audit'),
 'onboarding':('P0','Identity onboarding','locale/legal/consent → registration/OTP/verification → session → safe recovery/blocked states'),
 'terms':('P0','Legal/consent','versioned terms/privacy → consent capture → reaccept/revoke where policy permits → audit'),
 'drug-scanner':('P1-SAFETY','Drug scanning','camera permission → authoritative barcode/Rx lookup → confidence/unknown → pharmacist/clinical safe fallback'),
 'medical-programs':('P1-SAFETY','Medical programs','eligibility/consent → plan → clinical review → tasks/progress → escalation/audit'),
}

def family(route):
 r=route
 if r.startswith('(onboarding)'): return 'onboarding'
 if r.startswith('(tabs)/services'): return 'services'
 if r.startswith('(tabs)/diagnostics'): return 'diagnostics'
 if r.startswith('(tabs)/'): return 'dashboard'
 if r=='index': return 'onboarding'
 return r.split('/')[0]

def row_rule(route):
 f=family(route)
 if f in rules: return rules[f]
 return ('P1','Cross-cutting / source reconciliation','complete exact CTA → contract → authz → authoritative data → real result/error/recovery; no source evidence of backend behavior is assumed')

with TSV.open(newline='',encoding='utf-8') as fh:
 rows=list(csv.DictReader(fh,delimiter='\t'))
missing=[r for r in rows if r['mapping_status']=='MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY']
partial=[r for r in rows if r['mapping_status']=='MANUAL_MAPPING_COMPLETE__STATIC_MATCHED_PARTIAL']

by={}
for r in missing+partial:
 f=family(r['mobile_route'])
 by.setdefault(f,[]).append(r)

lines=[]
a=lines.append
a('# Nabd — مصفوفة بناء الشاشات والمسارات والسيناريوهات الناقصة')
a('')
a('**الإصدار:** 2026-08-26')
a('**الغرض:** ملحق تنفيذي لمخطط التحول الإنتاجي. يحول صفوف تدقيق Web المصدرية إلى قائمة بناء قابلة للمراجعة، ويحدد أسطح Mobile التي تحتاج تصحيحًا لا نسخًا، ويضع catalog مشروطًا لـProvider وAdmin حتى يُنجز تدقيقهما.')
a('')
a('> **الحد الدليلي:** جميع صفوف Patient Web في الملحق أدناه مستخرجة حرفيًا من سجل parity: `189 MISSING_CAPABILITY` و`53 STATIC_MATCHED_PARTIAL`. التصنيف يثبت غياب/جزئية surface في مصدر Web المقروء، ولا يثبت غياب backend endpoint أو integration حية. أسطح Mobile المذكورة هي أعمال تصحيح مستمدة من findings، لا قائمة افتراضية لنسخ 246 route. Provider/Admin لا يتحولان إلى build final قبل التدقيق اليدوي والعقود.')
a('')
a('## 1. كيفية استخدام المصفوفة')
a('')
a('| الحقل | الاستخدام الإلزامي |')
a('|---|---|')
a('| Priority | `P0` يمنع إطلاق journey أساسي؛ `P0-SAFETY` يمنع كشف ميزة سريرية/طوارئ؛ `P1` بعد إغلاق الأساس؛ `P2` after launch only. |')
a('| Build status | `BUILD` = surface مفقود؛ `COMPLETE_OR_REPLACE` = surface جزئي يحتاج عقد/CTA/state حقيقي؛ `AUDIT_FIRST` = Provider/Admin/Backend غير مثبت. |')
a('| Contract slice | يكتب قبل الكود: CTA, actor, method/event, schemas, authz, authoritative source, state transition, audit, notification, failure/recovery. |')
a('| Scenario | ليست شاشة happy path؛ يلزم loading/empty/error/offline/denied/expired/concurrent/retry/cancel. |')
a('| Done | لا إغلاق من UI فقط: contract + source-of-truth + tests + runtime + operations evidence. |')
a('')
a('## 2. مصفوفة Mobile: تصحيح الرحلات والأسطح ذات الخطورة المثبتة')
a('')
a('| Mobile module / surfaces | Build or correction required | Required scenarios | Blocking contract / acceptance |')
a('|---|---|---|---|')
mobile=[
('Auth/onboarding/session: login, OTP, reset, guest, permissions/legal','إلغاء identifier/OTP/reset التناقضات وguest fallback بعد 401/403؛ بناء registration/social/2FA/recovery فقط بعقد حقيقي.','new/existing/locked account; OTP expiry/replay; invalid/limited attempts; session expiry; logout all devices; consent version; offline.','IAM/session/consent pack; owner/stranger/unauth; rate limit and audit; no silent guest. P0.'),
('Profile/address/family/PHI: profile, addresses, QR/share, family, reports, health data','إعادة بناء edit/delegation/share حول server authorization وconsent؛ لا مشاركة/QR/child/family path بلا scope/revoke.','invite/accept/decline; scope/expiry/revoke; address invalid/unserviceable; report access/export; data correction/delete.','PHI/delegation pack; audited access, retention, policy; physical device/runtime tests. P0.'),
('Pharmacy tab/cart/Rx/manual order/broadcast/offers/payment/tracking/returns','استبدال cached/manual/local flow بالرحلة الكاملة offers; بناء wait/no-offer/selection/substitution/COD/insurance states.','Rx required/invalid; partial stock; substitutions; offer race/expiry; payer reject/co-pay; PSP fail; dispatch issue; return/dispute.','Pharmacy offer/order/ledger/payer/provider contracts; selected-offer lock; reconciliation. P0.'),
('Consultations/nursing/services/booking/payment/call/waiting','استبدال client filters/fallback appointment ID/local outcomes بحجز authoritative؛ call room لا يدخل بلا entitlement.','slot race/expiry; provider reject; cash fail; insurance full/partial/reject; reschedule/no-show; call device/network failure; post-care.','Unified booking, scheduling, payment/payer, call-token and provider workflows. P0.'),
('Labs/radiology/home-care: catalog, selection, booking, prep/result/visit','إكمال service/provider/slot/quote/payment/insurance/result journey؛ لا report badge أو catalog كدليل completion.','home eligibility; prep missed; collection delay; result correction; provider cancellation; report access delegation.','Diagnostic/home-care booking/result provenance/assignment contracts. P0.'),
('Wallet/cards/payment outcomes/returns/loyalty','حذف raw-card/local success/fake wallet/refund semantics؛ بناء financial UI فقط فوق PSP+ledger.','authorization/capture/fail/retry; webhook pending; refund/dispute; stale balance; duplicate transfer; points reversal.','PSP/ledger/reconciliation/refund policy. P0 for payment/refund; P1 loyalty/wallet.'),
('Insurance hub/policy/benefits/co-pay/claims','استبدال fake policy/benefit/scraping/local approval بقرارات payer versioned وسبب/بدائل.','eligibility unavailable; full/partial/reject; co-pay expiry; patient cash/cancel choice; claim evidence.','Payer authorization/decision/co-pay contract and consent. P0.'),
('Emergency/AI/mental health/nutrition/maternity','عدم كشف action مصطنع؛ بناء فقط بعد safety packs أو حجب surfaces.','uncertainty/refusal; crisis escalation; emergency acknowledgement/failure; clinical content expiry; locale.','Clinical safety, SOP, human escalation, evidence/guidance governance. P0-SAFETY.'),
('Wearables/scanner/voice/search/map/deep links','إكمال OS permission/data minimization/freshness/authorization أو حجب; resolver/type integrity.','permission denied; unavailable hardware; unknown scan; voice delete; bad slug; map/location consent.','Device/OS/privacy/search/publication contracts. P1 or P0 when needed by launched journey.'),
('Settings/support/notifications/articles/community/reviews','تحويل summaries/local toggles إلى real controls or hide; content/review/community moderation.','privacy revoke/export; notification delivery/action; support attachment; abuse report; review eligibility.','Privacy/support/content/moderation contracts. P0 for security/support; P1 content/community.'),
]
for r in mobile:
 a('| '+' | '.join(r)+' |')
a('')
a('## 3. Patient Web: exact source-derived surfaces to build or complete')
a('')
a('The following tables enumerate every Web parity row classified `MISSING_CAPABILITY` or `STATIC_MATCHED_PARTIAL`. A missing Web surface is not automatically a launch requirement: the priority and scenario show whether it is required by the production service scope or must remain unpublished until its safety/financial/clinical contract exists.')
a('')
for f in sorted(by):
 p,contract,scenario=row_rule(next(r['mobile_route'] for r in by[f]))
 a(f'### 3.{f} — `{p}` — {contract}')
 a('')
 a(f'**Required journey scenario:** {scenario}')
 a('')
 a('| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |')
 a('|---|---|---|---|---|')
 for r in sorted(by[f],key=lambda x:x['screen_id']):
  status='BUILD' if r['mapping_status'].endswith('MISSING_CAPABILITY') else 'COMPLETE_OR_REPLACE'
  note=r['mapping_note'].replace('|','\\|').replace('\n',' ')[:260]
  a(f"| {r['screen_id']} | `{r['mobile_route']}` | {status} | {note} | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |")
 a('')
a('## 4. logical screens required for complete launched journeys')
a('')
a('These screens are required even when the old route inventory did not name them, because a production state machine is incomplete without them.')
a('')
a('| Journey | Required additional screens/states | Why it cannot be omitted | Priority |')
a('|---|---|---|---|')
logical=[
('Pharmacy','address/serviceability; Rx review status; broadcast waiting; no eligible pharmacy; offers compare; substitution consent; selected-offer expiry; payment processing/failure; insurance decision/co-pay; fulfilment timeline; issue/return/refund/dispute; receipt.','Each is a material state transition, financial guard or recovery path.','P0'),
('Bookings','slot hold expiry; quote change; payment processing/failure; payer decision/co-pay/reject; confirmed receipt; provider cancellation; patient cancel/reschedule; no-show; call device/check/waiting; visit/diagnostic prep; result amendment; support.','A booking cannot be truthful with only discovery and success pages.','P0'),
('Identity/PHI','signup/social only if contracted; verification retry/locked/expired; device/session manage; re-auth for sensitive action; consent history/revoke; delegation scope/revoke; export/delete status.','Privacy, account recovery and ownership require user-visible recovery/control states.','P0'),
('Provider','offer/booking work queues; claim/co-pay action; capacity/stock conflict; fulfillment/visit evidence; payout/recon; incident/support queue.','Patient journeys stop if provider cannot operate every required transition.','P0'),
('Admin','approval/revoke; exception/dispute; financial reconcile; access audit; consent/data request; clinical/content incident; SLA queue.','A platform cannot safely operate exceptions through database/manual side channels.','P0'),
('Support','identity verification; case creation; PHI-safe attachment; status/SLA; escalation; resolution/feedback.','Users need safe recovery from all failed financial/clinical/operational scenarios.','P0'),
]
for r in logical:a('| '+' | '.join(r)+' |')
a('')
a('## 5. Provider build matrix — audit-first, then implementation')
a('')
a('Provider source read is not runtime/contract readiness. The following rows define the required screen/scenario catalog; every row remains `AUDIT_FIRST` until the Provider route/CTA/contract review identifies its exact existing/missing surface.')
a('')
a('| Provider module | Required routes/screens/actions | Required scenarios | Contract/operations owner | Status |')
a('|---|---|---|---|---|')
provider=[
('Organization onboarding','registration, legal/KYC, branch/service zone, license/credential, bank/payout, approval/denial/renewal.','pending/approved/rejected/expired/revoke/resubmit.','Admin governance + IAM + Finance.','AUDIT_FIRST'),
('Staff and roles','staff list, invite, role/branch assignment, shift/availability, suspend/remove, credential expiry.','invite expiry, least privilege, offboarding, tenant denial.','IAM/tenant/audit.','AUDIT_FIRST'),
('Catalog/capacity','service/medicine/catalog, price input, inventory, service area, slot capacity, blackout, publish/revoke.','version conflict, stale stock, approval pending, over-capacity.','Catalog/scheduling/admin policy.','AUDIT_FIRST'),
('Pharmacy fulfillment','broadcast queue, request detail, offer/substitution, stock reserve, payment/coverage guard, prepare/dispatch/delivery/issue.','offer expiry, patient selects competitor, payer reject, stock conflict, delivery failure.','Pharmacy/order/ledger/payer.','AUDIT_FIRST'),
('Clinical/booking delivery','appointment queue, accept/reject, slot updates, call/visit, notes/result, referral/follow-up.','no-show, reschedule, clinical escalation, result correction.','Booking/call/clinical documents.','AUDIT_FIRST'),
('Home-care/nursing','assignment, route/arrival, task checklist, visit state, completion proof, supervisor escalation.','unsafe address, staff late, task exception, patient unavailable.','Assignment/operations/clinical safety.','AUDIT_FIRST'),
('Insurance/finance','eligibility/decision/co-pay, invoices, payout statement, reconciliation, dispute.','full/partial/reject, settlement mismatch, adjustment approval.','Payer/ledger/admin finance.','AUDIT_FIRST'),
('Support/quality','SLA work queue, support messages, complaints, incidents, scorecard.','PHI-safe escalation, policy breach, audit/review.','Support/safety/operations.','AUDIT_FIRST'),
]
for r in provider:a('| '+' | '.join(r)+' |')
a('')
a('## 6. Admin build matrix — audit-first, then implementation')
a('')
a('| Admin module | Required routes/screens/actions | Required scenarios | Control requirement | Status |')
a('|---|---|---|---|---|')
admin=[
('Admin IAM','login/MFA, role/permission, privileged session, access review, break-glass.','step-up/revoke/denied/expiry/break-glass review.','least privilege, MFA, immutable audit.','AUDIT_FIRST'),
('Provider governance','organization/branch/staff/license/service approval, suspend/revoke, appeal.','pending/reject/expiry/renewal/dispute.','dual control/reason/evidence/notification.','AUDIT_FIRST'),
('Operations command','booking/order/offer/visit/call exception queues, SLA, reassignment/escalation.','stuck/late/no-offer/no-show/provider outage.','role/action/time/reason audit.','AUDIT_FIRST'),
('Finance command','payments/webhooks/ledger/reconciliation/COD/payout/refund/dispute.','mismatch/replay/duplicate/refund approval/settlement.','segregation of duties and finance approval.','AUDIT_FIRST'),
('Payer command','policy/payer exception, co-pay review, reason codes, claim escalation.','partial/reject/expired/conflict.','consent and payer decision audit.','AUDIT_FIRST'),
('Privacy/security','audit search, consent/data request, incident/case, risk/access alerts.','unauthorized access, deletion/export, breach response.','restricted PHI view, retention and audit.','AUDIT_FIRST'),
('Clinical/content safety','content review, AI review signals, clinical incident, emergency record, moderation.','unsafe content, escalation, publish/revoke.','clinical owner and safety audit.','AUDIT_FIRST'),
('Support/analytics','support cases, QA, feedback taxonomy, governed KPIs.','PHI-safe handling, metric data quality, export restrictions.','data lineage and access controls.','AUDIT_FIRST'),
]
for r in admin:a('| '+' | '.join(r)+' |')
a('')
a('## 7. Contract slice template for every screen/CTA')
a('')
a('```text')
a('slice_id / product / actor / exact route-screen / entry-state')
a('CTA label + enabled guard + next state')
a('request method/path or event + payload + idempotency/concurrency')
a('response/error/status schema + loading/empty/error/offline/denied/expired UI')
a('backend controller/service/DTO/schema/state transition')
a('authorization/tenant/ownership/delegation rule')
a('authoritative price/stock/slot/payer/clinical source and freshness')
a('payment/ledger/COD/co-pay semantics where relevant')
a('provider/admin/support action, notification/result/audit events')
a('tests: owner/stranger/unauth + negative/race/replay/runtime + observability')
a('```')
a('')
a('## 8. Release prioritization')
a('')
a('| Bucket | What enters | Release rule |')
a('|---|---|---|')
a('| P0 Foundation | IAM/PHI/audit, contracts, ledger/PSP/payer, pharmacy, booking, provider/admin operations, support. | Required before general public release. |')
a('| P0-SAFETY | emergency, AI, mental health, medication scanning, clinical claims. | Disabled until independent safety pack and operational drill close. |')
a('| P1 Complete experience | health workspace expansion, content, reviews/community, loyalty/wallet, wearables, voice, advanced discovery. | After P0 stability and each domain contract. |')
a('| P2 Growth | experimental campaigns, advanced automation, nonessential personalization. | Only after governance, privacy, performance and support capacity prove ready. |')
a('')
a('## 9. References')
a('')
a('[1]: `PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv` — source of exact Web missing/partial rows.')
a('[2]: `PATIENT_MOBILE_SOURCE_REVIEW_CONSOLIDATION_2026-08-26.md` — source of Mobile correction clusters and evidence limits.')
a('[3]: `NABD_FULL_PRODUCTION_TRANSFORMATION_BLUEPRINT_2026-08-26.md` — overarching production transformation blueprint.')
OUT.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(f'output={OUT}')
print(f'missing={len(missing)} partial={len(partial)} total={len(missing)+len(partial)} families={len(by)}')
