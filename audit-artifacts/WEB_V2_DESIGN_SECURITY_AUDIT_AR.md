# V2 Design / Motion / i18n / Security Audit

## النتيجة

تمت مراجعة Specialty Select وHome-care Services بعد التنفيذ. كلاهما يعمل عبر server wrappers عامة لمسارات GET ثابتة، ولا يرسل Authorization أو session cookies يدويًا. الـparsers يسقطان fields غير الموثقة مثل `patient_id` ولا يقدمان fallback data.

التصميم يستخدم مساحات واسعة، glass-like surfaces، تدرجات هادئة، vector icons، حدود focus واضحة، وmicro-interactions لا تتجاوز الحركة القصيرة على transform/opacity. تم تطبيق `prefers-reduced-motion: reduce` على الحركات الجديدة، مع active scale صغير وروابط keyboard-accessible.

تمت مطابقة namespaces `Specialties` و`HomeCareServices` في AR/EN/UR/HI/BN/FIL. لا توجد مفاتيح مفقودة بين اللغات لهذه namespaces.

## Security scan interpretation

الظهور النصي لـ`patient_id` و`access-token` موجود داخل tests فقط لإثبات الإسقاط وعدم التسريب. الفحص على production page/wrapper لا يجد `localStorage`, `sessionStorage`, `document.cookie`, أو token-bearing Authorization header. public wrappers ترسل `Accept` فقط.

## Gate limitation

`pnpm test:sandbox` لم يُغلق في بيئة التنفيذ الحالية لأن حسابات sandbox الثلاثة غير موجودة (`NABD_SANDBOX_BASE_URL`, `NABD_SANDBOX_OWNER_EMAIL`, `NABD_SANDBOX_OWNER_PASSWORD`). هذه حالة `BLOCKED_ENV` وليست PASS مصطنعة ولا فشلًا وظيفيًا مثبتًا.
