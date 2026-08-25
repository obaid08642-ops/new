# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_OPENAPI_INSURANCE_CONTRACT_HARDENING_20260820.md`
- **Member SHA-256:** `92ff03d5c47fbeb449cecb926cb4684c92ce453816b0d804f4fba6dd1c6daa00`
- **Line count:** 78
- **Read range:** `1-78`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: المسارات الثلاثة لا تتبادل المعنى أو شكل payload، ولذلك لم تُدمج في route واحد قد يكسر العملاء. بدلاً من ذلك، أصبحت موثقة في OpenAPI بشكل صريح؛ ووُسم المسار التراثي `GET /user/insurance` على أنه deprecated مع replacement واضح. التسجيل الفعل`
- `48: ظهر أثناء suite تحذير Mongoose لفهرس `booking_id` المكرر؛ لم يُحذف ضمن هذه الدفعة لأن ذلك موضوع Phase 5 ويتطلب migration idempotent وخطة rollback قبل أي تدخل إنتاجي.`
- `58: هذه الدفعة لا تغيّر نموذج البيانات أو منطق مطالبات التأمين أو صلاحيات guards أو حالة `verified`، عدا جعل route legacy الموجود في المصدر مسجلاً فعلياً للتوافق. لم يُنشر backend، ولم تُفعّل Swagger في production، ولم تُستخدم حسابات أو بيانات `
### backend_consumers_or_contracts
- `10: المسارات الثلاثة لا تتبادل المعنى أو شكل payload، ولذلك لم تُدمج في route واحد قد يكسر العملاء. بدلاً من ذلك، أصبحت موثقة في OpenAPI بشكل صريح؛ ووُسم المسار التراثي `GET /user/insurance` على أنه deprecated مع replacement واضح. التسجيل الفعل`
- `14: | `GET /user/insurance` | **Deprecated؛ متاح للتوافق** | `{ policies: insurance_policies[] }` | عملاء legacy فقط؛ الانتقال إلى canonical أو active projection بحسب الحاجة. |`
- `15: | `GET /users/me/insurance` | **Canonical قابل للتحرير** | `insurance \| null` | قراءة سجل تأمين المريض القابل للتحرير. |`
- `16: | `POST /users/me/insurance` | **Canonical قابل للتحرير** | `insurance` مع `verified: false` | تحديث بيانات المريض؛ لا يمكن للعميل توثيق التغطية ذاتياً. |`
- `17: | `GET /insurance/active` | **Active projection** | `{ policies: insurance_details[] }`، بطول صفر أو واحد | استهلاك التغطية النشطة، لا تحرير السجل الأساسي. |`
- `18: | `GET /insurance/companies` | **كتالوج مصدر الحقيقة** | شركات نشطة مع `plans` مرتبة | التطبيقات تقرأ الكتالوج من backend ولا تضع قائمة شركات ثابتة. |`
- `24: > `https://api.nabd.plus/api/v1``
- `28: بسبب `app.setGlobalPrefix('api')` وURI versioning، يولّد Nest paths داخلية تبدأ بـ`/api/v1`. قبل تقديم الوثيقة، تزال هذه البادئة فقط من مفاتيح paths كي لا تتضاعف مع server URL الذي يحتوي بالفعل `/api/v1`. اختبار العقد يثبت أن document النات`
- `46: | تحقق Swagger المنشور (passive) | 404 متوقع | `https://api.nabd.plus/api/docs-json` غير متاح بينما Swagger production غير مفعّل؛ لم يُغير ذلك. |`
- `67: | `backend/src/modules/users/users.insurance.controller.ts` | canonical GET/POST schemas/auth/errors. |`
- `69: | `backend/src/modules/insurance/insurance.controller.ts` | active/catalog contracts/auth/errors. |`
- `70: | `backend/src/contracts/insurance-openapi.contract.spec.ts` | regression مستقل للمستند الناتج. |`
### auth_ownership
- `26: تستخدم جميع العمليات الخمس scheme واضحاً باسم `access-token` من نوع HTTP Bearer/JWT. لا تعلن الوثيقة OAuth scopes مصطنعة: هذا الـAPI لا يمرر scopes OAuth داخل JWT، بينما تفرض الحماية role وملكية السجل على مستوى endpoint. وصف كل operation يص`
- `34: | JWT | `access-token` على مستوى كل operation؛ لا security array مكرر. |`
### state_transitions
- `66: | `backend/src/modules/users/user.insurance.controller.ts` | legacy deprecation وschemas/errors. |`
- `67: | `backend/src/modules/users/users.insurance.controller.ts` | canonical GET/POST schemas/auth/errors. |`
- `69: | `backend/src/modules/insurance/insurance.controller.ts` | active/catalog contracts/auth/errors. |`
### payment_insurance_relevance
- `10: المسارات الثلاثة لا تتبادل المعنى أو شكل payload، ولذلك لم تُدمج في route واحد قد يكسر العملاء. بدلاً من ذلك، أصبحت موثقة في OpenAPI بشكل صريح؛ ووُسم المسار التراثي `GET /user/insurance` على أنه deprecated مع replacement واضح. التسجيل الفعل`
- `14: | `GET /user/insurance` | **Deprecated؛ متاح للتوافق** | `{ policies: insurance_policies[] }` | عملاء legacy فقط؛ الانتقال إلى canonical أو active projection بحسب الحاجة. |`
- `15: | `GET /users/me/insurance` | **Canonical قابل للتحرير** | `insurance \| null` | قراءة سجل تأمين المريض القابل للتحرير. |`
- `16: | `POST /users/me/insurance` | **Canonical قابل للتحرير** | `insurance` مع `verified: false` | تحديث بيانات المريض؛ لا يمكن للعميل توثيق التغطية ذاتياً. |`
- `17: | `GET /insurance/active` | **Active projection** | `{ policies: insurance_details[] }`، بطول صفر أو واحد | استهلاك التغطية النشطة، لا تحرير السجل الأساسي. |`
- `18: | `GET /insurance/companies` | **كتالوج مصدر الحقيقة** | شركات نشطة مع `plans` مرتبة | التطبيقات تقرأ الكتالوج من backend ولا تضع قائمة شركات ثابتة. |`
- `33: | Legacy visibility | `deprecated: true`، وشرح replacement والفرق في payload. |`
- `35: | Response schemas | schemas لـlegacy policies وcanonical insurance وactive projection وcompany plans. |`
- `43: | OpenAPI contract regression | PASS | 4 اختبارات، منها server/JWT وlegacy deprecation وdistinct payloads وتسجيل Controller. |`
- `52: أعيد تغليف `nabdah-backend.zip` من المصدر المتحقق منه بعد استبعاد `node_modules` و`dist` و`coverage` و`.git` وملفات البيئة. اجتاز ZIP integrity، ومقارنة archive القديم/الجديد حصرت الفرق في ملفات OpenAPI الخمسة وملفي config/test الجديدين فقط`
- `66: | `backend/src/modules/users/user.insurance.controller.ts` | legacy deprecation وschemas/errors. |`
- `67: | `backend/src/modules/users/users.insurance.controller.ts` | canonical GET/POST schemas/auth/errors. |`
### error_empty_loading_retry_cancel
- `66: | `backend/src/modules/users/user.insurance.controller.ts` | legacy deprecation وschemas/errors. |`
- `67: | `backend/src/modules/users/users.insurance.controller.ts` | canonical GET/POST schemas/auth/errors. |`
- `69: | `backend/src/modules/insurance/insurance.controller.ts` | active/catalog contracts/auth/errors. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
