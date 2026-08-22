# تقرير المرحلة الأولى — مصالحة Nabd Plus Web V2

## نقطة الانطلاق

تم إنشاء الفرع `agent/web-complete-v2-20260822` من commit `db404ee846832968a5cfa8c96d0d4101ad36efd0` كما طلب البرومبت. لم يتم تعديل `main` ولم يُستخدم force-push. الفرع يحتوي أحدث كود Patient Web الذي يجب أن يكون أساس البناء، بينما `agent/nabdah-web-parity-phase0` و`08d14c9` مراجع تاريخية فقط.

أصول المرجع الملزمة موجودة في `origin/main`: `nabd_plus_patient_app.zip`، `nabdah-backend.zip`، `audit-artifacts/nabd-patient-api-openapi.json`، `audit-artifacts/PATIENT_WEB_CONTRACT_PACK_V1.md`، `audit-artifacts/PATIENT_WEB_BUILD_GUIDE.md`، و`NABDAH_PROJECT_REFERENCE.md`. تم استخراج Mobile zip إلى workspace معزول للقراءة فقط.

## الأدلة والعدادات

| المصدر | النتيجة |
|---|---:|
| Mobile route/screen candidate files | 293 |
| Web route files (`page.tsx`, `route.ts`, `route.tsx`) | 52 |
| Mobile API-call candidate lines | 360 |
| Web patient GET-only allowlist entries | 37 |
| Web test/spec files في baseline | 121 |
| OpenAPI المنشور | 1234 مسارًا حسب المرجع المعتمد |

الجدول الذري القابل لإعادة الإنتاج محفوظ في `WEB_V2_RECONCILIATION_ATOMIC.json` و`WEB_V2_RECONCILIATION_ATOMIC.tsv`. وهو يضم كل candidate route وAPI-call line وallowlist entry، وليس ادعاءً بأن كل سطر يمثل شاشة مستقلة.

## مصالحة الفروع

الفرع المختار هو `agent/web-complete-20260821` عند `db404ee8`، وتم إنشاء فرع V2 جديد منه. مقارنةً بـ`origin/main` يوجد اختلاف واسع في الأرشيفات ونسخة الويب، لذلك لا يجوز دمج main فوقه أو البناء فوق الفرع التاريخي `agent/nabdah-web-parity-phase0`. تم الاحتفاظ بأدلة main كمرجع لا ككود تشغيل، وتم رفض أي ادعاء سابق عن Backend Contract Pack V1 لأن البرومبت يقرر أن تلك التعديلات لم تصل GitHub.

## نتيجة Mobile truthfulness review

الموبايل ليس مرجعًا أمنيًا يُنسخ حرفيًا. القراءة المباشرة تؤكد وجود مسارات mutations في Pharmacy وHealth وConsultations وChat وFamily وInsurance وNutrition وغيرها. كما أن التقرير المرفق في main يوثق عيوبًا يجب ألا تنتقل إلى الويب: تخزين tokens في AsyncStorage، نجاحات mutation غير مضمونة، offline queue بلا تشفير/idempotency كافيين، credentials في navigation parameters، وpassword guest ثابتة. الويب سيستمر في httpOnly server sessions وserver-side ownership ورفض أي mutation بلا عقد.

## التصنيف التنفيذي الأولي

### يمكن تنفيذه بالعقود الحية

أي surface له route موثق في `nabd-patient-api-openapi.json` ويمكن تحويله إلى parser مقيد، server wrapper، allowlist إن كان GET، واختبار owner/stranger/unauth؛ يشمل تحسينات القراءة الحالية، وواجهات public catalog/SEO، وبعض profile/health/prescription/home-care detail إذا كان DTO والملكية واضحين في OpenAPI.

### محجوب بعقد Contract Pack V1

عمليات OTP bridge، Cart item mutations/checkout، booking mutations، reminders/vitals mutations الجديدة، family invite/join/permissions، chat message/read/rt-token، bookmark/settings/session mutations، media purpose/owner binding، وHealth ID/profile mutations لا تُفتح من Mobile source وحده. يجب أن يظهر endpoint وDTO وerror codes وownership وidempotency في OpenAPI المنشور أولًا؛ وإلا تبقى Deferred أو تُنفذ خلف contract test دون mock data.

### جدول الرحلات الـ72

لم يظهر ملف مستقل باسم `72` أو `72 journeys` في target branch. توجد أدلة وخرائط متعددة للـjourneys والـcontract inventory، لكن لا يجوز اعتبارها جدولًا مكتملًا 72/72 قبل توليده من route inventory وMobile API candidates وربطه بمسارات OpenAPI. لذلك سيُعاد بناء جدول 72 في المرحلة الثانية، مع أعمدة screen/action/route/method/OpenAPI status/ownership/idempotency/web status/evidence.

## الحكم

هذه المرحلة أغلقت المصالحة فقط ولم تضف feature code. نقطة البناء الصحيحة هي `agent/web-complete-v2-20260822` من `db404ee8`. القرار الأمني هو: تنفيذ النواقص ذات العقود الحية فقط، وتوثيق الباقي محجوبًا، وعدم نسخ Mobile security defects. لا يوجد بعد حكم GO للـproduction؛ الحكم الحالي هو **GO للمرحلة الثانية (atomic parity matrix)** و**NO-GO للتسليم النهائي** حتى اكتمال الجرد والبوابات.
