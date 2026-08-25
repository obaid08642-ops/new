# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE4_CHAT_DETAIL_READONLY_AR.md`
- **Member SHA-256:** `81ad2fbf5a01bca13254d2a0f9498be12b1f17e22375234ae79d4ba9f292cd5d`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: تمت إضافة UUID validation وGET-only allowlist ومسار server-side session. كل POST الخاصة بـsend/read/delivered/edit/delete/reactions والـuploads وrealtime بقيت Deferred؛ لذلك لا يوجد زر إرسال أو إجراء يوهم باكتمال chat.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `10: تمت إضافة UUID validation وGET-only allowlist ومسار server-side session. كل POST الخاصة بـsend/read/delivered/edit/delete/reactions والـuploads وrealtime بقيت Deferred؛ لذلك لا يوجد زر إرسال أو إجراء يوهم باكتمال chat.`
### state_transitions
- `8: المصدر يثبت `assertParticipant` داخل `getThread` و`getMessages`. Web يعرض نوع المحادثة وتوقيت/نوع/حالة نشاط الرسائل فقط، ويسقط body وsender IDs وparticipant IDs وattachment URLs وreactions وread/delivered maps.`
- `10: تمت إضافة UUID validation وGET-only allowlist ومسار server-side session. كل POST الخاصة بـsend/read/delivered/edit/delete/reactions والـuploads وrealtime بقيت Deferred؛ لذلك لا يوجد زر إرسال أو إجراء يوهم باكتمال chat.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
