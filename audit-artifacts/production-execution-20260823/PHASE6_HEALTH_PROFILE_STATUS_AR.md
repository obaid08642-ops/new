# Phase 6 — Health/Profile/Family/Insurance/Reports/Chat/Notifications

## الحالة

الحالة: **Partial مع شرائح آمنة مغلقة وميزات محمية تحتاج Sandbox**.

## ما أُغلق

تم تقوية Login و2FA ومنع تمرير أخطاء backend الخام، مع بقاء التوكنات داخل cookies server-side فقط. تم إثبات وإضافة Profile وNotification Settings وvitals-log إلى allowlist كقراءات GET-only؛ لا توجد توسعة تلقائية للكتابة.

بوابة المرحلة الحالية نجحت: 138 ملف اختبار، 277 اختباراً ناجحاً، 23 اختباراً متخطياً، وbuild إنتاجي ناجح.

## ما لم يُغلق

قراءة owner/stranger، mutations الصحية والتذكيرات، تعديل الملف والعناوين، إدارة الأسرة والصلاحيات، insurance claims/OCR/approval، chat mutations/reconnect/ack، والإشعارات التفاعلية تحتاج fixtures وحسابات Sandbox متاحة. متغيرات `NABD_SANDBOX_*` غير موجودة في البيئة الحالية، لذلك لم تُجرَ عمليات على حسابات أو بيانات حقيقية ولم تُعلن هذه الرحلات Done.

## الأدلة

- `phase6-auth-error-hardening-validation.log`
- `phase6-profile-notifications-validation.log`
- `phase6-vitals-log-allowlist-validation.log`
- `phase6-full-gate.log`

كل عنصر غير مثبت يظل `Blocked pending contract/fixture`، ولا تُفتح mutation إلا بعد probe حي للـmethod/path واختبارات unauth=401 وowner=200 وstranger=404 وreplay عند انطباقه.
