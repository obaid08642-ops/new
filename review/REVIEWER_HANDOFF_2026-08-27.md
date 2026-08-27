# رسالة جاهزة للإرسال إلى المراجع

**الموضوع:** طلب مراجعة فرع إصلاح رحلة مزوّدي الخدمات — لا دمج ولا نشر

مرحباً،

يرجى مراجعة فرع الإصلاح التالي فقط، ومقارنته مباشرة مع `main`:

| البند | القيمة |
|---|---|
| المستودع | `obaid08642-ops/new` |
| الفرع | `remediation/provider-production-governed` |
| رابط الفرع | https://github.com/obaid08642-ops/new/tree/remediation/provider-production-governed |
| رابط المقارنة | https://github.com/obaid08642-ops/new/compare/main...remediation/provider-production-governed |
| التزام لقطة الاستعادة | `f8cf30c14f2f94344eabfc2acaf65f97bf5ec8ae` — `restore(provider): publish governed provider production remediation` |
| التزام الإصلاح | `ac377f4bd821f681b93794d4dd6fe73184a5070f` — `fix(provider): govern service workflow commands` |
| رابط التزام الإصلاح | https://github.com/obaid08642-ops/new/commit/ac377f4bd821f681b93794d4dd6fe73184a5070f |

> **الحكم المطلوب حالياً: NO-MERGE / NO-DEPLOY.** لا تعتمد نجاح البناء أو اختبارات الوحدة كدليل على جاهزية النشر.

يرجى بدء المراجعة بالوثائق التالية الموجودة داخل الفرع:

1. `review/REMEDIATION_2026-08-27.md` — نطاق التغييرات، العقود، نتائج الاختبارات، والفجوات الحية.
2. `review/backend-source-remediation-2026-08-27.patch` — الفرق النصي للخادم مقابل `main`.
3. `review/provider-source-remediation-2026-08-27.patch` — الفرق النصي لتطبيق المزوّد مقابل `main`.
4. `NabdProvider-provider.zip` و`nabdah-backend.zip` — مصادر التنفيذ الفعلية، لأن المصدر المتتبع محفوظ داخل ZIP.

يرجى فحص خصوصاً: ملكية الطلبات والحسابات، اختيار المريض للعرض الصيدلي، سعر/مخزون الخادم، انتقالات التغطية، حظر الحالات المحلية غير الحاكمة، storage الخاص، مفاتيح idempotency للسحب، وسلطة مهمة الإسعاف.

نتائج محلية متاحة: بناء الخادم، 94 مجموعة و494 اختباراً، فحص نوع تطبيق المزوّد، 12 اختبار عقد للواجهة، عقود مشتركة، وبوابة منع بيانات التشغيل الوهمية. هذه **لا** تشمل E2E أو بيئة مرحلية.

**شروط ما قبل أي موافقة للدمج أو النشر:** E2E معزول، MongoDB وRedis، S3/R2، مزود الدفع وwebhook/replay، LiveKit، OTP والإشعارات، أجهزة فعلية، واختبار ترحيل/استرجاع إن لزم. كما يجب أن يعيد المراجع التحقق من أن ميزات الطبيب والتمريض المعطلة صراحةً لا تظهر كوظائف مكتملة.

شكراً.
