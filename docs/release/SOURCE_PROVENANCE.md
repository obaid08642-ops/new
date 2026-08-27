# سجل مصدر الإصدار — Patient Production

**فرع الإصدار:** `release/patient-production`  
**المبدأ:** لا تُعتبر أي شجرة مصدر إنتاجية ما لم تربط المكوّن وcommit البناء وhash الأثر ومعرف النشر ونتيجة health check.

| العنصر | خط الأساس الحالي | الحالة | الإجراء قبل الدمج إلى `main` |
|---|---|---|---|
| فرع الإصدار | `21006ccc9422ca1e95c62c45867b2a704841fc09` من `fix/e2e-operational-contracts-20260814` | مثبت كبداية حوكمة فقط. | تثبيت manifest مصدر لكل مكوّن قبل دمج وظائف جديدة. |
| Backend | `origin/backend/contract-pack-v1@1026f7c407840e5129f1eb501275659329e072f8` مستورد تحت `backend/`. | قيد التحقق؛ لم يدمج إلى فرع الإصدار المحمي بعد. | تثبيت hash build وCI أخضر ومعرف نشر قبل دمج الإصدار. |
| Patient Mobile | `origin/agent/mobile-p1-fixes-20260822@c1d7b01bcb93d774d6a6696d419b6ae308c993c5` مستورد تحت `patient-app/` مع استبعاد ملفات credentials native. | قيد التحقق؛ يحتاج إعدادات native عبر الأسرار. | توثيق commit وnative build id وملفات config غير السرية. |
| Patient Web | `origin/agent/web-complete-v2-20260822@62c2bc66b2838ae7a86f75018352da3424154e7c`، مستورد تحت `patient-web/`. | قيد التحقق؛ لم يدمج إلى فرع الإصدار المحمي بعد. | تثبيت lockfile وبوابات البناء والاختبار، ثم PR منفصل إلى `release/patient-production`. |
| Provider | المصدر الكامل موجود في baseline أقدم لكنه مفقود من لقطة الحجر الصحي. | لا يعتمد الحجر الصحي كمصدر مزود. | تثبيت المصدر المستخدم لعرض الصيدلية وقرار التأمين مع اختبارات ownership. |
| Quarantine | `quarantine/workstation-source-51a84c7@6d4d42fed4673f89961e0e403469ce1e3c5458dc` | read-only. | يسجل كل ملف منتقل: المصدر، الهدف، سبب النقل، الاختبار، وPR. |

## نموذج سجل النقل الانتقائي

| النقل | المصدر | الهدف | السبب | الدليل المطلوب |
|---|---|---|---|---|
| مثال شكلي فقط | `quarantine/...:<path>@<sha>` | `<release-path>` | إصلاح محدد | test name، screenshot أو API evidence، PR. |

لا يجوز ملء هذا السجل بمصدر افتراضي أو نقل جماعي. يبقى المرجع مكتملًا فقط عندما يحمل كل مكوّن build-to-deploy chain قابلاً للتحقق.

## استيراد Patient Web — 27 أغسطس 2026

نُقلت شجرة الويب المباشرة فقط من المرجع المثبت إلى `patient-web/`. استبعد النقل المتعمد أرشيفات التطبيقات وملفات Docker والملفات التي لا تدخل runtime الويب، حتى يبقى سجل diff قابلاً للمراجعة ولا يعيد إدخال مصادر مضغوطة أو مسارات غير قابلة للنشر.

| الحقل | القيمة |
|---|---|
| المرجع | `origin/agent/web-complete-v2-20260822@62c2bc66b2838ae7a86f75018352da3424154e7c` |
| الجذر المصدر | جذر المستودع في المرجع المذكور، بالمسارات المباشرة لتطبيق Next.js. |
| الهدف | `patient-web/` في `feature/patient-production-source-baseline`. |
| المستبعد | ملفات `*.zip` و`Dockerfile`، والأرشيفات غير المباشرة، وأي بيانات أو أسرار تشغيلية. |
| قبول النقل | فحص package identity ووجود `next.config.ts` وتدقيق الملفات المستبعدة، ثم frozen install وtypecheck وtest وbuild في المرحلة 3. |

## مصالحة Backend وPatient Mobile — 27 أغسطس 2026

أدرجت المصادر المباشرة للمكوّنين في فرع مصالحة مصدر منفصل. استبعد النقل الأرشيفات والاعتمادات المثبتة محلياً وملفات credentials native، ويجب أن تمر جميع إعدادات Firebase وSentry وغيرها عبر إدارة الأسرار وخط CI. لا يجعل هذا النقل الإصدار قابلاً للنشر بذاته؛ إذ تظل بوابات التثبيت وفحص الأنواع والاختبارات والبناء ومعرف النشر شرطاً مستقلاً للقبول.

| المكوّن | المرجع | الجذر المستورد | قيد النقل | دليل التحقق الأولي |
|---|---|---|---|---|
| Backend | `origin/backend/contract-pack-v1@1026f7c407840e5129f1eb501275659329e072f8` | جذر المشروع إلى `backend/` | لا Docker أو archives أو credentials. | `package-lock.json` موجود وهوية الحزمة `nabd-backend`. |
| Patient Web | `origin/agent/web-complete-v2-20260822@62c2bc66b2838ae7a86f75018352da3424154e7c` | ملفات تطبيق Next.js إلى `patient-web/` | لا archives أو Docker؛ ملف القفل من المرجع نفسه. | `pnpm-lock.yaml` بصمة SHA-256: `1e2425cb44ba7ac73da7aec774b92b9ce1aa2be31b2df3611702273d8bedc4c7`. |
| Patient Mobile | `origin/agent/mobile-p1-fixes-20260822@c1d7b01bcb93d774d6a6696d419b6ae308c993c5` | `nabd_plus_patient_app/` إلى `patient-app/` | استبعدت `google-services.json` و`GoogleService-Info.plist` وkeystore وp8. | `package-lock.json` موجود وهوية الحزمة `nabdah-plus`. |
