# مذكرة المعالجة الحاكمة — 27 أغسطس 2026

**المستودع:** `obaid08642-ops/new`

**الفرع:** `remediation/provider-production-governed`

**قاعدة المقارنة:** `main`

**القرار المستمر:** **REJECT / NO-MERGE / NO-DEPLOY**.

> أُعيد تغليف المصادر داخل `NabdProvider-provider.zip` و`nabdah-backend.zip`. يجب أن تعتمد المراجعة على الحزم وفروقات المصدر في `review/*-source-remediation-2026-08-27.patch`، لا على فرق حجم ZIP فقط.

## الدفعات الجديدة القابلة للمراجعة

| الدفعة | الالتزام الكامل | النطاق الحاكم |
|---|---|---|
| PR-1 | `e86d2e375eef6eb63d378934f20eaf35ae01895f` | يربط allocation بالعرض المختار وإصداره، ويغلق التقدم دون دليل دفع/سياسة COD/قرار تأمين خادمي، ويغلق insurance payload القديم. |
| PR-2 | `539a5086e73002f3c8e6b5f84ed4e3481a9f99a4` | يفرض صيدلية معتمدة ومُخطرة، ويقلل DTO البث، ويستبدل واجهة الاستجابة الفارغة بمؤلف عرض مرتبط بالكتالوج ومعاينة خادم وTTL. |
| PR-3 | `021d3deb9415ff1c4b8acba606eb3732e0caf44e` | يضيف أمر انتهاء دفعي persistent-state وlease/cursor/outbox intent ويقفل sweep القديم؛ لا scheduler أو worker. |

تفاصيل الجذور وانتقالات السلطة والترحيل والحدود لكل دفعة في `PR1_PHARMACY_POST_SELECTION_GATES.md` و`PR2_PHARMACY_BROADCAST_PRIVACY_AND_COMPOSER.md` و`PR3_DURABLE_PHARMACY_EXPIRY_COMMAND.md`.

## حالة الضوابط الحرجة

| المجال | ما صار مقيداً | ما لا يزال مانعاً للإنتاج |
|---|---|---|
| اختيار عرض صيدلي | الاختيار الذري هو مصدر allocation؛ كل تقدم يتحقق من offer/version/totals ودفع أو تأمين/ COD خادمي. | PSP/webhook حي، reconciliation مالي، وقرار التأمين الخارجي لم تختبر. |
| خصوصية البث | دور JWT وحده لا يكفي؛ يلزم حساب pharmacy معتمد وعضوية notified. DTO لا يعيد order خاماً أو اسم/هاتف/عنوان/مرفقات المريض. | لا E2E ضد حسابات/بيانات حقيقة أو audit للـPHI في كل المستهلكين. |
| مؤلف العرض | `available/unavailable/substitute`، binding بالكتالوج، qty جزئية، preview خادم، TTL. لا إدخال price/stock/fee/ETA. | لا توجد سياسة delivery-zone/fee/ETA خادمية مفعلة؛ النتيجة `unavailable_read_only`. |
| انتهاء العروض والبث | deadlines محفوظة، batches محدودة، claim fencing، transactions، cursor وoutbox intent، ولا auto-allocation. | يلزم تطبيق فهارس الترحيل في بيئة معتمدة قبل تفعيل أي مستدعٍ؛ legacy broadcasts بلا deadline لا تنتهي تلقائياً. |
| outbox/ledger | فشل critical event emissions لم يعد صامتاً، وقرار التأمين/انتهاء العروض يكتبان intent idempotent. Payment intent خادمي مقيد بالطلب/العرض/quote hash وidempotency، والـwebhook writer يتحقق من signature/replay/amount/currency. | لا يوجد بعد worker/retry/DLQ/reconciliation أو دليل atomic settlement لتسليم مادي، وPSP adapter الحي معلّم `sandbox_disabled`. |
| الأسطح غير الحاكمة | `ProviderHome` fail-closed، و`App.tsx` يوجّه كل provider غير Pharmacy إلى unavailable، وlegacy orders/bid mutations تطلب canonical flow. | Doctor/Lab/Radiology/Facility/Nursing/Ambulance تحتاج مراجعة مستقلة قبل أي تفعيل؛ هذا ليس اعتماداً لها. |

## الأدلة المحلية الحديثة

| البوابة | الأمر | النتيجة |
|---|---|---|
| بناء الخادم | `npm run build` داخل `.work/backend` | ناجح بعد الدفعات. |
| مجموعة الخادم الكاملة | `npm test -- --runInBand` داخل `.work/backend` | **102 مجموعة، 529 اختباراً ناجحاً**. يوجد تحذير Mongoose معروف لمسار `errors`، ورسالة webhook fail-closed متوقعة لغياب السر المحلي. |
| اختبار بوابات PR-1 | `pharmacy-insurance-decision` و`pharmacy-allocation.payment-gate` | 6/6 ناجح في التشغيلات المستهدفة؛ ويتضمن رفض update صفري لقرار التأمين. |
| اختبار خصوصية/عروض PR-2 | `pharmacy-broadcast.service` و`pharmacy-offer.service` | 16/16 في التشغيلين المستهدفين؛ يتضمن PII/access وserver quote. |
| اختبار انتهاء PR-3 | `pharmacy-expiry-command.service` | 4/4 ناجح؛ claim/outbox/cursor/no-allocation. |
| فحص تطبيق المزوّد | `npx tsc --noEmit` داخل `.work/provider` | ناجح. | 
| عقود Provider | `npm test -- --runInBand` داخل `.work/provider` | **1 مجموعة، 12 اختباراً ناجحاً**؛ يشمل صراحة عدم تشغيل data/fallback وبوابات الحوكمة. |
| بوابة runtime | `node scripts/check-provider-runtime.js` | `RUNTIME_DATA_GATE=PASS`. |
| سلامة الحزم | `unzip -t` لكلا ZIP | ناجح؛ أُعيد إنشاء الحزم من `.work` الحالي، وحجمها التقريبي 5.4 MB backend و618 KB Provider. |

## ما لم يختبر — لا يُفسر كجاهزية إنتاج

لم تُشغّل اختبارات E2E أو بيئة مرحلية مع Mongo replica set، Redis، PSP/Moyasar webhook، S3/R2، LiveKit، OTP، push، أو جهاز Expo حقيقي. لم يُشغّل ترحيل قاعدة البيانات، ولم يُشغّل scheduler أو cron أو queue worker أو مستدعي أمر الانتهاء، ولم تستخدم بيانات أو أسرار حية. كما لم يثبت recovery بعد فشل ledger أو delivery مادي، ولا worker outbox أو retry/DLQ أو reconciliation.

## الترحيل والتراجع

الترحيل الوحيد الجديد اختياري ومحمي داخل `scripts/migrations/20260827-pharmacy-expiry-indexes.js`. يرفض التنفيذ ما لم يمرر مسؤول تغيير `APPLY_DB_MIGRATION=20260827` و`MONGODB_URI`، ويفحص تكرارات outbox قبل إنشاء الفهرس الفريد. لم يُنفذ. التراجع قبل دمج هو `git revert` للدفعة المطلوبة أو إعادة الفرع إلى التزام سابق عبر عملية مراجعة عادية؛ لا force-push. بعد تطبيق فهرس على بيئة، حذف فهرس unique يحتاج قرار change-management مستقل.

## حزمة المراجع

| الملف | الغرض |
|---|---|
| `review/PR1_PHARMACY_POST_SELECTION_GATES.md` | جذور ومدفوعات/تأمين/انتقالات PR-1. |
| `review/PR2_PHARMACY_BROADCAST_PRIVACY_AND_COMPOSER.md` | DTO الخصوصية والعرض/الكتالوج/preview في PR-2. |
| `review/PR3_DURABLE_PHARMACY_EXPIRY_COMMAND.md` | أمر الانتهاء والترحيل وخيارات المستدعي غير المختارة في PR-3. |
| `review/backend-source-remediation-2026-08-27.patch` | diff نصي للخادم مقابل main. |
| `review/provider-source-remediation-2026-08-27.patch` | diff نصي لتطبيق المزوّد مقابل main. |
| `scripts/check-provider-runtime.js` | بوابة ساكنة مساندة فقط، لا بديل لـE2E. |
