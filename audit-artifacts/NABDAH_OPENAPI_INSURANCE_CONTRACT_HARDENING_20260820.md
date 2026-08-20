# منصة نبض — تحصين عقد OpenAPI للتأمين

**التاريخ:** 2026-08-20
**الفرع المستهدف:** `manus/on-live-reconciliation` فقط
**النطاق:** توثيق وتثبيت مسارات التأمين المتداخلة، مع الحفاظ على compatibility وعدم نشر أي خدمة.
**الحالة:** **مكتمل في المصدر والاختبارات المحلية؛ النشر يحتاج مراجعاً/DevOps صريحاً.**

## القرار العقدي

المسارات الثلاثة لا تتبادل المعنى أو شكل payload، ولذلك لم تُدمج في route واحد قد يكسر العملاء. بدلاً من ذلك، أصبحت موثقة في OpenAPI بشكل صريح؛ ووُسم المسار التراثي `GET /user/insurance` على أنه deprecated مع replacement واضح. التسجيل الفعلي لـ`UserInsuranceController` أُعيد إلى `UsersModule`، لأن وجود ملف Controller خارج مصفوفة `controllers` يعني أن route غير متاح وقت التشغيل ولا يحقق compatibility فعلياً.

| Endpoint | الحالة | الاستجابة | الاستخدام الصحيح |
|---|---|---|---|
| `GET /user/insurance` | **Deprecated؛ متاح للتوافق** | `{ policies: insurance_policies[] }` | عملاء legacy فقط؛ الانتقال إلى canonical أو active projection بحسب الحاجة. |
| `GET /users/me/insurance` | **Canonical قابل للتحرير** | `insurance \| null` | قراءة سجل تأمين المريض القابل للتحرير. |
| `POST /users/me/insurance` | **Canonical قابل للتحرير** | `insurance` مع `verified: false` | تحديث بيانات المريض؛ لا يمكن للعميل توثيق التغطية ذاتياً. |
| `GET /insurance/active` | **Active projection** | `{ policies: insurance_details[] }`، بطول صفر أو واحد | استهلاك التغطية النشطة، لا تحرير السجل الأساسي. |
| `GET /insurance/companies` | **كتالوج مصدر الحقيقة** | شركات نشطة مع `plans` مرتبة | التطبيقات تقرأ الكتالوج من backend ولا تضع قائمة شركات ثابتة. |

## OpenAPI والأمن

المصنع الجديد في `backend/src/config/openapi.config.ts` يعلن production server كالتالي:

> `https://api.nabd.plus/api/v1`

تستخدم جميع العمليات الخمس scheme واضحاً باسم `access-token` من نوع HTTP Bearer/JWT. لا تعلن الوثيقة OAuth scopes مصطنعة: هذا الـAPI لا يمرر scopes OAuth داخل JWT، بينما تفرض الحماية role وملكية السجل على مستوى endpoint. وصف كل operation يصرح بذلك، وresponses توثق على الأقل `401` للمصادقة و`403` لمسارات `NoGuestsGuard`.

بسبب `app.setGlobalPrefix('api')` وURI versioning، يولّد Nest paths داخلية تبدأ بـ`/api/v1`. قبل تقديم الوثيقة، تزال هذه البادئة فقط من مفاتيح paths كي لا تتضاعف مع server URL الذي يحتوي بالفعل `/api/v1`. اختبار العقد يثبت أن document الناتج OpenAPI 3.0، وأن القيمة null للسجل canonical ممثلة بـ`nullable: true`، لا بـ`type: null` غير المحمول في OpenAPI 3.0.

| عنصر تحكم | التطبيق |
|---|---|
| UI وJSON/YAML | يظل Swagger خلف `SWAGGER_ENABLED=true` في الإنتاج؛ لم يُفعّل على البيئة. |
| Legacy visibility | `deprecated: true`، وشرح replacement والفرق في payload. |
| JWT | `access-token` على مستوى كل operation؛ لا security array مكرر. |
| Response schemas | schemas لـlegacy policies وcanonical insurance وactive projection وcompany plans. |
| خصوصية | حقل `national_id` معلّم حساساً، مع تنبيه العميل بعدم تسجيله في logs. |
| سلامة الكتالوج | `companies` يصرح بفلترة `is_active: true` وبأن backend هو مصدر الحقيقة. |

## التحقق المستقل

| البوابة | النتيجة | الدليل |
|---|---:|---|
| OpenAPI contract regression | PASS | 4 اختبارات، منها server/JWT وlegacy deprecation وdistinct payloads وتسجيل Controller. |
| Backend build | PASS | `npm run build` بعد كل إصلاح للعقد. |
| Backend full regression | PASS | 69 suites / 397 tests. |
| تحقق Swagger المنشور (passive) | 404 متوقع | `https://api.nabd.plus/api/docs-json` غير متاح بينما Swagger production غير مفعّل؛ لم يُغير ذلك. |

ظهر أثناء suite تحذير Mongoose لفهرس `booking_id` المكرر؛ لم يُحذف ضمن هذه الدفعة لأن ذلك موضوع Phase 5 ويتطلب migration idempotent وخطة rollback قبل أي تدخل إنتاجي.

## artifact المرشح

أعيد تغليف `nabdah-backend.zip` من المصدر المتحقق منه بعد استبعاد `node_modules` و`dist` و`coverage` و`.git` وملفات البيئة. اجتاز ZIP integrity، ومقارنة archive القديم/الجديد حصرت الفرق في ملفات OpenAPI الخمسة وملفي config/test الجديدين فقط.

> **SHA-256:** `9b661b4390ffa093e9bae16a8b398d643f0994fc6075eeaa3686577ce035bfd7`

## حدود الدفعة

هذه الدفعة لا تغيّر نموذج البيانات أو منطق مطالبات التأمين أو صلاحيات guards أو حالة `verified`، عدا جعل route legacy الموجود في المصدر مسجلاً فعلياً للتوافق. لم يُنشر backend، ولم تُفعّل Swagger في production، ولم تُستخدم حسابات أو بيانات خارج Sandbox.

## الملفات المعدلة

| الملف | الغرض |
|---|---|
| `backend/src/config/openapi.config.ts` | server URL، JWT scheme، path normalization، ومصنع document. |
| `backend/src/main.ts` | ربط Swagger gated بالمصنع وإتاحة JSON/YAML حين يُفعل. |
| `backend/src/modules/users/user.insurance.controller.ts` | legacy deprecation وschemas/errors. |
| `backend/src/modules/users/users.insurance.controller.ts` | canonical GET/POST schemas/auth/errors. |
| `backend/src/modules/users/users.module.ts` | تسجيل legacy Controller فعلياً. |
| `backend/src/modules/insurance/insurance.controller.ts` | active/catalog contracts/auth/errors. |
| `backend/src/contracts/insurance-openapi.contract.spec.ts` | regression مستقل للمستند الناتج. |

## References

[1]: `../../nabdah_execution/backend/src/config/openapi.config.ts` "مولد OpenAPI"
[2]: `../../nabdah_execution/backend/src/contracts/insurance-openapi.contract.spec.ts` "اختبار العقد"
[3]: `../../nabdah_execution/backend/src/modules/users/user.insurance.controller.ts` "مسار legacy"
[4]: `../../nabdah_execution/backend/src/modules/users/users.insurance.controller.ts` "المسار canonical"
[5]: `../../nabdah_execution/backend/src/modules/insurance/insurance.controller.ts` "active projection وcompany catalog"
