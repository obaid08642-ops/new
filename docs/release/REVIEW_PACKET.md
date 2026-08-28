# حزمة مراجعة الإصدار — Patient Production

> هذه الحزمة قالب إلزامي لكل pull request مرحلي. لا تضع نتيجة اختبار من دون الأمر وبيئة التشغيل وتاريخها.

| الحقل | القيمة المطلوبة قبل المراجعة |
|---|---|
| النطاق | رقم المرحلة، المتطلبات من `TRACEABILITY_MATRIX.md`، وما هو خارج النطاق. |
| المصدر | commit base، commits الداخلة، وأي نقل انتقائي من quarantine أو فرع مكون آخر. |
| القرارات | أرقام القرارات من `DECISIONS_LOCKED.md` المتأثرة. |
| التغييرات | schemas، API/BFF، واجهات، migrations، feature flags، وsecrets المطلوبة. |
| الاختبار | أوامر frozen install/typecheck/test/build/E2E، النتائج، failures المعروفة، وأثر التغطية. |
| الأمن والخصوصية | authorization، idempotency، webhooks، redaction، secrets، ونتيجة الاختبارات السلبية. |
| التراجع | نقطة التراجع، migration compatibility، والخطوات العملية. |
| قرار المراجع | Approve أو changes requested؛ لا يدمج مع بنود حرجة مفتوحة. |
