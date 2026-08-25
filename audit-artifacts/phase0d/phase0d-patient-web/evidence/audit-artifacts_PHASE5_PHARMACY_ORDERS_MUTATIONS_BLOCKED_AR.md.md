# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE5_PHARMACY_ORDERS_MUTATIONS_BLOCKED_AR.md`
- **Member SHA-256:** `687e2d8de2049549f8616a7521abd506b9d4540ca22f78f58bbb915fb9014325`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: تمت مراجعة Cart وCheckout وOrders على الفرع المعتمد. العرض الحالي للـCart وCheckout preview يمر عبر GET server-side فقط، ويعرض البيانات التي يعيدها backend دون عناصر محلية أو totals مصطنعة. قواعد browser allowlist تظل GET-only ولا تُمرر أي `
- `9: حزمة العقد المرفقة تحدد `POST /cart/items` و`PATCH/DELETE /cart/items/{item_id}` و`POST /cart/checkout` و`POST /orders/{id}/reorder` و`POST /orders/{id}/cancel`. أما OpenAPI audit المنشور فيسجل مسارات مختلفة، منها `GET /cart` و`POST/PATCH/D`
- `11: لذلك لم تُفتح mutations في BFF أو UI. هذا مقصود أمنيًا وليس نقصًا مخفيًا: فتحها الآن قد يرسل إلى endpoint غير صحيح أو يسمح بتكرار checkout/order. المطلوب لإغلاق هذا gate هو تحديث OpenAPI/backend بعقود الحزمة exact paths وschemas وerror code`
### backend_consumers_or_contracts
- `1: # Pharmacy/Orders Contract Pack — Mutation Gate`
- `9: حزمة العقد المرفقة تحدد `POST /cart/items` و`PATCH/DELETE /cart/items/{item_id}` و`POST /cart/checkout` و`POST /orders/{id}/reorder` و`POST /orders/{id}/cancel`. أما OpenAPI audit المنشور فيسجل مسارات مختلفة، منها `GET /cart` و`POST/PATCH/D`
- `11: لذلك لم تُفتح mutations في BFF أو UI. هذا مقصود أمنيًا وليس نقصًا مخفيًا: فتحها الآن قد يرسل إلى endpoint غير صحيح أو يسمح بتكرار checkout/order. المطلوب لإغلاق هذا gate هو تحديث OpenAPI/backend بعقود الحزمة exact paths وschemas وerror code`
### auth_ownership
- `5: تمت مراجعة Cart وCheckout وOrders على الفرع المعتمد. العرض الحالي للـCart وCheckout preview يمر عبر GET server-side فقط، ويعرض البيانات التي يعيدها backend دون عناصر محلية أو totals مصطنعة. قواعد browser allowlist تظل GET-only ولا تُمرر أي `
- `9: حزمة العقد المرفقة تحدد `POST /cart/items` و`PATCH/DELETE /cart/items/{item_id}` و`POST /cart/checkout` و`POST /orders/{id}/reorder` و`POST /orders/{id}/cancel`. أما OpenAPI audit المنشور فيسجل مسارات مختلفة، منها `GET /cart` و`POST/PATCH/D`
- `11: لذلك لم تُفتح mutations في BFF أو UI. هذا مقصود أمنيًا وليس نقصًا مخفيًا: فتحها الآن قد يرسل إلى endpoint غير صحيح أو يسمح بتكرار checkout/order. المطلوب لإغلاق هذا gate هو تحديث OpenAPI/backend بعقود الحزمة exact paths وschemas وerror code`
### state_transitions
- `9: حزمة العقد المرفقة تحدد `POST /cart/items` و`PATCH/DELETE /cart/items/{item_id}` و`POST /cart/checkout` و`POST /orders/{id}/reorder` و`POST /orders/{id}/cancel`. أما OpenAPI audit المنشور فيسجل مسارات مختلفة، منها `GET /cart` و`POST/PATCH/D`
- `11: لذلك لم تُفتح mutations في BFF أو UI. هذا مقصود أمنيًا وليس نقصًا مخفيًا: فتحها الآن قد يرسل إلى endpoint غير صحيح أو يسمح بتكرار checkout/order. المطلوب لإغلاق هذا gate هو تحديث OpenAPI/backend بعقود الحزمة exact paths وschemas وerror code`
### payment_insurance_relevance
- `5: تمت مراجعة Cart وCheckout وOrders على الفرع المعتمد. العرض الحالي للـCart وCheckout preview يمر عبر GET server-side فقط، ويعرض البيانات التي يعيدها backend دون عناصر محلية أو totals مصطنعة. قواعد browser allowlist تظل GET-only ولا تُمرر أي `
### error_empty_loading_retry_cancel
- `9: حزمة العقد المرفقة تحدد `POST /cart/items` و`PATCH/DELETE /cart/items/{item_id}` و`POST /cart/checkout` و`POST /orders/{id}/reorder` و`POST /orders/{id}/cancel`. أما OpenAPI audit المنشور فيسجل مسارات مختلفة، منها `GET /cart` و`POST/PATCH/D`
- `11: لذلك لم تُفتح mutations في BFF أو UI. هذا مقصود أمنيًا وليس نقصًا مخفيًا: فتحها الآن قد يرسل إلى endpoint غير صحيح أو يسمح بتكرار checkout/order. المطلوب لإغلاق هذا gate هو تحديث OpenAPI/backend بعقود الحزمة exact paths وschemas وerror code`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
