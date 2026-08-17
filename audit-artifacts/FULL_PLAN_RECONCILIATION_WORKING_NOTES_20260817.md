# ملاحظات جرد الخطة الكاملة — 17 أغسطس 2026

هذه مذكرة عمل مؤقتة لتتبع استئناف الخطة الأساسية، وليست حكماً نهائياً. مصفوفة الإكمال الرسمية تقر صراحة بأن الخطة لم تُغلق بالكامل وأن Phase 3–6 وE2E وعقود consent/QR/location/error-codes بقيت جزئية أو مفتوحة.

## ما ثبت من قراءة السجلات

مصفوفة `EXECUTION_COMPLETION_MATRIX_20260816.md` تصنف Phase 1.5 كمنفذة جزئياً، Phase 3 و4 كمصدرية مع نقص عقدي/تشغيلي، Phase 5 بنيوية مع نقص قبول اللغات والأجهزة، Phase 6 حمايةً لا كميزات معتمدة، وPhase 7 توثيقياً لا اختبارياً. كما أن كل مجموعات `E2E-AUTH`, `E2E-CFG`, `E2E-LAB`, `E2E-PHARM`, `E2E-PROV`, `E2E-ADMIN`, `E2E-WS`, `E2E-I18N`, و`E2E-A11Y` كانت مفتوحة قبل جولة Gatekeeper.

## عيوب مصدرية جديدة ظهرت أثناء الاستئناف

| الموضع | الملاحظة الأولية | الإجراء الجاري |
|---|---|---|
| `src/modules/webhooks/guards/livekit-webhook.guard.ts` | fallback إلى `fake_key` و`fake_secret` عند غياب الأسرار | استبدال verifier الوهمي بـfail-closed صريح |
| `src/modules/device-trust/device-trust.module.ts` | verify كان يتجاوز استهلاك challenge عند غياب Redis، وإشارات `placeholder: true`، وfallback package في production | إلزام Redis، مطابقة مالك challenge، إزالة إشارات placeholder، ومنع fallback الإنتاجي |
| `src/modules/provider/simulated-features.controller.ts` | check-in/report يستخدمان `findById` بلا ownership؛ تقرير الأشعة ينشئ `FILE-${Date.now()}`؛ publish بلا report/ownership | استخدام public UUID، تحقق أدوار وملكية، وإجبار `file_id` حقيقي ووجود تقرير قبل النشر |
| `src/modules/insurance-engine/insurance-engine.module.ts` | فشل اختبار حدود الاسترداد عند 24 ساعة بسبب انزياح microseconds (`expected 100`, `received 50`) | تقريب الفارق إلى الدقيقة للأعلى مع حدود شاملة |
| `patient-app/src/core/platform/id/IdGenerator.ts` و`ScheduleManager.ts` | معرفات قصيرة/محلية عشوائية؛ يلزم تتبع استخدامها للتأكد أنها لا تُرسل كمعرفات business | الجرد مستمر؛ لا حكم placeholder قبل تتبع المستهلك |

## نتائج staging الحالية

نقطة `http://57.131.133.208:8003/api/v1` تستجيب health بحالة ok. تسجيل دخول patient وlab وradiology وnursing وhospital بحالة 201. `GET /orders/mine` للمريض أعاد 200. `GET /radiology/provider/inbox` أعاد 200 وقائمة فارغة. المختبر أعاد 403 في `/labs/provider/inbox` و`/labs/samples`، و`GET /hospital/staff` أعاد 500. مسار `/home-care/provider/bookings` غير موجود؛ العقد المصدر الفعلي هو `/nursing/visits?provider_id=...`. هذه النتائج تثبت أن staging الحالية لم تُنشر عليها كل إصلاحات المصدر أو أن عقود claims فيها مختلفة، ولا تغلق E2E.

## قاعدة المتابعة

لا تُعلّم أي بند من الخطة الأساسية كمكتمل بسبب build محلي فقط. كل بند يحتاج واحداً من: source evidence + test، أو staging evidence منقح، أو قرار عقدي موثق يثبت أن الميزة محجوبة بصدق ولا تعرض نجاحاً أو بيانات تركيبية.
