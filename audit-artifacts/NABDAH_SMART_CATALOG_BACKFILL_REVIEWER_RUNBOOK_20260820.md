# منصة نبض — Backfill ذكي لحوكمة الكتالوج

**التاريخ:** 2026-08-20  
**الفرع:** `manus/on-live-reconciliation` فقط  
**الحالة:** مرشح مصدرّي مختبر. لا نشر ولا migration على أي بيئة منفذان.

## القرار

استُبدل backfill الذي كان يخفي جميع سجلات legacy بسياسة **وراثة ذكية ومتحفظة**. لا تعتبر السياسة `active` أو مجرد وجود السجل دليلاً على اعتماد عام. تُورَّث الإتاحة العامة فقط عندما يملك السجل علامة تحقق legacy صريحة قابلة للتدقيق؛ وما عدا ذلك يصبح `pending` و`public_eligibility:false`.

| Collection | شرط الوراثة العامة | القيمة الناتجة | Provenance |
|---|---|---|---|
| `medicines_master` | `verified:true` وnot deleted | `public_eligibility:true`, `medical_review_status:'approved'`, `indexing_eligibility:false` | `legacy_verification_inherited:medicine.verified` |
| `provider_profiles` | `status:'active'` **و** (`license_verified:true` أو `license_status:'verified'`) | القيم نفسها | `legacy_verification_inherited:provider.license_verified` |
| Facilities/Lab/Radiology/Home-care | لا توجد علامة اعتماد legacy مستقلة؛ `active` وحدها لا تكفي | `pending` ومخفية | `legacy_backfill_pending_review` |

> الإتاحة العامة الموروثة لا تعني السماح بالفهرسة. يبقى `indexing_eligibility:false` في جميع الصفوف الموروثة حتى قرار مستقل.

## ضمانات التنفيذ

الـscript `scripts/backfill-catalog-governance.ts` لا يغيّر البيانات افتراضياً. وضع apply يتطلب `--apply` و`CATALOG_GOVERNANCE_MIGRATION_CONFIRM=apply`. لا يستهدف إلا الصفوف التي **تفتقد جميع حقول الحوكمة الأساسية**، ولذلك لا يكتب فوق قرار حوكمة موجود. يضيف timestamp وprovenance محددين؛ وrollback يتعامل فقط مع الصفوف التي تحمل provenance الخاص بالترحيل وtimestamp الخاص به.

| الوضع | الأمر المصرح به للمراجع | الأثر |
|---|---|---|
| Dry run | `MONGO_URL=... npx ts-node scripts/backfill-catalog-governance.ts` | عدد المرشحين inherited/pending بلا تعديل |
| Apply | `CATALOG_GOVERNANCE_MIGRATION_CONFIRM=apply ... --apply` | يورّث الموثقين فقط ثم يخفي غيرهم |
| Rollback | `CATALOG_GOVERNANCE_MIGRATION_CONFIRM=rollback ... --rollback` | يفك حقول الحوكمة للصفوف الموسومة بالترحيل فقط |

## أدلة التحقق

اختبارات backfill تثبت شرط الدواء `verified`, وشرط المزود النشط المرخص، ومنع توريث المنشآت التشغيلية فقط، وترتيب inherited ثم pending، وقيد rollback. كما أعيد تشغيل اختبارات public discovery والـprojection. بوابة Backend النهائية: **73 suites / 411 tests passed** و`npm run build` ناجح. الحزمة المرشحة: `nabdah-backend.zip` ببصمة SHA-256 `b3a4537dc552a975b1d8769c753529142ccad9265df17d3bfc366be0cf5a0aca`.

## إجراء النشر والتحقق الحي

ينفذ Reviewer/DevOps الـdry run في نافذة النشر ويراجع عدد `inherited_public_candidates` و`pending_hidden_candidates` قبل apply. بعد الـapply، يجب التحقق بحسابات Sandbox فقط من أن بحث الأدوية يعيد دواءً legacy موثقاً قبل/بعد، وأن دواءً غير موثق لا يظهر، وأن public/SEO لا يُظهر كياناً pending. لا تُشغّل أي دفعة أو بيانات مرضى حقيقية، ولا يُفعل crawler/feed خارجي في هذه الخطوة.
