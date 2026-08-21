# Phase 1 — قرار Contract Pack الأول

## نتيجة فحص المصادر

تمت مراجعة `audit-artifacts/nabd-patient-api-openapi.json` على `main`، وهي OpenAPI 3.0.0 بعنوان `Nabdah Plus Enterprise API` وتحتوي على 1,234 path objects. تمت مراجعة `PATIENT_WEB_BUILD_GUIDE.md` كذلك، وثبتت القواعد التالية: Bearer JWT في الـbackend مع تخزين Web server-only/httpOnly، منع localStorage، refresh مرة واحدة عند 401، منع أي حساب غير Sandbox، واختبار owner/stranger.

## Pharmacy/Orders endpoints الموجودة

المواصفة تحتوي على مسارات patient-relevant فعلية، منها:

| المسار | الحالة من المواصفة |
|---|---|
| `GET /api/v1/orders` | موجود، query state/search |
| `GET /api/v1/orders/mine` | موجود، query type |
| `GET /api/v1/orders/{id}` | موجود، path id |
| `GET /api/v1/cart` | موجود |
| `GET /api/v1/cart/checkout` | موجود |
| `GET /api/v1/cart/prescription` | موجود |
| `GET /api/v1/medicines` | موجود، search/category/pagination |
| `GET /api/v1/medicines/{id}` | موجود |
| `GET /api/v1/medicines/{id}/details` | موجود، language headers/query |
| `GET /api/v1/users/me/addresses` | موجود |
| `GET /api/v1/users/me/wishlist` | موجود |
| `POST /api/v1/orders/create` | موجود لكن يحتاج request DTO/response schema واضحين |
| `POST /api/v1/orders/{id}/cancel` | موجود لكن لا يوجد request/response schema كافٍ في المواصفة |
| `POST /api/v1/cart/lines` | موجود لكن بلا requestBody موثق |
| `PATCH /api/v1/cart/lines/{lineId}` | موجود لكن بلا requestBody موثق |
| `DELETE /api/v1/cart/lines/{lineId}` | موجود، لكن ownership/idempotency response غير موثقين بما يكفي |
| `POST /api/v1/cart/checkout` | غير ظاهر في المسار المحدد؛ الموجود `GET /cart/checkout`، لذلك لا نخترع checkout mutation |
| `POST /api/v1/prescriptions/upload` | موجود، لكن upload/media DTO وownership والـprotected media flow يجب إثباتها قبل الواجهة |

## قرار التنفيذ

سنبدأ بالجزء الذي يمكن إغلاقه بأمان من دون تخمين: `GET /orders/mine` أو `GET /orders` بعد مطابقة Web الحالية، `GET /orders/{id}` مع owner/stranger، وGET cart/checkout/prescription وmedicine detail حيث تكون البيانات read-only. سنضيف parser allowlist وBFF GET allowlist واختبارات SSR/server boundary وowner/stranger.

لن ننفذ cart add/update/delete، orders create/cancel، checkout، upload، payment، wishlist mutations أو address mutations في هذه المرحلة، رغم وجود أسماء بعض المسارات، لأن المواصفة لا تعطي request/response DTO وidempotency/ownership guarantees كافية. هذا ليس توقفًا؛ هذه البنود تدخل deferred queue وتُعاد بعد استخراج contract details من Backend أو اختبار Sandbox موثوق.

## فحص مهم للمواصفة

المواصفة تحتوي على `components.securitySchemes.bearer`، لكنها لا تضع `security` داخل operation objects المختارة. لذلك نعتمد دليل البناء وقواعد BFF الحالية، ولا نعتبر غياب security داخل operation دليلًا على أن المسار عام. كل patient route سيبقى خلف session server-only وallowlist.

## بوابات الإغلاق

لن تنتقل هذه المجموعة إلى المرحلة التالية إلا بعد نجاح owner/stranger (200 للمالك و403/404 للغريب بحسب contract)، اختبارات 75/417 الموجودة في المشروع، full Vitest، truthful gate، typecheck، build، وgit diff check. إذا كان فحص الإقلاع الحقيقي يتطلب API production بحسابات Sandbox، فسيُستخدم فقط الحسابان المحددان في دليل البناء ولا تُرسل أسرار في المستودع أو المحادثة.
