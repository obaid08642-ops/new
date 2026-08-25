# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE16_NURSING_AUTHORIZATION_P0_REMEDIATION_20260819.md`
- **Member SHA-256:** `d5d7143ccb435debe41ab09ddb472701f3f2742a89fa47d4f3c7f5fe8aaf37a6`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `33: تجددت رموز Patient الأصلية عبر `POST /auth/refresh` بعد أن أثبتت claims أنها كانت منتهية، ثم نجح اختبار BOLA لمرجع Unified Booking مملوك: owner **200** وforeign patient **404**. هذا يثبت ذلك المورد والمسار فقط، وليس قبولاً عاماً لكل BOLA أو`
### backend_consumers_or_contracts
- `10: استخدم اختبار الاكتشاف قبل الإصلاح حسابات Sandbox المعتمدة فقط. دخل Doctor Sandbox بنجاح، وأكد `GET /provider/auth/me` أن نوعه `doctor` وحالته `approved`. **قبل الإصلاح** أعاد `GET /nursing/visits` **HTTP 200** للطبيب، مع أن حساب Nursing ال`
- `14: كانت `NursingController.isNursingProvider` تقبل role العام `provider`. بما أن JWT جميع المزودين يحمل role=`provider` مع `provider_type` محدد، أصبح كل مزود معتمد، ومنه `doctor`، مؤهلاً لمسار التمريض قبل فحص ملكية الزيارة. هذا يعاكس قيد contr`
- `28: | تحقق Sandbox بعد النشر: Doctor | PASS — `GET /nursing/visits` أعاد **403** |`
- `29: | تحقق Sandbox بعد النشر: Nursing | PASS — `GET /nursing/visits` أعاد **200** |`
- `33: تجددت رموز Patient الأصلية عبر `POST /auth/refresh` بعد أن أثبتت claims أنها كانت منتهية، ثم نجح اختبار BOLA لمرجع Unified Booking مملوك: owner **200** وforeign patient **404**. هذا يثبت ذلك المورد والمسار فقط، وليس قبولاً عاماً لكل BOLA أو`
### auth_ownership
- `14: كانت `NursingController.isNursingProvider` تقبل role العام `provider`. بما أن JWT جميع المزودين يحمل role=`provider` مع `provider_type` محدد، أصبح كل مزود معتمد، ومنه `doctor`، مؤهلاً لمسار التمريض قبل فحص ملكية الزيارة. هذا يعاكس قيد contr`
- `18: تم حذف `provider` العام من قائمة roles المقبولة. تظل الأدوار الصريحة `nurse` و`nursing` و`home_care` و`hospital` وأنواع المزود المطابقة وحدها مقبولة. **هذه المعالجة المحددة لا تغير schemas أو بيانات أو migrations أو endpoint contracts لمسار`
- `33: تجددت رموز Patient الأصلية عبر `POST /auth/refresh` بعد أن أثبتت claims أنها كانت منتهية، ثم نجح اختبار BOLA لمرجع Unified Booking مملوك: owner **200** وforeign patient **404**. هذا يثبت ذلك المورد والمسار فقط، وليس قبولاً عاماً لكل BOLA أو`
### state_transitions
- `10: استخدم اختبار الاكتشاف قبل الإصلاح حسابات Sandbox المعتمدة فقط. دخل Doctor Sandbox بنجاح، وأكد `GET /provider/auth/me` أن نوعه `doctor` وحالته `approved`. **قبل الإصلاح** أعاد `GET /nursing/visits` **HTTP 200** للطبيب، مع أن حساب Nursing ال`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
