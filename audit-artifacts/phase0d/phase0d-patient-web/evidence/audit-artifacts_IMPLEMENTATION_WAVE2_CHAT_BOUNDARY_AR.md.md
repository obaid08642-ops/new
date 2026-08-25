# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_WAVE2_CHAT_BOUNDARY_AR.md`
- **Member SHA-256:** `4ab13674fe8427b2c88c07db75b6d90e906aaec68ea7eb7a43842a534fbfce96`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: بقيت Chat في Web read-only. لم تتم إضافة open-thread route أو send/read mutations أو fallback content. أي توسيع لاحق يجب أن يثبت contract مستقلًا لكل نوع محادثة مع اختبارات authorization وno-token-in-browser.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: شاشات الموبايل تشمل doctor chat وfamily chat وpharmacist chat وsupport chat وAI chat. فتحها أو إرسال رسالة يتطلب عقودًا مختلفة للـroom ownership، participant authorization، realtime transport، attachment protection، read/delivery state، وre`
- `13: بقيت Chat في Web read-only. لم تتم إضافة open-thread route أو send/read mutations أو fallback content. أي توسيع لاحق يجب أن يثبت contract مستقلًا لكل نوع محادثة مع اختبارات authorization وno-token-in-browser.`
### state_transitions
- `9: شاشات الموبايل تشمل doctor chat وfamily chat وpharmacist chat وsupport chat وAI chat. فتحها أو إرسال رسالة يتطلب عقودًا مختلفة للـroom ownership، participant authorization، realtime transport، attachment protection، read/delivery state، وre`
### payment_insurance_relevance
- `5: Web Chat يعرض thread metadata محدودًا: النوع وآخر نشاط فقط، من خلال server-only patient boundary. لا تظهر أسماء المشاركين، معاينات الرسائل، المرفقات، أو payload links.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
