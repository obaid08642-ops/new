# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/PHASE5_HEALTH_PROFILE_FAMILY_CHAT_REVIEW_AR.md`
- **Member SHA-256:** `fd01216bec5999cb425740d484a5e97289435c403a9713b6d941309eb30796cb`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: تمت تجربة مسارات القراءة دون جلسة وببيانات لا تكشف حساباً. كل المسارات المملوكة أعادت 401، وهو دليل أن route موجود ومحمي، بينما المسار القديم `/notifications/mine` أعاد 404. Web wrapper يستخدم `/notifications` الصحيح، لذلك لا يوجد اعتماد عل`
- `18: | Bookmarks | `/articles/bookmarks/mine` | 401 |`
### backend_consumers_or_contracts
- `1: # Phase 5 — Health/Profile/Insurance/Reports/Family/Chat/Notifications`
- `5: تمت تجربة مسارات القراءة دون جلسة وببيانات لا تكشف حساباً. كل المسارات المملوكة أعادت 401، وهو دليل أن route موجود ومحمي، بينما المسار القديم `/notifications/mine` أعاد 404. Web wrapper يستخدم `/notifications` الصحيح، لذلك لا يوجد اعتماد عل`
- `9: | Profile | `/users/me/profile`, `/users/me/insurance` | 401 |`
- `14: | Insurance | `/insurance/my-policy`, `/insurance/benefits-summary`, `/insurance/claims` | 401 |`
- `16: | Notifications | `/notifications` | 401 |`
- `17: | Notifications legacy candidate | `/notifications/mine` | 404 |`
### auth_ownership
- `10: | Privacy/Security | `/users/me/privacy-settings`, `/users/me/security-settings`, `/users/me/sessions` | 401 |`
- `25: Web يملك صفحات قراءة لعدد من هذه المجالات وserver wrappers وparsers محدودة. أما Mobile فيحتوي subflows إضافية كثيرة، خصوصاً تعديل الملف، permissions والأسرة، إنشاء القياسات والتذكيرات، رسائل Chat، الإشعارات ذات الإجراءات، مطالبات التأمين، و`
- `27: تحتاج كل mutation إلى method/path حي، DTO مضبوط، httpOnly/BFF boundary، owner/stranger/unauth، idempotency عند الإنشاء أو الدفع، وحالات optimistic failure صادقة. لا تُفعّل أي كتابة من المتصفح عبر allowlist القراءة العامة.`
- `34: الـSandbox owner/stranger والـmutation flows ما زالت مؤجلة حتى توفير الحسابات الرسمية؛ لا يتم استخدام بيانات حقيقية أو mock production data.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `1: # Phase 5 — Health/Profile/Insurance/Reports/Family/Chat/Notifications`
- `9: | Profile | `/users/me/profile`, `/users/me/insurance` | 401 |`
- `14: | Insurance | `/insurance/my-policy`, `/insurance/benefits-summary`, `/insurance/claims` | 401 |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
