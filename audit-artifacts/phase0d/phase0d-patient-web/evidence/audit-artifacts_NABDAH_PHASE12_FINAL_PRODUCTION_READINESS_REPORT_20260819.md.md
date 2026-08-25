# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE12_FINAL_PRODUCTION_READINESS_REPORT_20260819.md`
- **Member SHA-256:** `3ce14d0be8f7a0577364da2dc801ab43a39b2427ec99b8ff6a40d6de49ee69cf`
- **Line count:** 107
- **Read range:** `1-107`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `60: | المدفوعات وMoyasar | **محظور** | تفعيل الحساب الحي واختبار webhook/idempotency/refund لم يتم. |`
- `64: | التوطين الستّي وRTL وإمكانية الوصول والتصميم | **غير مكتمل بشرياً** | يلزم مراجعة screen-by-screen بكل لغة وجهاز. |`
- `74: 4. يفعّل المالك Moyasar تجارياً، ثم يسمح باختبار sandbox مالي محدود مع before/after للطلب والledger، والتحقق من webhook signature وidempotency وrefund والـcleanup.`
- `76: 6. تُنتج Android/iOS signed builds وتنفذ قائمة الهاتفين الحقيقيين: push، deep links، CallKeep/full-screen intent، LiveKit، GPS، background/terminated-app وRTL.`
- `77: 7. تنفذ مراجعة بشرية قابلة للتدقيق لكل الشاشة/زر/مسار وباللغات العربية والإنجليزية والأردية والهندية والبنغالية والفلبينية، مع contrast وkeyboard/screen-reader وRTL/LTR.`
### backend_consumers_or_contracts
- `62: | دورات الخدمة end-to-end | **غير مكتملة** | لا يوجد برهان تشغيل كامل لكل pharmacy/consultation/lab/radiology/nursing/hospital ومزود. |`
### auth_ownership
- `19: | **Bounded sandbox authorization: PASS** | الملكية وحدود الدور المثبتة في الموجتين 1 و2 سليمة للموارد والطلبات المحددة فقط. |`
- `35: | 9 | بوابات البناء وlock integrity | نجحت البوابات الكاملة الموثقة للحزم الأربع؛ Backend/Patient/Provider/Admin. [11] | **PASS بوابة** مع استمرار موانع التدقيق والتشغيل. |`
- `36: | 10 | تدقيق التبعيات | Admin وصل إلى صفر findings؛ Backend/Patient/Provider بقيت فيها مخاطر high تحتاج migrations محكومة. [12] | **BLOCKED** للإصدار. |`
- `48: | Backend | `2b47f9e7f5c289d3d35d9b211fe0de07f931aa39c08c0006c90cc4e08bdcfac3` | **PASS** | يتضمن علاج authorization لتفاصيل الوصفات. [1] |`
- `49: | Admin dashboard | `fafc08e48f9063dcb45775e86b3828e333d32cc46fbefaaae7472f8813f4cad2` | **PASS** | لا تغيير مصدري في Phase 11. |`
- `56: | بوابات الحزم وبناء الواجهات | **اجتاز في النطاق الموثق** | Phase 9 يثبت بوابات Backend وPatient وProvider وAdmin، لكن لا يثبت الأجهزة أو المتاجر. [11] |`
- `57: | Admin dependency audit | **اجتاز** | صفر findings في Phase 10. [12] |`
- `84: | Backend authorization candidate | قبول/رفض نشر الالتزامين `85b6ca2` و`ca34575` ضمن فرع المصالحة مع rollback. | لا ينشر إلى الإنتاج ولا يدمج إلى `main`. |`
- `96: [1]: NABDAH_PHASE11_PRESCRIPTIONS_AUTHORIZATION_REMEDIATION_20260819.md "Phase 11 prescription detail authorization remediation"`
- `97: [2]: NABDAH_PHASE11_SANDBOX_READONLY_AUTHORIZATION_WAVE1_20260819.md "Phase 11 sandbox read-only authorization wave 1"`
- `98: [3]: NABDAH_PHASE11_SANDBOX_READONLY_AUTHORIZATION_WAVE2_20260819.md "Phase 11 sandbox read-only authorization wave 2"`
- `101: [6]: NABDAH_PHASE4_FINAL_CLOSURE_DOUBLE_CHECK_20260819.md "Phase 4 admin final closure double check"`
### state_transitions
- `20: | **Prescription fix: SOURCE PASS / LIVE PENDING** | العلاج والأرشيف موجودان على الفرع، لكن ما زال يلزم نشر معتمد وإثبات BOLA حي. |`
- `60: | المدفوعات وMoyasar | **محظور** | تفعيل الحساب الحي واختبار webhook/idempotency/refund لم يتم. |`
- `72: 2. بعد النشر، يُنفّذ اختبار sandbox فعلي لوصفة تخص Patient1 ثم محاولة Patient2 للقراءة، والنتيجة المقبولة `403` أو `404` بلا تسرب؛ يحفظ status فقط ولا يحفظ معرفات/محتوى سريري.`
- `74: 4. يفعّل المالك Moyasar تجارياً، ثم يسمح باختبار sandbox مالي محدود مع before/after للطلب والledger، والتحقق من webhook signature وidempotency وrefund والـcleanup.`
### payment_insurance_relevance
- `60: | المدفوعات وMoyasar | **محظور** | تفعيل الحساب الحي واختبار webhook/idempotency/refund لم يتم. |`
- `74: 4. يفعّل المالك Moyasar تجارياً، ثم يسمح باختبار sandbox مالي محدود مع before/after للطلب والledger، والتحقق من webhook signature وidempotency وrefund والـcleanup.`
- `85: | دفع Moyasar | تفعيل تجاري مستقل، ثم تفويض اختبار sandbox محدود. | لا يحاكي الدفع ولا يتجاوز رفض البوابة. |`
### error_empty_loading_retry_cancel
- `20: | **Prescription fix: SOURCE PASS / LIVE PENDING** | العلاج والأرشيف موجودان على الفرع، لكن ما زال يلزم نشر معتمد وإثبات BOLA حي. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
