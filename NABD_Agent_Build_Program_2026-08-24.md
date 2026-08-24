# برنامج بناء مرحلي لوكيل التنفيذ

## الهدف التشغيلي

يبني الوكيل النواقص المحددة في `NABD_Remaining_Build_Backlog_2026-08-24.md` وفق `NABD_Authoritative_Business_Rules_2026-08-24.md`. لا يرسل دفعة عملاقة؛ كل مرحلة لها مخرج مستقل، اختبارات قبول، وcommit قابل للمراجعة. بعد كل مرحلة يتوقف الوكيل ويرفع فرعه، ثم يسلّم تقريرًا للمراجع. لا يبدأ المرحلة التالية قبل قبول المراجع أو حصوله على قائمة تصحيح صريحة.

## قواعد حاكمة لكل المراحل

| القاعدة | التطبيق |
|---|---|
| فرع العمل | ينشئ الوكيل `agent/build-<phase>-<topic>` من فرع المراجعة المحدد له؛ لا يعمل على `main`. |
| الحجم | commit واحد أو commits صغيرة نظيفة لكل قصة/عقد؛ لا rewrite أو reformat واسع بلا صلة. |
| source of truth | يقرأ قواعد الأعمال والسجل قبل التعديل، ويستبدل العقود المتعارضة بدل إضافة endpoint ثالث موازٍ. |
| القرارات الغامضة | يكتب `DECISION_REQUIRED` ولا يفترض سياسة منتج. |
| الأموال | السعر/الإجمالي/co-pay من الخادم فقط؛ لا paid من العميل؛ PSP fail-closed. |
| الأمن | دور + ملكية + transition + idempotency + audit لكل mutation حساس. |
| الجودة | backend build/tests، web/mobile checks عند التعديل، E2E متعدد الأدوار، فحص أسرار و`git diff --check`. |
| التسليم | push فقط إلى فرع الوكيل، مع hash، لا merge ولا deploy ولا resolve/ignore لـSentry. |

## المرحلة 0 — اكتشاف وإغلاق حدود العقود

**الهدف:** منع البناء فوق مسارات متعارضة، خصوصًا الأشعة والحجوزات والدفع والتأمين.

| البند | المطلوب | دليل القبول |
|---|---|---|
| P0-1 | inventory للـcontrollers/models/routes الخاصة بكل خدمة؛ استخراج المسارات المكررة أو المتنازعة | جدول route → controller → schema → client consumer → الحالة |
| P0-2 | تثبيت قرار معماري لمصدر حقيقة الطلب/العرض وبيانات legacy/migration | ADR قصير، قائمة migrations/compat، لا كود إنتاجي إن بقي قرار منتج مفتوح |
| P0-3 | خريطة حالة لكل service: patient/provider/admin/payment/insurance/report | diagram أو Markdown transitions مع actor وشرط دخول/خروج |
| P0-4 | قائمة قرارات مالك المنتج اللازمة | ملف `DECISION_REQUIRED.md` يحوي السؤال والبدائل والأثر، بلا افتراض |

**لا يبدأ الوكيل المرحلة 1** قبل أن يرفع هذا inventory والـADR. يراجعها المراجع أولًا.

## المرحلة 1 — CORE-01: عقد طلب/عرض/قبول موحد

**الهدف:** إنشاء أساس يحكم ترتيب الطلب والعرض وقبول المريض قبل الدفع، من دون نقل الخدمات جميعًا دفعة واحدة.

1. تصميم `ServiceRequest` و`FulfillmentQuote` و`QuoteLine` أو طبقة مكافئة موثقة، بإصدارات وحالات واضحة وaudit/idempotency.
2. تنفيذ ownership/RBAC/state machine ومفاتيح expiration وحماية stale quote.
3. ربط خدمة تجريبية واحدة منخفضة المخاطر بالعقد—لا يختار الصيدلية قبل توثيق قرار المنتج، ويمكن اختيار home-care أو diagnostic service بعد موافقة المراجع.
4. نشر DTO/OpenAPI/contracts، migration non-destructive، fixtures، وE2E patient/provider.

**معايير القبول:** request بلا دفع، quote خادمي لا يثق بسعر العميل، patient acceptance، quote expiry، رفض role غير مالك، cancellation/retry، وعدم تكرار mutation.

## المرحلة 2 — INS-01: التأمين المشترك حسب البند

**الهدف:** تحويل التأمين من مسار ضيق إلى workflow يدوي موحد بعد إرسال الطلب وقبل الدفع.

1. decision بندي وربطه بطلب/quote وإصدار محدد.
2. provider inbox/decision API مع مرجع موافقة ومستندات/سبب.
3. patient read model لتفصيل full/partial/rejected/documents-required، وخيار قبول/إلغاء/cash صريح.
4. co-pay transaction يبدأ فقط من القرار المقبول، ويقارن amount وquote version وpatient.
5. دمج أولي في خدمة واحدة مختارة بعقد CORE-01، ثم tests موسعة.

**معايير القبول:** 5 بنود بتغطية كاملة/جزئية/مرفوضة، لا دفع مبكر، لا cash fallback تلقائي، decision انتهى يمنع الدفع، audit كامل، E2E patient/provider/admin.

## المرحلة 3 — PHARM-01 وRX-01: الصيدلية أولًا

**الهدف:** بناء الرحلة ذات أعلى تعقيد تجاري: طلب سلة → broadcast → عروض → اختيار → تأمين/دفع → تحضير/توصيل أو استلام.

| قصة البناء | backend | الواجهة المريض | الواجهة الصيدلية |
|---|---|---|---|
| P3-1 طلب عرض | cart snapshot + Rx ownership + location + broadcast range | مراجعة السلة وإرسال طلب لا دفع | inbox طلب جديد |
| P3-2 عرض صيدلي | quote lines/availability/alternatives/fees/expiry | قائمة مقارنة العروض | إنشاء/تعديل/سحب عرض |
| P3-3 اختيار المريض | acceptance واحد، lock العرض، audit | قبول بديل أو رفضه، اختيار quote | تأكيد العرض المختار |
| P3-4 تأمين/دفع | ربط quote بالتأمين أو payment intent بعد القبول | انتظار/قرار/co-pay أو card/cash الصحيح | قرار تأمين/بدء التحضير |
| P3-5 fulfillment | inventory reservation، pickup/delivery timeline، cancel/refund | تتبع واستلام وتقييم/دعم | تحضير/تسليم/فشل/reassign |

**معايير القبول:** سيناريو 5 أدوية وثلاث صيدليات، بدائل، quote expiry، Rx مطلوب، رفض/partial insurance، cash/card بعد quote، provider/patient authorization، E2E وواجهات web/mobile.

## المرحلة 4 — CONS-01: الاستشارات الثلاثية

**الهدف:** تنفيذ online/clinic/home كرحلات طلب وموافقة ودفع ونتيجة، لا مجرد appointment API.

- توصيل القنوات بالعقد الموحد بعد مراجعة slot/location/doctor availability.
- شاشة اختيار/مراجعة/انتظار/قرار تأمين أو quote/دفع/timeline/إلغاء/reschedule.
- provider inbox مع قبول/رفض/اقتراح slot/waiting/no-show/notes/prescription/result.
- LiveKit token فقط للمريض والطبيب المؤهلين وبعد شروط الموعد؛ اختبار خدمة LiveKit external لا يموّه بفحص JWT محلي فقط.

**معايير القبول:** clinic cash، clinic insurance، video card sandbox، home insurance؛ role boundaries؛ slot lock؛ فشل PSP؛ no-show؛ إلغاء/استرداد؛ web/mobile parity.

## المرحلة 5 — LAB-01 وRAD-01 وREP-01: التشخيصات والتقارير

**الهدف:** إكمال المختبر والأشعة من الطلب إلى report published مع توحيد الأشعة أولًا.

1. تنفيذ خطة توحيد مسار الأشعة التي قبلها المراجع: controller واحد أو adapter طبقة واضحة، migration/compat واختبارات منع ازدواجية.
2. بناء provider intake/accept/reject/appointment/assignment.
3. workflow مختبر: sample/QC/processing/result draft/review/publish.
4. workflow أشعة: preparation/check-in/scan/report draft/review/publish.
5. storage private/report ownership، patient report UI بعد publish فقط، cancellation/refund.

**معايير القبول:** patient + lab/center + admin E2E، report private قبل publish، provider غريب ممنوع، price/service server snapshot، home/facility حيث تدعمه الخدمة فقط، web/mobile report screens.

## المرحلة 6 — HOME-01: التمريض والرعاية المنزلية

**الهدف:** تحويل booking إلى رحلة ميدانية قابلة للتشغيل.

- provider availability/assignment/inbox، accept/reject/counter-proposal.
- address/geofence/GPS failure behavior، transit/arrived/start/complete/no-show/emergency-abort.
- sessions، plan، vitals، report، supply requests، patient timeline وprovider UI.
- insurance workflow الموحد وcash بعد تأكيد المزوّد؛ card فقط إذا تقرر وأصبح PAY-01 متاحًا.

**معايير القبول:** E2E patient/nurse/admin لكل حالة أساسية واستثناء، provider غير معيّن ممنوع، إلغاء واسترداد عند السياسة، واجهات web/mobile/provider.

## المرحلة 7 — PAY-01 وCANCEL-01: PSP والاسترداد

**شرط دخول:** يقدّم مالك المنتج إعدادات Moyasar sandbox آمنة، ويعتمد قرارات cash/split/refund المعلقة.

- sandbox payment intent، hosted checkout أو المسار المعتمد، webhook signature، idempotency، event audit، reconciliation.
- إعادة محاولة/إلغاء/رفض/انتهاء، refund كامل/جزئي حسب policy.
- capabilities لا تعلن card قبل صحة config/sandbox. لا live.

**معايير القبول:** webhook موقّع ناجح وفاشل وreplay، amount mismatch، refund، Sentry events sandbox، لا credentials في Git/logs.

## المرحلة 8 — UX-01 وQA-01: اكتمال الواجهات وقبول الإصدار

**الهدف:** ضمان أن كل عقد مبني ظاهر كرحلة شاشة بشاشة في web/mobile/provider.

1. إنشاء parity matrix: Patient Web / Patient Mobile / Provider / Admin لكل خدمة وحالة.
2. اختبارات component/integration وE2E مرئية، screenshots أو فيديو قصير لكل walkthrough عند الإمكان.
3. accessibility، loading/error/empty/offline/deep-link ownership، i18n Arabic/English حيث كان المنتج يدعمه.
4. suite موحدة منخفضة الذاكرة، E2E sandbox منفرع لكل run، secret scan، docs، release gates.

**معايير القبول:** لا حالة service في backend غير ممثلة للمريض والمزوّد عند الحاجة، ولا زر يدعي الدفع أو النجاح في حالة pending/review، وكل story لها test IDs وسجل دليل.

## بروتوكول التسليم بعد كل مرحلة

يرسل الوكيل النص التالي في تقريره، مع إجابة فعلية لكل سطر:

```text
PHASE: <identifier>
BRANCH: <branch>
BASE COMMIT: <hash>
NEW COMMITS: <hashes>
BUSINESS RULES IMPLEMENTED: <IDs>
ROUTES/SCHEMAS CHANGED: <list>
WEB SCREENS CHANGED: <list>
MOBILE SCREENS CHANGED: <list>
PROVIDER/ADMIN SCREENS CHANGED: <list>
MIGRATIONS/COMPAT: <none or exact plan>
TEST COMMANDS AND RESULTS: <commands + totals>
E2E SCENARIOS AND RESULTS: <exact totals + log path>
SECURITY CHECKS: <RBAC, ownership, idempotency, secrets>
DECISION_REQUIRED: <none or IDs>
KNOWN LIMITATIONS: <explicit>
NO MERGE / NO DEPLOY CONFIRMATION: yes
```

## رد المراجع على الوكيل

يرد المراجع بأحد ثلاثة أوامر فقط:

| الرد | المعنى |
|---|---|
| `ACCEPT_PHASE <id>` | المرحلة اجتازت العقود والاختبارات؛ يسمح ببدء المرحلة التالية فقط. |
| `FIX_REQUIRED <id>` | يرسل المراجع قائمة defects مرقمة مع دليل ومعيار إعادة الاختبار؛ لا يبدأ الوكيل قصة جديدة. |
| `DECISION_REQUIRED <id>` | يتوقف الوكيل عن السلوك الغامض إلى أن يجيب مالك المنتج على السؤال المحدد. |

## ما لا يفعله الوكيل

- لا يدمج `main`، ولا ينشر، ولا يغير تهيئة إنتاجية، ولا يستخدم أسرارًا حية.
- لا يحل أو يتجاهل Sentry issue بلا تحقق إصدار منشور.
- لا يضيف bypass production من أجل test أو demo.
- لا يعيد كتابة المشروع أو يستبدل framework دون موافقة.
- لا يعلن أي مجال `COMPLETE` قبل أن يقبل المراجع سيناريوهات المريض والمزوّد والدفع/التأمين والنتيجة الملائمة لذلك المجال.
