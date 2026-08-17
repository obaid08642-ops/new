# سجل النسخ الحاكمة لمنصة نبض

**التاريخ:** 2026-08-18

## الغرض

هذا السجل يحدد مصدر كل مكوّن قبل بدء التدقيق الشامل. لا تُعد نتيجة أي اختبار إغلاقاً تشغيلياً ما لم تُطابق النسخة المصدرية مع النسخة المنشورة فعلياً، ويُسجّل commit أو build identifier المقابل.

## النسخة المطلوب نشرها

| المكوّن | المصدر المحلي للمراجعة | المصدر على فرع المصالحة | الحالة الحالية |
|---|---|---|---|
| Backend/Database | `/home/ubuntu/nabdah-remediation/backend` ونسخة العمل المؤقتة المستخدمة في آخر patches | `nabdah-backend.zip` داخل `/home/ubuntu/nabdah-live-work` | الإصلاحات المحلية موثقة؛ يلزم تأكيد أن الأرشيف في commit `41d1103` هو الذي سيُبنى ويُنشر |
| Provider App | `/home/ubuntu/nabdah-remediation/provider-app` | `/home/ubuntu/nabdah-live-work/provider-app` | 66 ملف مصدر، commit `41d1103`، TypeScript/Jest/Android prebuild مجتازة |
| Patient App | `/home/ubuntu/nabdah-remediation/patient-app` أو snapshot المصدر الكامل عند المقارنة | `nabd_plus_patient_app.zip` | يلزم inventory ومقارنة hash قبل اعتماد النسخة |
| Admin Dashboard | `/home/ubuntu/nabdah-remediation/admin-dashboard` و`admin-build-work/web-admin` عند الحاجة | `Napd-admin-dashboard.zip` | يلزم inventory ومقارنة hash قبل اعتماد النسخة |
| Audit evidence | `/home/ubuntu/nabdah-live-work/audit-artifacts` | نفس الفرع | traceability مستمر ويجب تحديثه لكل موجة |
| Master TODO | `/home/ubuntu/nabdah-live-work/todo.md` | نفس الفرع | يُحدّث قبل كل تنفيذ جديد وبعد كل إغلاق |

## قواعد المطابقة

يجب على المدقق قبل النشر تسجيل commit المصدر، hash الأرشيف، hash build artifact، ووقت النشر. يجب أن يثبت server health endpoint ونسخة التطبيق أو release identifier أن الخدمة التي اختُبرت هي نفسها التي بُنيت من commit المطلوب. إذا تعذر إثبات المطابقة، تُصنف النتيجة **UNRECONCILED** ولا تُستخدم لإغلاق العيب.

## قواعد الاختبار

تُستخدم حسابات sandbox فقط. لكل mutation يجب تسجيل الحالة قبلها وبعدها، ومعرفات الكيانات، والاستجابة، والتنظيف أو سبب إبقاء البيانات. لا يُستخدم mock أو fallback لإثبات جاهزية مسار حقيقي. الدفع الحي يبقى محجوباً بعقد `502 payment_gateway_unavailable` إلى أن يُفعّل Moyasar تجارياً.

## نطاق المراجعة الذي لا يجوز إسقاطه

يشمل التدقيق تطبيق المريض، تطبيق مزودي الخدمات، لوحة الإدارة، والـbackend/database. ويشمل كل شاشة وزر ونموذج وحالة تحميل/فراغ/خطأ، وكل خدمة من الطلب حتى الإتمام أو الإلغاء، مع تقسيم المسارات حسب نوع الخدمة، مكان التنفيذ، الدفع النقدي/البطاقة/التأمين، الجدولة والإجازات، الإشعارات، المحادثة، المكالمات، GPS، التقارير، التقييم، المحفظة، الصلاحيات، اللغات، RTL/LTR، والثيم التلقائي.

## الحكم الحالي

لا يوجد حتى الآن حكم جاهزية نهائي. **Provider App source/build gate مجتاز**، بينما تشغيل Provider App الكامل وإعادة التحقق الحي لكل الخدمات ما زالا معلقين على نشر `41d1103`. كما أن inventory التفصيلي لتطبيق المريض ولوحة الإدارة ومصفوفة السيناريوهات الشاملة ما زال ضمن مراحل التنفيذ التالية.


## نتيجة المقارنة البنيوية

أظهرت المقارنة أن مجلدات remediation الحالية ليست متكافئة: Patient remediation يحتوي 51 ملفاً فقط مقابل 613–627 ملفاً في snapshots الكاملة، وAdmin remediation يحتوي 11 ملفاً فقط مقابل 691 ملفاً في snapshot `nabdah-live-extracted/admin-app/web-admin`. لذلك لا يجوز استخدام مجلدي remediation هذين كمرجع نهائي لجرد الشاشات أو بناء release؛ سيُستخدم snapshot الكامل للمراجعة والتحقق، ثم تُطابقه نسخة GitHub/الأرشيف قبل النشر.

| المكوّن | النتيجة | قرار التدقيق |
|---|---|---|
| Provider App | 66 ملف مصدر على فرع المصالحة، TypeScript/Jest/prebuild مجتازة | صالح للجرد الحالي، مع بقاء runtime E2E بعد النشر |
| Patient App | remediation ناقص؛ snapshot الكامل `nabdah-live-extracted/patient-app/nabd_plus` يحوي 627 ملفاً | لا اعتماد قبل مقارنة الأرشيف الكامل والـhash والـentrypoints |
| Admin Dashboard | remediation ناقص؛ snapshot الكامل `nabdah-live-extracted/admin-app/web-admin` يحوي 691 ملفاً | لا اعتماد قبل مقارنة الأرشيف الكامل والـhash والـroutes |

هذه النتيجة نفسها فجوة تتطلب معالجة في الخطة: يجب أولاً استعادة/ربط المصادر الكاملة للمريض والإدارة في فرع المصالحة أو إثبات أن الأرشيفين الموجودين يمثلانها، ثم تشغيل gates قبل الادعاء بأن كل الشاشات فُحصت.
