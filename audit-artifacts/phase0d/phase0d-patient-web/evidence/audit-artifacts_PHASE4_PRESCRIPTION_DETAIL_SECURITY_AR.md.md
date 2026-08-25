# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE4_PRESCRIPTION_DETAIL_SECURITY_AR.md`
- **Member SHA-256:** `18607ccf541b29f7c831526b6df6909e99d352fcc0967a94e543210bb3b34cc4`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: القرار الصادق: detail route موجود ومحمٍ بـserver-side session وUUID validation، لكنه لا يُكتشف من القائمة حاليًا حتى لا يتم تسريب identifier في markup. لا توجد query/action links أو tokens في الصفحة العامة.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: محاولة توصيل قائمة prescriptions إلى `/prescriptions/[prescriptionId]` كشفت regression في SSR owner-isolation: الاختبار يمنع ظهور prescriptionId في browser HTML، لذلك تم التراجع عن جعل cards روابط مباشرة.`
- `5: القرار الصادق: detail route موجود ومحمٍ بـserver-side session وUUID validation، لكنه لا يُكتشف من القائمة حاليًا حتى لا يتم تسريب identifier في markup. لا توجد query/action links أو tokens في الصفحة العامة.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `3: محاولة توصيل قائمة prescriptions إلى `/prescriptions/[prescriptionId]` كشفت regression في SSR owner-isolation: الاختبار يمنع ظهور prescriptionId في browser HTML، لذلك تم التراجع عن جعل cards روابط مباشرة.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
