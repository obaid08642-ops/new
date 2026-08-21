# Pharmacy/Orders Contract Pack — Mutation Gate

## النتيجة

تمت مراجعة Cart وCheckout وOrders على الفرع المعتمد. العرض الحالي للـCart وCheckout preview يمر عبر GET server-side فقط، ويعرض البيانات التي يعيدها backend دون عناصر محلية أو totals مصطنعة. قواعد browser allowlist تظل GET-only ولا تُمرر أي token إلى المتصفح.

## سبب عدم فتح mutations

حزمة العقد المرفقة تحدد `POST /cart/items` و`PATCH/DELETE /cart/items/{item_id}` و`POST /cart/checkout` و`POST /orders/{id}/reorder` و`POST /orders/{id}/cancel`. أما OpenAPI audit المنشور فيسجل مسارات مختلفة، منها `GET /cart` و`POST/PATCH/DELETE /cart/lines` و`GET /cart/checkout`، إضافة إلى patient-pharmacy order paths مختلفة. لم يثبت حتى الآن تطابق endpoint/body/error DTO مع حزمة العقد، ولا توجد حزمة backend موثقة تثبت Idempotency-Key replay TTL 24h وowner/stranger/unauth لهذه العمليات.

لذلك لم تُفتح mutations في BFF أو UI. هذا مقصود أمنيًا وليس نقصًا مخفيًا: فتحها الآن قد يرسل إلى endpoint غير صحيح أو يسمح بتكرار checkout/order. المطلوب لإغلاق هذا gate هو تحديث OpenAPI/backend بعقود الحزمة exact paths وschemas وerror codes، ثم اختبار owner 200 / stranger 404 / unauth 401 / replay ثابت قبل توسيع allowlist.

## Gates الحالية

Full Vitest: 79 test files passed، 138 tests passed، 14 skipped. Truthful-runtime: 235 production source files. TypeScript check وdiff check ناجحان. الفرع نظيف ومتزامن مع `origin/agent/nabdah-web-parity-phase0`.
