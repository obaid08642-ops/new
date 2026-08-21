# Phase 2 — Pharmacy/Orders read-only Contract Pack

## ما تم تنفيذه

تمت مطابقة Web مع عقود patient-scoped الموجودة في OpenAPI بدل الاعتماد على compat route القديم فقط. أصبحت قائمة Orders تستدعي `GET /patient/pharmacy/orders`، وأصبح detail يستدعي `GET /patient/pharmacy/orders/{id}`. أضيفت المسارات إلى BFF allowlist مع التحقق من UUID، وبقيت العملية GET فقط.

تم توسيع `extractOrderRows` بحدود ثابتة إلى `id`, `status/effective_status`, `reference`, `createdAt`, `itemCount`, `total`, و`currency`. لا يقوم parser بإخراج `patient_account_id` أو `delivery_address` أو `patient_notes` أو `prescription_attachments` أو أسماء الأدوية أو أي raw payload غير مصرح.

ثبتت OpenAPI وجود `GET /orders/{id}/tracking`، لذلك أضيف إلى allowlist كـGET فقط تمهيدًا لبناء سطح tracking read-only. لم تُفتح أي POST/PATCH/DELETE في browser.

## المقارنة مع Mobile

Mobile Order History يستخدم `/orders/mine` ويعرض filters وstatus وdate/items/total، ويفتح order tracking. Mobile tracking يستخدم `GET /orders/{id}/tracking` ويعرض timeline وpharmacy/ETA/delivery mode/total، مع polling كل 30 ثانية. Web أصبح على patient-scoped contract الصحيح للقائمة/detail، والـparser صار يحتفظ بالحقول المالية/التاريخية كبيانات محدودة للمرحلة التالية، لكن واجهة timeline وpolling وchat وreorder ليست مغلقة بعد.

## ما بقي مؤجلًا

Cart add/update/delete، order create/update/submit/cancel، approve/reject basket، checkout/payment، prescription upload/OCR، addresses mutations، wishlist mutations، reorder، pharmacy chat، review، وdelivery actions ما زالت محجوبة. وجود أسماء هذه المسارات في OpenAPI لا يكفي وحده؛ بعض operations لا تحتوي requestBody/response DTO أو idempotency/ownership guarantees صريحة، لذلك لن يتم تخمينها.

## الاختبارات الحالية

نجحت اختبارات patient allowlist وOrders parser وOrders SSR: 9 tests passed. نجح truthful runtime gate سابقًا على 177 production files وTypeScript في الدفعة نفسها، وسيعاد full Vitest وbuild قبل commit الإغلاق.

## بوابة الانتقال

لا تنتقل المجموعة إلى mutations أو إلى المرحلة التالية حتى يتم استخراج DTOs الفعلية، تثبيت owner/stranger results باستخدام Sandbox accounts، وإغلاق tracking read-only بواجهة SSR/UX واختبارات polling أو refresh آمنة. أي feature بلا contract مكتمل يبقى deferred وليس fake.
