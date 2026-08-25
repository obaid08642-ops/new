# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_WAVE2_DIAGNOSTICS_BOUNDARY_AR.md`
- **Member SHA-256:** `a33a4f2a87365cc767bf0fff3260a44cba589e9878d0800ccdcc762b03a7713d`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: - قراءة الحجوزات الحالية من عقدي bookings.`
- `12: - رابط تفاصيل booking الموجود فعليًا.`
- `16: لم أضف البحث أو الأسعار أو cart أو checkout أو insurance upload أو sample tracking أو result mutations. هذه الأفعال ظاهرة في الموبايل، لكنها تحتاج request/response schemas، ملكية للمريض، صلاحيات، حماية ملفات، وتحققًا من حالات الانتقال والدف`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: الموبايل يملك Hub واسعًا يشمل المختبرات والأشعة والبحث والمرشحات واختيار home/clinic والعنوان والتأمين والباقات والخدمات والسلة والدفع وتتبع العينات والنتائج. Web الحالي يثبت فقط قراءة حجوزات labs وradiology عبر server-only boundaries وعرض `
- `11: - حالات 401/403/404/error/empty.`
### payment_insurance_relevance
- `16: لم أضف البحث أو الأسعار أو cart أو checkout أو insurance upload أو sample tracking أو result mutations. هذه الأفعال ظاهرة في الموبايل، لكنها تحتاج request/response schemas، ملكية للمريض، صلاحيات، حماية ملفات، وتحققًا من حالات الانتقال والدف`
### error_empty_loading_retry_cancel
- `5: الموبايل يملك Hub واسعًا يشمل المختبرات والأشعة والبحث والمرشحات واختيار home/clinic والعنوان والتأمين والباقات والخدمات والسلة والدفع وتتبع العينات والنتائج. Web الحالي يثبت فقط قراءة حجوزات labs وradiology عبر server-only boundaries وعرض `
- `11: - حالات 401/403/404/error/empty.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
