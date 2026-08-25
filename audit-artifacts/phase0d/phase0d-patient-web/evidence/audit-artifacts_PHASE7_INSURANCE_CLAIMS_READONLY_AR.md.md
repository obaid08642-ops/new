# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE7_INSURANCE_CLAIMS_READONLY_AR.md`
- **Member SHA-256:** `9bc6b973f1872d51216d6505581a75dc608f63d60e025ce572de6ebb3931f618`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: تمت إضافة surface Claims إلى صفحة Insurance اعتمادًا على Backend GET الحقيقي `/insurance/claims`، الذي يقرأ claims المملوكة للمريض عبر `patient_id` من الجلسة. لم تُنقل عمليات `POST /claims/submit` أو upload أو appeal أو payment أو refund.`
- `11: حدود صادقة: لا يوجد في هذه slice submit claim أو document upload أو rejection reason أو amount breakdown أو refund/payment action.`
### backend_consumers_or_contracts
- `3: تمت إضافة surface Claims إلى صفحة Insurance اعتمادًا على Backend GET الحقيقي `/insurance/claims`، الذي يقرأ claims المملوكة للمريض عبر `patient_id` من الجلسة. لم تُنقل عمليات `POST /claims/submit` أو upload أو appeal أو payment أو refund.`
- `9: التحقق: Claims/Insurance tests نجحت، full Vitest: 65 files passed و14 skipped، 119 tests passed و23 skipped، truthful gate على 195 production files، TypeScript، production build، وdiff check.`
### auth_ownership
- `7: تمت إضافة المسار إلى BFF GET-only allowlist، مع server wrapper يستخدم httpOnly session access داخليًا. لا يُعرض token في المتصفح.`
### state_transitions
- `3: تمت إضافة surface Claims إلى صفحة Insurance اعتمادًا على Backend GET الحقيقي `/insurance/claims`، الذي يقرأ claims المملوكة للمريض عبر `patient_id` من الجلسة. لم تُنقل عمليات `POST /claims/submit` أو upload أو appeal أو payment أو refund.`
- `5: الـparser يسمح فقط بـ `id`, `service`, `status`, و`date`. يتم إسقاط `patient_id`, `amount`, `covered`, documents وأي حقول إضافية. الواجهة تعرض حالة claim وخدمته وتاريخه فقط، مع ترجمة لكل اللغات الست.`
- `11: حدود صادقة: لا يوجد في هذه slice submit claim أو document upload أو rejection reason أو amount breakdown أو refund/payment action.`
### payment_insurance_relevance
- `1: # Phase 7 — Insurance Claims Read-only`
- `3: تمت إضافة surface Claims إلى صفحة Insurance اعتمادًا على Backend GET الحقيقي `/insurance/claims`، الذي يقرأ claims المملوكة للمريض عبر `patient_id` من الجلسة. لم تُنقل عمليات `POST /claims/submit` أو upload أو appeal أو payment أو refund.`
- `9: التحقق: Claims/Insurance tests نجحت، full Vitest: 65 files passed و14 skipped، 119 tests passed و23 skipped، truthful gate على 195 production files، TypeScript، production build، وdiff check.`
- `11: حدود صادقة: لا يوجد في هذه slice submit claim أو document upload أو rejection reason أو amount breakdown أو refund/payment action.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
