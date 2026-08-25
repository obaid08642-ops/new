# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/open-gaps-markers.txt`
- **Member SHA-256:** `2d8e76ef48e44861ceaee09aa52beda82598581d547a7b03ee57552e66bac086`
- **Line count:** 382
- **Read range:** `1-382`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: audit-artifacts/WEB_V2_RADIOLOGY_SERVICES_GET_SLICE_AR.md:7:**Service detail: BLOCKED بسبب Backend Bug.** مسار detail لا يُعرض كرابط فعال في الويب حتى إصلاح backend؛ نتيجة الفحص الحي الحالية لـdetail هي 404 دائماً بسبب حقل `id` المخزن binar`
- `6: audit-artifacts/WEB_V2_DOCTOR_DETAIL_GET_SLICE_AR.md:32:Doctor Detail أصبح **implemented / verified GET**. Booking actions وslot selection تبقى **Deferred pending their own verified contract slice**، وفق Contract-First وZero-Mock policy.`
- `10: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:3:هذا سجل ذري مولد من ملفات Mobile الفعلية. كل صف رحلة أولية واحدة، وليس ادعاء أن الملف يساوي شاشة واحدة أو أن الحالة ناجحة. `BLOCKED_OR_CONTRACT_REVIEW` تعني أن التنفيذ ينتظر عقدًا موثقًا أو إث`
- `11: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:16:| J-010 | consultations | consultations/booking-confirm.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /insurance/companies \| /insurance/companies/${insCompany}/networks`
- `12: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:17:| J-011 | consultations | consultations/booking-pending.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/appointments/${appoint`
- `13: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:18:| J-012 | consultations | consultations/cancel-reschedule.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/doctors/${appointmen`
- `14: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:19:| J-013 | consultations | consultations/video-call.tsx | mutation | import { apiFetch } from "../../src/utils/api"; \| /calls/initiate \| /calls/${sessionId}/join | candidate from db404ee8 | `
- `15: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:20:| J-014 | consultations | consultations/chat-with-doctor.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/doctors/${doctorId} \| /chat/threads/direct | candidate from`
- `16: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:21:| J-015 | consultations | consultations/post-call-rating.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /patient-ux/review | candidate from db404ee8 | BLOCKED_OR_CONTRACT`
- `17: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:22:| J-016 | consultations | consultations/incoming-call.tsx | mutation | import { apiFetch } from "../../src/utils/api"; \| /calls/${sessionId}/reject | candidate from db404ee8 | BLOCKED_OR_CON`
- `18: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:23:| J-017 | consultations | consultations/doctor-profile.tsx | read | no direct call found | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth 401; replay f`
- `19: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:24:| J-018 | pharmacy | pharmacy/product-detail.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /medicines/${id}/details?lang=${currentDbLang()} \| /medicines/${id}/suggest-c`
### backend_consumers_or_contracts
- `1: audit-artifacts/WEB_V2_RADIOLOGY_SERVICES_GET_SLICE_AR.md:5:**Services catalog: UNBLOCKED ومُنفذ من API حي.** تم التحقق الحي من `https://api.nabd.plus/api/v1/radiology/services`، وأعاد 40 خدمة، كما أعاد `/radiology/modalities` قائمة عامة من`
- `3: audit-artifacts/WEB_V2_RADIOLOGY_SERVICES_GET_SLICE_AR.md:19:تفاصيل الخدمة تظهر كحالة `detailBlocked` غير قابلة للنقر، بدلاً من رابط سيعيد 404؛ يعاد فتحها بعد إصلاح backend وإثبات استقرار `GET /radiology/services/{id}`.`
- `11: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:16:| J-010 | consultations | consultations/booking-confirm.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /insurance/companies \| /insurance/companies/${insCompany}/networks`
- `12: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:17:| J-011 | consultations | consultations/booking-pending.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/appointments/${appoint`
- `13: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:18:| J-012 | consultations | consultations/cancel-reschedule.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/doctors/${appointmen`
- `21: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:26:| J-020 | pharmacy | pharmacy/checkout.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /users/me/profile \| /wallet/balance | candidate from db404ee8 | BLOCKED_OR_CONTRACT`
- `22: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:27:| J-021 | pharmacy | pharmacy/payment.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/${orderId} \| /payments/intent/pharmacy/${orderId} | candidate from db404ee8 `
- `23: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:28:| J-022 | pharmacy | pharmacy/order-tracking.tsx | read | import { apiFetch } from '../../src/utils/api'; \| /orders/${orderIdStr}/tracking \| fetch(); | candidate from db404ee8 | BLOCKED_OR_`
- `24: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:29:| J-023 | pharmacy | pharmacy/reorder.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/${orderId} \| /orders/${orderId}/reorder | candidate from db404ee8 | BLOCKED_`
- `27: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:32:| J-026 | pharmacy | pharmacy/chat-with-pharmacist.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/${orderId} \| /chat/threads/booking | candidate from db404ee8 | `
- `28: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:33:| J-027 | pharmacy | pharmacy/order-confirm.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/${orderId} \| /orders/${orderId}/approve-basket | candidate from db404e`
- `29: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:34:| J-028 | pharmacy | pharmacy/broadcast-status.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/bids/request/${orderId} \| /orders/bids/${bidId}/accept | candidate `
### auth_ownership
- `7: audit-artifacts/WEB_V2_DESIGN_SECURITY_AUDIT_AR.md:17:`pnpm test:sandbox` لم يُغلق في بيئة التنفيذ الحالية لأن حسابات sandbox الثلاثة غير موجودة (`NABD_SANDBOX_BASE_URL`, `NABD_SANDBOX_OWNER_EMAIL`, `NABD_SANDBOX_OWNER_PASSWORD`). هذه حالة `
- `8: audit-artifacts/WEB_V2_HOMECARE_SERVICES_GATE_RESULT_AR.md:7:- `pnpm test:sandbox`: BLOCKED بيئيًا عند غياب `NABD_SANDBOX_BASE_URL`, `NABD_SANDBOX_OWNER_EMAIL`, و`NABD_SANDBOX_OWNER_PASSWORD`. لم تُستخدم بيانات بديلة ولم يُتجاوز الاختبار.`
- `9: audit-artifacts/WEB_V2_SPECIALTIES_GATE_RESULT_AR.md:7:- `pnpm test:sandbox`: BLOCKED بيئيًا؛ الاختبار توقف عند غياب `NABD_SANDBOX_BASE_URL`, `NABD_SANDBOX_OWNER_EMAIL`, و`NABD_SANDBOX_OWNER_PASSWORD`. لم يتم تخطيه ولم تُستخدم بيانات بديلة.`
- `11: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:16:| J-010 | consultations | consultations/booking-confirm.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /insurance/companies \| /insurance/companies/${insCompany}/networks`
- `12: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:17:| J-011 | consultations | consultations/booking-pending.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/appointments/${appoint`
- `13: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:18:| J-012 | consultations | consultations/cancel-reschedule.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/doctors/${appointmen`
- `14: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:19:| J-013 | consultations | consultations/video-call.tsx | mutation | import { apiFetch } from "../../src/utils/api"; \| /calls/initiate \| /calls/${sessionId}/join | candidate from db404ee8 | `
- `15: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:20:| J-014 | consultations | consultations/chat-with-doctor.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/doctors/${doctorId} \| /chat/threads/direct | candidate from`
- `16: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:21:| J-015 | consultations | consultations/post-call-rating.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /patient-ux/review | candidate from db404ee8 | BLOCKED_OR_CONTRACT`
- `17: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:22:| J-016 | consultations | consultations/incoming-call.tsx | mutation | import { apiFetch } from "../../src/utils/api"; \| /calls/${sessionId}/reject | candidate from db404ee8 | BLOCKED_OR_CON`
- `18: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:23:| J-017 | consultations | consultations/doctor-profile.tsx | read | no direct call found | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth 401; replay f`
- `19: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:24:| J-018 | pharmacy | pharmacy/product-detail.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /medicines/${id}/details?lang=${currentDbLang()} \| /medicines/${id}/suggest-c`
### state_transitions
- `6: audit-artifacts/WEB_V2_DOCTOR_DETAIL_GET_SLICE_AR.md:32:Doctor Detail أصبح **implemented / verified GET**. Booking actions وslot selection تبقى **Deferred pending their own verified contract slice**، وفق Contract-First وZero-Mock policy.`
- `12: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:17:| J-011 | consultations | consultations/booking-pending.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/appointments/${appoint`
- `13: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:18:| J-012 | consultations | consultations/cancel-reschedule.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/doctors/${appointmen`
- `29: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:34:| J-028 | pharmacy | pharmacy/broadcast-status.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/bids/request/${orderId} \| /orders/bids/${bidId}/accept | candidate `
- `34: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:53:| J-047 | family | family/permission-request.tsx | mutation | /family/permissions/pending \| /family/permissions/respond/${requestInfo._id \|\| requestInfo.id} | candidate from db404ee8 | BLO`
- `39: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:63:| J-057 | nutrition | nutrition/hub.tsx | read | import { apiFetch } from '../../src/utils/api'; \| error | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; una`
- `44: audit-artifacts/WEB_V2_PHASE1_RECONCILIATION_AR.md:38:عمليات OTP bridge، Cart item mutations/checkout، booking mutations، reminders/vitals mutations الجديدة، family invite/join/permissions، chat message/read/rt-token، bookmark/settings/sess`
- `45: audit-artifacts/PHASE8_MUTATION_CONTRACT_AUDIT_AR.md:5:لذلك بقيت العمليات التالية Deferred: إضافة عناصر السلة، إنشاء/إرسال طلب pharmacy، submit claim، إنشاء insurance request، دفع copay، cancel/resubmit/appeal، حجز/إلغاء/إعادة جدولة booking`
- `49: audit-artifacts/PHASE4_REMAINING_SURFACES_DEFERRED_AR.md:5:الأسطح المتبقية التي تحتوي mutations أو تكاملات غير مؤهلة للفتح browser-facing هي: `health/vitals-log` (POST/PATCH/DELETE)، `health/medication-reminder-add` وعمليات reminder logging`
- `53: audit-artifacts/PHASE4_CHAT_DETAIL_READONLY_AR.md:10:تمت إضافة UUID validation وGET-only allowlist ومسار server-side session. كل POST الخاصة بـsend/read/delivered/edit/delete/reactions والـuploads وrealtime بقيت Deferred؛ لذلك لا يوجد زر إر`
- `57: audit-artifacts/PHASE1_CONTRACT_PACK_DECISION_AR.md:36:لن ننفذ cart add/update/delete، orders create/cancel، checkout، upload، payment، wishlist mutations أو address mutations في هذه المرحلة، رغم وجود أسماء بعض المسارات، لأن المواصفة لا تعط`
- `58: audit-artifacts/NABDAH_WEB_PARITY_PHASE8_HANDOVER_AR.md:15:| Chat | بقي thread metadata فقط؛ فتح المحادثة والإرسال والمرفقات وread/delivery state موثقة كـblocked. |`
### payment_insurance_relevance
- `11: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:16:| J-010 | consultations | consultations/booking-confirm.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /insurance/companies \| /insurance/companies/${insCompany}/networks`
- `21: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:26:| J-020 | pharmacy | pharmacy/checkout.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /users/me/profile \| /wallet/balance | candidate from db404ee8 | BLOCKED_OR_CONTRACT`
- `22: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:27:| J-021 | pharmacy | pharmacy/payment.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/${orderId} \| /payments/intent/pharmacy/${orderId} | candidate from db404ee8 `
- `37: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:61:| J-055 | insurance | insurance/hub.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /users/me/insurance \| /insurance/claims | candidate from db404ee8 | BLOCKED_OR_CONTRAC`
- `38: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:62:| J-056 | insurance | insurance/add-policy.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /insurance/companies \| /insurance/ocr-extract | candidate from db404ee8 | BLOCK`
- `41: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:65:| J-059 | wallet | wallet/hub.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /wallet/cards | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 40`
- `42: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:66:| J-060 | wallet | wallet/topup.tsx | mutation | import { apiFetch } from "../../src/utils/api"; \| /wallet/balance \| /wallet/topup | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | o`
- `45: audit-artifacts/PHASE8_MUTATION_CONTRACT_AUDIT_AR.md:5:لذلك بقيت العمليات التالية Deferred: إضافة عناصر السلة، إنشاء/إرسال طلب pharmacy، submit claim، إنشاء insurance request، دفع copay، cancel/resubmit/appeal، حجز/إلغاء/إعادة جدولة booking`
- `49: audit-artifacts/PHASE4_REMAINING_SURFACES_DEFERRED_AR.md:5:الأسطح المتبقية التي تحتوي mutations أو تكاملات غير مؤهلة للفتح browser-facing هي: `health/vitals-log` (POST/PATCH/DELETE)، `health/medication-reminder-add` وعمليات reminder logging`
- `57: audit-artifacts/PHASE1_CONTRACT_PACK_DECISION_AR.md:36:لن ننفذ cart add/update/delete، orders create/cancel، checkout، upload، payment، wishlist mutations أو address mutations في هذه المرحلة، رغم وجود أسماء بعض المسارات، لأن المواصفة لا تعط`
- `59: audit-artifacts/NABDAH_WEB_PARITY_PHASE8_HANDOVER_AR.md:42:تبقى عمليات pharmacy cart/checkout/payment/prescription upload، home-care booking/payment/tracking، diagnostics reports/documents/pricing، chat realtime/send/read state، وhealth sco`
- `65: audit-artifacts/PROVIDER_EXPO_BUILD_BLOCKER_20260818.md:13:**BLOCKED_BUILD_SOURCE_SNAPSHOT**. This is not a runtime API failure and not fixed by changing Expo configuration. Creating a guessed App entrypoint would risk discarding the author`
### error_empty_loading_retry_cancel
- `6: audit-artifacts/WEB_V2_DOCTOR_DETAIL_GET_SLICE_AR.md:32:Doctor Detail أصبح **implemented / verified GET**. Booking actions وslot selection تبقى **Deferred pending their own verified contract slice**، وفق Contract-First وZero-Mock policy.`
- `12: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:17:| J-011 | consultations | consultations/booking-pending.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/appointments/${appoint`
- `13: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:18:| J-012 | consultations | consultations/cancel-reschedule.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/doctors/${appointmen`
- `34: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:53:| J-047 | family | family/permission-request.tsx | mutation | /family/permissions/pending \| /family/permissions/respond/${requestInfo._id \|\| requestInfo.id} | candidate from db404ee8 | BLO`
- `39: audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md:63:| J-057 | nutrition | nutrition/hub.tsx | read | import { apiFetch } from '../../src/utils/api'; \| error | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; una`
- `44: audit-artifacts/WEB_V2_PHASE1_RECONCILIATION_AR.md:38:عمليات OTP bridge، Cart item mutations/checkout، booking mutations، reminders/vitals mutations الجديدة، family invite/join/permissions، chat message/read/rt-token، bookmark/settings/sess`
- `45: audit-artifacts/PHASE8_MUTATION_CONTRACT_AUDIT_AR.md:5:لذلك بقيت العمليات التالية Deferred: إضافة عناصر السلة، إنشاء/إرسال طلب pharmacy، submit claim، إنشاء insurance request، دفع copay، cancel/resubmit/appeal، حجز/إلغاء/إعادة جدولة booking`
- `57: audit-artifacts/PHASE1_CONTRACT_PACK_DECISION_AR.md:36:لن ننفذ cart add/update/delete، orders create/cancel، checkout، upload، payment، wishlist mutations أو address mutations في هذه المرحلة، رغم وجود أسماء بعض المسارات، لأن المواصفة لا تعط`
- `74: audit-artifacts/PHASE6_STAGING_E2E_MATRIX_20260817.md:17:| Payment intent/idempotency | FAIL/BLOCKED | intent على order pending أعاد `500` مرتين؛ لا يمكن إثبات idempotency حتى تُصلح staging payment gateway/config |`
- `76: audit-artifacts/PHASE5_REVALIDATION_SUMMARY_20260818.md:9:Pharmacy lifecycle is blocked because the sandbox pharmacy has `started:false`, an empty broadcast list, and no proven ownership of the real pending order. Laboratory lifecycle is bl`
- `85: audit-artifacts/NABDAH_PHASE9_RELEASE_CANDIDATE_AND_ROLLBACK_PLAN_20260819.md:25:| Contract approval | **BLOCKED** — SOS, QR, consent and location remain fail-closed pending owner legal/product approval. |`
- `88: audit-artifacts/NABDAH_PHASE9_RELEASE_CANDIDATE_AND_ROLLBACK_PLAN_20260819.md:28:| Devices/stores | **BLOCKED** — Android/iOS signed build, device-farm and physical-device evidence remain pending. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
