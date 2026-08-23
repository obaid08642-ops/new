# Phase 7 — Mobile defect guards

## Guest/offline authentication

تقرير Mobile يثبت أن التطبيق قد ينشئ `guest_user` مع `guest_token` عند فشل `/auth/guest` offline. تم فحص Web runtime في `app` و`lib` و`components-next`، ولم يظهر أي `guest_token` أو `guest_user` أو `auth/guest` أو offline token/session. واجهة login تستخدم session exchange، ولا يوجد مسار يسمح بحجز أو شراء أو قراءة خاصة دون جلسة httpOnly.

هذا يُعد **Web completion beyond Mobile** لأسباب أمنية وصحية: عند غياب الشبكة تبقى الحالة unauthenticated أو offline shell فقط، ولا تُنشأ هوية أو token وهمي.

## Mobile limitations التي لا تُنسخ

لا يُنسخ Web نقص WebSockets، ولا ConsoleProvider analytics stub، ولا remote feature flags غير الموثقة، ولا placeholder IP في audit logs. هذه العناصر تظل محجوبة أو معطلة حتى وجود contract ومزوّد production واختبارات consent/privacy.

## نتيجة التدقيق

الـguard الأمني الخاص بعدم إنشاء guest token ناجح بالبحث في runtime. تبقى اختبارات Mobile parity الكاملة، وreconnect/ack للـrealtime، وSandbox owner/stranger، ومراجعة accessibility/RTL/animation اختبارات لاحقة في الخطة.
