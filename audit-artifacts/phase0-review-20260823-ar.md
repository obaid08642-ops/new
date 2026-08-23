# مراجعة Phase 0 — تقرير مرحلي

## الحالة

**Phase 0 غير مكتملة بعد.** تم إغلاق جزءين قابلين للإثبات، لكن لا يجوز الانتقال إلى Phase 1 حتى تُغلق بقية معايير المرحلة أو تُسجل كحواجز واضحة.

## ما نُفذ وأُعيد اختباره

أضيف `src/common/contract-errors.ts` في Backend بقاموس موحد للأكواد: `VALIDATION_ERROR` و`UNAUTHORIZED` و`FORBIDDEN` و`CONFLICT` و`IDEMPOTENCY_REPLAY` و`PAYMENT_REQUIRED` و`PROVIDER_UNAVAILABLE`. أضيف اختبار وحدات له، ونجح الاختباران.

أُصلح `test/app.boot.e2e-spec.ts` بعزل `CatalogPublicationService` الذي لا يخص نطاق اختبار ChatModule. قبل الإصلاح كان boot test يفشل بسبب dependency `DatabaseConnection` غير المتاحة في test module. بعد الإصلاح نجح boot test: suite واحدة واختبار واحد. كما نجح Backend `tsc --noEmit` و`npm run build`.

بوابة Backend العامة السابقة نجحت أيضًا: 78 test suites و427 tests، مع تحذير Mongoose عن duplicate index على `participant_ids` ما يزال يحتاج معالجة مستقلة ولا يُعتبر فشلًا صامتًا.

## ما بقي مفتوحًا في Phase 0

1. لا يوجد بعد migration runner versioned مع checksums وdry-run وrollback واختبار على DB مؤقتة.
2. لا توجد بعد fixtures صناعية مكتملة ومقيدة لكل patient A/B وprovider A/B وpharmacy/lab/nurse/catalog/policy/fake PSP في بيئة اختبار موحدة.
3. لم يُحسم بعد اختبار BFF catch-all body forwarding؛ يجب اختبار route قابل للوصول، وتمرير body وContent-Type بأمان ومنع headers غير الآمنة، أو توثيق عدم انطباقه.
4. قاموس الأخطاء أضيف كمرجع مشترك لكنه لم يُربط بعد بكل exception filter/DTO/route؛ لذلك لا يُعلن توحيد response contract مكتملًا.
5. Backend workspace لا يحتوي Git metadata، لذلك لا يمكن بصدق إنشاء commit أو push backend من هذا workspace؛ يلزم repository/branch قابل للتتبع أو تسليم patch/archive للمراجع.

## Gate القرار

**القرار: Phase 0 OPEN / NO-GO للانتقال.** لا تبدأ Phase 1 أو أي رحلة دفع/Socket حساسة قبل إغلاق migration/fixtures/body-forwarding وربط error response contracts، مع بقاء تحذير duplicate index مسجلًا.
