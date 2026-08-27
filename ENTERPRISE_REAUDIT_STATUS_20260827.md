# إعادة تدقيق وتنفيذ لوحة الإدارة المؤسسية

## النطاق

أُعيدت قراءة ملف المتطلبات الأصلي `pasted_content.txt` ومقارنة بنوده مع فرع `agent/enterprise-control-center-20260827` المرفوع على GitHub. تم التدقيق من نسخة clone نظيفة من GitHub، وليس من ملفات الجلسة السابقة.

## الإصلاحات المضافة في إعادة التدقيق

أضيفت شاشة `catalog-governance` التي تستخدم عقد `GET /api/v1/medicines/admin/catalog` و`POST /api/v1/medicines/admin/import-csv` و`GET /api/v1/medicines/admin/catalog/:id/price-history` وقرارات shortage الموجودة فعلياً. أضيف إلى backend سجل `medicine_price_history`: يسجل السعر الابتدائي عند إنشاء صنف، ويسجل كل تغيير سعر مع السبب والمدير والتاريخ، ويرفض تغيير السعر بلا سبب لا يقل عن خمسة أحرف.

أضيفت جلسات دعم impersonation حقيقية ومحدودة: `POST /api/v1/admin/impersonation/start`، `GET /api/v1/admin/impersonation`، و`POST /api/v1/admin/impersonation/:id/revoke`. الجلسة مدتها القصوى 15 دقيقة، تمنع استهداف المديرين، تتطلب `user.impersonate` وسبباً، وتكتب سجلاً تدقيقياً. لم يُعاد تفعيل header impersonation القديم؛ ما زال مرفوضاً fail-closed. أضيفت شاشة `impersonation` وربطت بالتنقل تحت الصلاحية المناسبة.

## التحقق

نجح بناء backend بعد الإصلاحات، ونجحت لوحة الإدارة في إنتاج routes للصفحات الجديدة والصفحات الأساسية. نجحت بوابة التكامل الموسعة بنتيجة **22/22** اختباراً. الاختبارات تشمل A1 إلى A7، دورة الطلبات، المالية، التحليلات، CRM/GDPR، CMS والكوبونات، System Ops، Command Center، الحوكمة والرايات، وتبدأ وتبطل جلسة impersonation.

تثبيت `npm ci --ignore-scripts` للbackend ولوحة الإدارة نجح من نسخة clone نظيفة. `git diff --check` بلا أخطاء. فحص mock/data الخاص بالرموز والتخزين المحلي لم يجد استخداماً تنفيذياً؛ النتيجة الوحيدة كانت كلمة `localStorage` داخل تعليق توثيقي يشرح إزالته. حقول `placeholder` الخاصة بعناصر الإدخال ليست بيانات وهمية.

## نقاط تحتاج staging قبل النشر

لا يمكن إثبات استلام البريد أو عمل Push أو الدفع الحي داخل بيئة الاختبار بلا credentials ومزودي الخدمة الفعليين. يجب تنفيذ smoke test على staging باستخدام MongoDB وRedis/BullMQ وموفر البريد وPush وMoyasar، ومراجعة bulk import والكتالوج بصرياً، والتحقق من rollout داخل تطبيقات العملاء. هذه متطلبات تشغيلية وليست بيانات mock داخل لوحة الإدارة.

## حالة GitHub

الفرع: `agent/enterprise-control-center-20260827`. يجب رفع commit إعادة التدقيق هذا إلى نفس الفرع، ثم فتح Pull Request إلى `main` للمراجعة.
