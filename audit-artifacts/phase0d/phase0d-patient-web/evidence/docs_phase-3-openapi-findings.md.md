# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-3-openapi-findings.md`
- **Member SHA-256:** `6c8ea0c6125c01aa6f8ce0602b2fe9b2df6956a9619e18238117e44b4315d1bc`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: | فجوة توثيق OpenAPI | بعض العمليات الحساسة، ومنها login/refresh في العينة، لا تحمل request schema/response schema مفصلة في OpenAPI رغم وجود وصف نصي في الدليل. | إضافة DTO schemas وresponse models و400/401/403/409/422 حيث تنطبق قبل توليد عم`
- `13: | مطابقة دليل البناء | الدليل يفرض Next.js App Router وstrict TS وطبقات services/hooks وReact Query وZod وi18n وSSR للمحتوى العام وسياسة no-mock. | يعتمد كمتطلب معماري للمرحلة 4؛ لا يبنى على قالب SPA الحالي. |`
- `25: استبدل المصدر الاستدعاءين غير المطابقين بثوابت routes موثقة في `src/contracts/patientApiRoutes.ts`، مع اختبار Jest مخصص نجح في الحالتين، ثم فحص TypeScript كامل نجح بلا أخطاء. لا يغلق تحقق runtime النهائي إلا بعد تجربة حسابات Sandbox المصرح `
### backend_consumers_or_contracts
- `5: بعد تصحيح بادئة `/api/v1` الموجودة داخل مواصفة OpenAPI نفسها، تغطي المواصفة **1234 مساراً و1373 عملية**. طابقت هذه المواصفة جميع استدعاءات API الثابتة المستخرجة من تطبيق المريض تقريباً؛ بقي استدعاءان فقط لا وجود لهما حرفياً. كما أثبتت الموا`
- `9: | خطأ مريض مؤكد | `app/orders/index.tsx` يستدعي `GET /care/appointments/mine`، بينما controller والمواصفة يثبتان `GET /care/appointments` للمريض الحالي. | يصحح تطبيق المريض إلى endpoint الموثق، ويستخدم Web App المسار الموثق فقط. |`
- `10: | خطأ مريض مؤكد | `app/map/index.tsx` يستدعي `GET /user/insurance`، بينما controller والمواصفة يثبتان `GET /users/me/insurance`. | يصحح تطبيق المريض إلى endpoint الموثق، ويستخدم Web App المسار الموثق فقط. |`
### auth_ownership
- `5: بعد تصحيح بادئة `/api/v1` الموجودة داخل مواصفة OpenAPI نفسها، تغطي المواصفة **1234 مساراً و1373 عملية**. طابقت هذه المواصفة جميع استدعاءات API الثابتة المستخرجة من تطبيق المريض تقريباً؛ بقي استدعاءان فقط لا وجود لهما حرفياً. كما أثبتت الموا`
- `11: | فجوة توثيق OpenAPI | حقل `servers` غير موجود، و`security` global فارغ؛ لا يمكن للعميل استنتاج حماية كل operation من المواصفة وحدها. | يضاف server production/sandbox بوضوح وتوثيق `bearerAuth` على العمليات/المجموعات المحمية في الخلفية، ثم ي`
- `12: | فجوة توثيق OpenAPI | بعض العمليات الحساسة، ومنها login/refresh في العينة، لا تحمل request schema/response schema مفصلة في OpenAPI رغم وجود وصف نصي في الدليل. | إضافة DTO schemas وresponse models و400/401/403/409/422 حيث تنطبق قبل توليد عم`
### state_transitions
- `21: تتعلق هذه التغييرات بجودة العقد والتوليد الآمن للعملاء، لا بإضافة منطق طبي جديد: إكمال server metadata، security annotations، DTO/request/response schemas، وerror responses القياسية. لا تنفذ في الإنتاج قبل فرع مستقل واختبارات العقد وإعادة ت`
- `29: استجابت نقطة الصحة العامة بـ`status: up`، كما أعادت واجهات فئات الأدوية وفئات المختبرات بيانات كتالوج حقيقية. هذه إشارة إتاحة فقط وليست اعتماداً لمسار شراء أو حجز. أعادت واجهة التخصصات قائمة تخصصات ثنائية اللغة، لكن الصفوف التي ظهرت في العي`
### payment_insurance_relevance
- `10: | خطأ مريض مؤكد | `app/map/index.tsx` يستدعي `GET /user/insurance`، بينما controller والمواصفة يثبتان `GET /users/me/insurance`. | يصحح تطبيق المريض إلى endpoint الموثق، ويستخدم Web App المسار الموثق فقط. |`
### error_empty_loading_retry_cancel
- `21: تتعلق هذه التغييرات بجودة العقد والتوليد الآمن للعملاء، لا بإضافة منطق طبي جديد: إكمال server metadata، security annotations، DTO/request/response schemas، وerror responses القياسية. لا تنفذ في الإنتاج قبل فرع مستقل واختبارات العقد وإعادة ت`
- `29: استجابت نقطة الصحة العامة بـ`status: up`، كما أعادت واجهات فئات الأدوية وفئات المختبرات بيانات كتالوج حقيقية. هذه إشارة إتاحة فقط وليست اعتماداً لمسار شراء أو حجز. أعادت واجهة التخصصات قائمة تخصصات ثنائية اللغة، لكن الصفوف التي ظهرت في العي`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
