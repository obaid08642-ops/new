# بوابة نشر وتحقق ما بعد النشر

## 1. قبل النشر

يُسجّل المدقق commit المصدر `41d1103`، hash كل archive، نسخة قاعدة البيانات، وسيلة rollback، ووقت بدء النشر. يجب التأكد أن أصول Patient App وProvider App وAdmin Dashboard والـbackend التي ستُبنى هي نفسها الأصول المعتمدة في سجل النسخ، لا snapshot ناقصاً أو مجلداً مؤقتاً.

## 2. بعد النشر مباشرة

يُتحقق من SHA/release identifier داخل السيرفر، ثم تُفحص liveness وreadiness. نتيجة liveness الحالية عبر origin هي 200، لكن readiness كانت 500؛ لذلك لا يبدأ E2E حتى تُفسر readiness وتصبح سليمة أو يقدّم المدقق قراراً موثقاً يحدد سبب الاستثناء. يجب حفظ logs وHTTP status ووقت كل probe.

## 3. smoke tests قراءة فقط

تُختبر المصادقة sandbox، profile، catalog، service directory، provider availability، patient timeline، notifications list، wallet read، family list، admin login، وكل route عام/محمي أساسي. تُسجل الاستجابة والزمن والنسخة، ولا تُستخدم بيانات حقيقية.

## 4. مصفوفة Provider App

لكل نوع مزود متاح: doctor، lab، radiology، pharmacy، nursing، hospital/facility، ambulance، يُنفذ login/onboarding state ثم online/availability، وصول broadcast أو queue، inbox rendering، accept، reject، timeout، reassign، transition، patient minimization، chat، call، GPS، report/prescription، cancellation/no-show، notification، wallet/withdrawal، settings، وlogout. يُختبر provider2 على طلب provider1، ويجب أن تكون القراءة أو mutation غير المصرح بها 403/404.

## 5. مصفوفة Patient App

تُنفذ الاستشارات أونلاين/عيادة/منزل مع cash/card/insurance، والصيدلية delivery/pickup/refill، والمختبر branch/home، والأشعة branch/home، والتمريض home visit، والمستشفى، مع إنشاء الطلب والتوجيه والقبول والتنفيذ والتقرير والإلغاء والتقييم والإشعار. تُضاف الفروع الخاصة بالـslots والإجازات وإعادة الجدولة وno-show وchat/call/GPS والتأمين والـcopay.

## 6. Admin Dashboard

تُختبر RBAC والاعتمادات والمستخدمون والمزودون والمنشآت والكتالوج والأدوية والطلبات والحجوزات والـbroadcast والتأمين والدفع والـpayouts والـledger والتقارير والتمريض والإسعاف والإشعارات وaudit logs والتصدير والتأكيدات قبل العمليات الحساسة. لا تُختبر أي عملية حذف أو refund حقيقي.

## 7. الأدلة والحكم

لكل سيناريو تحفظ الخطوات، الحساب، endpoint، payload المنقح، status/body، معرف الكيان، الحالة قبل/بعد، screenshot أو log عند الحاجة، ونتيجة ownership. تكون النتيجة PASS فقط عند اكتمال source + automated + live evidence؛ وFAIL عند العيب؛ وBLOCKED للدفع/مزود غير متاح/جهاز فعلي؛ وUNRECONCILED عند عدم تطابق النسخة؛ وNOT IMPLEMENTED عند غياب route أو الشاشة.

## 8. ممنوعات

لا تُستخدم حسابات حقيقية، ولا تُنشأ refunds أو بطاقات أو تحويلات حقيقية، ولا تُفعّل عقود consent/QR/emergency-location غير المعتمدة، ولا يُعتمد build محلي أو health 200 وحده كدليل على نشر الإصلاح.
