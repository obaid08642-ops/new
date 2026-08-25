# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/148_phase5_care_journeys_completion_20260822.md`
- **Member SHA-256:** `098a8f4eecbd3f358da844792ece53d6528ee215e3877a97194af4bd07edd688`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: | `/[locale]/diagnostics/[domain]/[bookingId]` | معاينة حية محلية لحجز Sandbox | لا تقارير أو مستندات أو تسعير غير متعاقد عليها. |`
### backend_consumers_or_contracts
- `13: | `/[locale]/appointments` | قائمة وتبويبات وحالة فراغ متحققة محلياً | مواعيد القراءة فقط من العقد المنشور. |`
- `14: | `/[locale]/appointments/[appointmentId]` | سطح تفاصيل محسن ومختبر تصميمياً | لا تعديل أو إلغاء أو إعادة جدولة لعدم نشر العقد. |`
- `17: | `/[locale]/home-care` | شاشة قائمة وحالة فراغ متحققة محلياً | لا عنوان أو تتبع أو تسعير أو إجراء حجز غير متعاقد عليه. |`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
