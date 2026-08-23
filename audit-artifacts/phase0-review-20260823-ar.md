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

## تحديث بعد migration runner

أضيف في Backend `src/common/migrations/migration-runner.ts` مكوّن مستقل يدعم migration IDs وSHA-256 checksums وup/status/down ورفض checksum mismatch، مع ثلاثة اختبارات وحدات. نجحت الاختبارات الخمسة (runner + contract errors)، ونجح `tsc --noEmit` و`npm run build`.

هذا لا يغلق Phase 0 بالكامل بعد؛ runner لم يُربط بعد بقاعدة Mongo مؤقتة أو CLI/boot lifecycle، ولم تُنشأ migrations domain-specific أو fixtures موحدة. لذلك تظل الحالة `OPEN / PARTIAL`.

## تحديث بوابة fixtures

أُضيفت fixtures صناعية immutable تحت `src/common/fixtures` بعد تصحيح مسار اكتشاف Jest. تشمل patient A/B وprovider A/B وpharmacy/lab/nursing/catalog/insurance/fake PSP، وجاءت بعناوين `example.test` فقط. نجح اختبارها الفعلي (2/2)، ثم نجحت بوابة Backend الكاملة بعد التحديث: 80 suites و432 tests، وboot test 1/1، وTypeScript وbuild. ما يزال runner غير مربوط بMongo/CLI، لذلك Phase 0 تبقى PARTIAL وليست COMPLETE.

## قيد تكامل قاعدة البيانات

إعداد Backend يقرأ `MONGO_URL` و`REDIS_URL` ضمن متطلبات البيئة، و`mongodb-memory-server` موجود كاعتماد اختبار، لكن لا توجد migrations domain-specific أو CLI runner حالية. تم العثور على compose Mongo محلي، إلا أن الخطة تمنع تحويل هذا إلى قاعدة تشغيلية أو لمس إنتاج دون بيئة مؤقتة واضحة. لذلك أُبقي migration runner في handoff فقط حتى يُربط بمستودع Backend قابل للتتبع، Mongo مؤقتة، وdry-run/rollback integration tests.

## تحديث Mongo migration store

أضيف `MongoMigrationStore` فوق collection منفصلة اسمها `schema_migrations`، مع اختبار delegation للقراءة المرتبة والإضافة والحذف. نجحت بوابة Phase 0 المستهدفة: 4 suites و8 tests، مع typecheck وbuild ناجحين. ما يزال هذا adapter غير مربوط بـCLI أو lifecycle الإنتاج، ولم تُشغّل Mongo فعلية؛ لذلك لا تزال Phase 0 `PARTIAL`.
