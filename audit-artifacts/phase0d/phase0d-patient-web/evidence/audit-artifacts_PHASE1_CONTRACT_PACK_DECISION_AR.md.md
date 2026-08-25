# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE1_CONTRACT_PACK_DECISION_AR.md`
- **Member SHA-256:** `99083a405a0b2e74c04469a4939fedcb056bacabdc2f0ad67073a8f5caefd155`
- **Line count:** 44
- **Read range:** `1-44`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: | `GET /api/v1/cart/checkout` | موجود |`
- `25: | `POST /api/v1/orders/{id}/cancel` | موجود لكن لا يوجد request/response schema كافٍ في المواصفة |`
- `29: | `POST /api/v1/cart/checkout` | غير ظاهر في المسار المحدد؛ الموجود `GET /cart/checkout`، لذلك لا نخترع checkout mutation |`
- `30: | `POST /api/v1/prescriptions/upload` | موجود، لكن upload/media DTO وownership والـprotected media flow يجب إثباتها قبل الواجهة |`
- `34: سنبدأ بالجزء الذي يمكن إغلاقه بأمان من دون تخمين: `GET /orders/mine` أو `GET /orders` بعد مطابقة Web الحالية، `GET /orders/{id}` مع owner/stranger، وGET cart/checkout/prescription وmedicine detail حيث تكون البيانات read-only. سنضيف parser a`
- `36: لن ننفذ cart add/update/delete، orders create/cancel، checkout، upload، payment، wishlist mutations أو address mutations في هذه المرحلة، رغم وجود أسماء بعض المسارات، لأن المواصفة لا تعطي request/response DTO وidempotency/ownership guarantee`
- `40: المواصفة تحتوي على `components.securitySchemes.bearer`، لكنها لا تضع `security` داخل operation objects المختارة. لذلك نعتمد دليل البناء وقواعد BFF الحالية، ولا نعتبر غياب security داخل operation دليلًا على أن المسار عام. كل patient route سي`
### backend_consumers_or_contracts
- `7: ## Pharmacy/Orders endpoints الموجودة`
- `13: | `GET /api/v1/orders` | موجود، query state/search |`
- `14: | `GET /api/v1/orders/mine` | موجود، query type |`
- `15: | `GET /api/v1/orders/{id}` | موجود، path id |`
- `16: | `GET /api/v1/cart` | موجود |`
- `17: | `GET /api/v1/cart/checkout` | موجود |`
- `18: | `GET /api/v1/cart/prescription` | موجود |`
- `19: | `GET /api/v1/medicines` | موجود، search/category/pagination |`
- `20: | `GET /api/v1/medicines/{id}` | موجود |`
- `21: | `GET /api/v1/medicines/{id}/details` | موجود، language headers/query |`
- `22: | `GET /api/v1/users/me/addresses` | موجود |`
- `23: | `GET /api/v1/users/me/wishlist` | موجود |`
### auth_ownership
- `5: تمت مراجعة `audit-artifacts/nabd-patient-api-openapi.json` على `main`، وهي OpenAPI 3.0.0 بعنوان `Nabdah Plus Enterprise API` وتحتوي على 1,234 path objects. تمت مراجعة `PATIENT_WEB_BUILD_GUIDE.md` كذلك، وثبتت القواعد التالية: Bearer JWT في ا`
- `28: | `DELETE /api/v1/cart/lines/{lineId}` | موجود، لكن ownership/idempotency response غير موثقين بما يكفي |`
- `30: | `POST /api/v1/prescriptions/upload` | موجود، لكن upload/media DTO وownership والـprotected media flow يجب إثباتها قبل الواجهة |`
- `34: سنبدأ بالجزء الذي يمكن إغلاقه بأمان من دون تخمين: `GET /orders/mine` أو `GET /orders` بعد مطابقة Web الحالية، `GET /orders/{id}` مع owner/stranger، وGET cart/checkout/prescription وmedicine detail حيث تكون البيانات read-only. سنضيف parser a`
- `36: لن ننفذ cart add/update/delete، orders create/cancel، checkout، upload، payment، wishlist mutations أو address mutations في هذه المرحلة، رغم وجود أسماء بعض المسارات، لأن المواصفة لا تعطي request/response DTO وidempotency/ownership guarantee`
- `40: المواصفة تحتوي على `components.securitySchemes.bearer`، لكنها لا تضع `security` داخل operation objects المختارة. لذلك نعتمد دليل البناء وقواعد BFF الحالية، ولا نعتبر غياب security داخل operation دليلًا على أن المسار عام. كل patient route سي`
- `44: لن تنتقل هذه المجموعة إلى المرحلة التالية إلا بعد نجاح owner/stranger (200 للمالك و403/404 للغريب بحسب contract)، اختبارات 75/417 الموجودة في المشروع، full Vitest، truthful gate، typecheck، build، وgit diff check. إذا كان فحص الإقلاع الحقيق`
### state_transitions
- `13: | `GET /api/v1/orders` | موجود، query state/search |`
- `25: | `POST /api/v1/orders/{id}/cancel` | موجود لكن لا يوجد request/response schema كافٍ في المواصفة |`
- `36: لن ننفذ cart add/update/delete، orders create/cancel، checkout، upload، payment، wishlist mutations أو address mutations في هذه المرحلة، رغم وجود أسماء بعض المسارات، لأن المواصفة لا تعطي request/response DTO وidempotency/ownership guarantee`
### payment_insurance_relevance
- `36: لن ننفذ cart add/update/delete، orders create/cancel، checkout، upload، payment، wishlist mutations أو address mutations في هذه المرحلة، رغم وجود أسماء بعض المسارات، لأن المواصفة لا تعطي request/response DTO وidempotency/ownership guarantee`
### error_empty_loading_retry_cancel
- `25: | `POST /api/v1/orders/{id}/cancel` | موجود لكن لا يوجد request/response schema كافٍ في المواصفة |`
- `36: لن ننفذ cart add/update/delete، orders create/cancel، checkout، upload، payment، wishlist mutations أو address mutations في هذه المرحلة، رغم وجود أسماء بعض المسارات، لأن المواصفة لا تعطي request/response DTO وidempotency/ownership guarantee`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
