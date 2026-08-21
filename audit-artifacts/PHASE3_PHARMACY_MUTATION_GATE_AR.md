# Phase 3 — Pharmacy/Cart Mutation Gate

فحصنا مصدر Backend المرفق والمواصفة الحقيقية. CartController يربط البيانات بـ`CurrentUser` ويستخدم `patient_id` داخل CartService، وPharmacyOrderService يتحقق من patient role و`patient_account_id` عند create/update/submit/cancel/detail. هذا يثبت ownership داخل Backend، لكنه لا يثبت Web mutation contract كاملًا.

الناقص قبل فتح mutation هو idempotency/replay contract للـCart add/update/remove/clear وPharmacy create/update/submit/cancel، وrequest/response DTOs مستقرة، error schema، CSRF strategy، transition rules، ومصفوفة owner/stranger فعلية على Sandbox. البحث في Cart/Pharmacy controllers/services لم يجد `IdempotencyInterceptor` أو `idempotency-key` لهذه العمليات؛ ووجود workflow transitions داخل خدمة Pharmacy لا يساوي contract للـbrowser retry.

مواصفة البناء تطلب اختبار owner/stranger. لكن متغيرات Sandbox المطلوبة (`RUN_SANDBOX_TESTS`, `NABD_API_BASE_URL`, وحسابا owner/other) غير موجودة في البيئة الحالية، لذلك لم يتم الادعاء بتشغيل اختبار حي. الاختبارات المحلية تثبت allowlist وSSR والparser فقط، بينما الاختبار الحي يبقى gate مطلوبًا قبل mutation.

القرار: نُبقي cart writes وorder create/update/submit/cancel وcheckout/payment/upload/chat/reorder محجوبة في BFF. نواصل تنفيذ GET/read-only contracts التي تثبتها OpenAPI، وعند توفر Sandbox env وcontract idempotency نشغل 200 للمالك و403/404 للغريب وreplay tests قبل إظهار أي زر mutation.
