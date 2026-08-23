# Phase 0 — الحواجز المفتوحة

**الحالة:** OPEN / PARTIAL — لا انتقال إلى Phase 1.

| الحاجز | الدليل | الأثر | الإجراء المطلوب للإغلاق |
|---|---|---|---|
| Backend بلا Git metadata | `/home/ubuntu/nabdah_backend_work` و`nabdah-backend.zip` لا يحتويان `.git`؛ SHA للأرشيف `f1757bf17e194c8349cc69175c5f8d3915889a1a57f5e7584189c694f573602b2` | لا يمكن دفع commit Backend أو إثبات source revision | توفير repository/branch Backend قابل للتتبع أو قبول archive handoff رسمي |
| Mongo integration غير مثبتة | لا يوجد `mongod` أو Docker؛ `mongodb-memory-server` علق أثناء تنزيل MongoDB 8.2.6 وانتهى timeout | لا يمكن إثبات up/down على DB مؤقتة | تشغيل CI/VM تحتوي Mongo مؤقتة معتمدة ثم تشغيل integration test |
| migrations domain-specific غير معتمدة | `registry.ts` فارغ عمدًا | لا يمكن تغيير schemas أو تشغيل migrations تخمينية | اعتماد schema/DTO/rollback لكل domain ثم تسجيل migration |
| response-contract wiring غير مكتمل | `normalizeContractError` قابل للاختبار لكنه غير مربوط globally | الربط الآن قد يكسر response shapes الحالية | جرد response contracts ثم migration تدريجي واختبارات contract لكل route |
| duplicate Mongoose index warning | boot/full tests تظهر warning لـ`participant_ids` | خطر schema hygiene وليس فشلًا مثبتًا | تحديد schema/index declarations وحذف التكرار مع regression test |
| قرارات المنتج غير المحسومة | خطة remediation: payment model، provider-vs-queue، recurrence، insurance، cancellation/refund، notifications | يمنع بناء رحلات جديدة صادقة | قرار مكتوب من المالك لكل مجال |

## ما ثبت نجاحه

نجحت اختبارات error catalog وnormalizer وmigration runner وMongo store mock وfixtures الصناعية. نجحت بوابة Backend السابقة بـ80 suites و432 tests، وboot test بـ1/1، وTypeScript/build في المحاولات منخفضة الذاكرة قبل إضافة normalizer. لم تُنفذ أي معاملة مالية أو اتصال إنتاجي.

## قاعدة الانتقال

لا تُعلن Phase 0 مكتملة ولا تبدأ Phase 1 قبل إغلاق الحواجز التي تمنع contract/migration evidence، أو توثيق قرار مالك صريح بإبقاءها خارج النطاق مع تغيير Definition of Done؛ لا يجوز تجاوزها بالصمت.
