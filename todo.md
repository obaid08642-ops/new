# قائمة استئناف مصالحة منصة نبض

## مكتمل ومثبت

- [x] Phase 2: تقوية الإعدادات والشبكة، CORS، JWT، WebSocket، وعملاء API.
- [x] Phase 3: معالجة checkout وQR والبيانات التركيبية ومسار الطوارئ.
- [x] Phase 4: ربط مسار الصيدلية والوصفة وOCR والتتبع وإعادة الطلب بعقود backend الحية.
- [x] Phase 5: قاموس تطبيق المريض للغات AR/EN/UR/HI/BN/FIL وربط Text وAlert بالترجمة المركزية.
- [x] Phase 6: تطبيع runtime config، إغلاق BOLA الطبي fail-closed، وحجب QR غير المتعاقد عليه.
- [x] Phase 7: تقرير الجاهزية وخطة staging/E2E؛ الالتزام `9ff137f` مرفوع على فرع المصالحة.

## أعمال مصدرية مفتوحة للاستئناف

- [ ] فحص العقود الحساسة المتبقية: consent/QR verifier، موقع الطوارئ، أكواد أخطاء API، وعقد WebSocket/LiveKit.
- [ ] فحص مسارات الأشعة والملفات والتخزين والمعاملات متعددة الخطوات بحثاً عن نجاح محلي أو رد ثابت.
- [ ] مراجعة تبعيات كل حزمة وlockfiles دون تنفيذ ترقية عشوائية قد تكسر Expo/Nest/Next.
- [ ] تحديث سجل المصالحة والتقرير التفاعلي فقط بعد إثبات كل نتيجة جديدة.

## موانع لا تُغلق دون staging منفصلة

- [ ] تدوير اعتماد R2 المكشوف خارج Git ومن خلال secret manager.
- [ ] نشر فرع المصالحة في staging منفصلة مع Mongo وRedis وJWT وOrigins وstorage/payment test sinks.
- [ ] تنفيذ E2E للأدوار والملكية وOTP/2FA وWebSocket وQR/consent والحجز والصيدلية وOCR والدفع والويبهوك.
- [ ] تنفيذ UAT للتوطين الستّي وRTL/LTR وإمكانية الوصول على أجهزة فعلية.
- [ ] مراجعة أمن وخصوصية واعتماد منتج قبل الدمج أو المتاجر.

## قاعدة الحوكمة

لا يُختبر أو يُعدّل الإنتاج. لا تُنشأ بيانات أو أسرار اختبار داخل Git أو التقرير. لا تُفعّل واجهة أو عقداً حساساً بمجرد نجاح البناء؛ يلزم مصدر حي، backend، route، schema، مستهلك واجهة، ثم اختبار staging موثق.

آخر تحديث: 2026-08-16، بعد الالتزام `e521b57` ومراجعة تنفيذ الخطة.
إعداد: Manus AI

## References

لا توجد مراجع خارجية؛ هذه القائمة مبنية على سجل المصالحة ونتائج بوابات البناء والاختبار داخل المستودع المعزول.

[1]: ../audit-artifacts/NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"
[2]: ../audit-artifacts/NABDAH_FINAL_REMEDIATION_AND_RELEASE_READINESS_20260815.md "تقرير المعالجة وحكم الجاهزية"
[3]: ../audit-artifacts/POST_REMEDIATION_E2E_EXECUTION_PLAN.md "خطة staging وE2E"

## References

[1]: audit-artifacts/NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"
[2]: audit-artifacts/NABDAH_FINAL_REMEDIATION_AND_RELEASE_READINESS_20260815.md "تقرير المعالجة وحكم الجاهزية"
[3]: audit-artifacts/POST_REMEDIATION_E2E_EXECUTION_PLAN.md "خطة staging وE2E"

- [x] إصلاح عدم تطابق شاشة FacilityDashboard مع عقد `HospitalStaffModule`: استبدال `/provider/features/staff` بـ`/hospital/staff`، وتمرير `staff_role`، واستخدام `id` العائد من backend بدلاً من `NBD-` المحلي؛ بوابة المزوّد 3/3 وتصدير iOS ناجحان.
- [x] مراجعة مسارات facility/staff التي ظهرت في الجرد: توحدت القائمة والمؤشرات وشاشات الاعتماد مع `/hospital/staff`، وأزيلت نجاحات العرض المحلي؛ تبقى اختبارات staging للملكية والصلاحيات.
- [x] حجب endpoint الموروث `provider/features/staff` بعد إثبات أن المستهلك الوحيد انتقل إلى `hospital/staff`، ومنع مسار إنشاء موظفين لا يطبق ملكية المالك بنفس عقد HospitalStaffModule؛ backend 26/211 والمزوّد 3/3 وتصدير iOS ناجحة.
- [x] تدقيق شامل للخطة الحاكمة مقابل السجل والالتزامات والملفات والبوابات، وتصنيف كل بند منفذاً أو جزئياً أو غير منفذ مع سبب وإجراء لاحق؛ المصفوفة في `EXECUTION_COMPLETION_MATRIX_20260816.md`.
- [x] مطابقة الموانع التشغيلية والعقود التي تحتاج staging مع خطة E2E وعدم عدّها مكتملة قبل اختبارها؛ جميع IDs مصنفة غير منفذة قبولياً حتى توفير staging.
- [x] استبدال مستهلكات `/provider/facility/subaccounts` غير المعرفة بعقد `/hospital/staff` في مؤشرات المنشأة وشاشات الاعتماد؛ بوابة provider 3/3 وتصدير iOS ناجحان.
- [x] إزالة `lastLogin: 'اليوم'` و`NBD-*`/`NBD-F000` المصطنعة من عرض الموظفين؛ يعرض consumer حقول backend أو عبارة إدارة الخادم.
- [x] ربط حذف موظف المنشأة بـ`DELETE /hospital/staff/:id` مع تحقق الملكية وحالة نجاح من الخادم بدلاً من toast محلي.
- [x] حجب بطاقة QR الشكلية وأزرار الحفظ/المشاركة التي تعلن نجاحاً محلياً بلا عقد credential/QR معتمد.

## Gatekeeper remediation — 2026-08-17

- [x] P0: إضافة تحقق ملكية إلى `POST /orders/:id/cancel` ومنع BOLA بين هويتين مع اختبار قبول ورفض.
- [x] P1: توحيد دور provider/provider_type في حارس JWT وخدمات Labs وHome Care وHospital Staff، وإضافة أدوار Radiology التشغيلية.
- [x] P1: إصلاح `HospitalService` ومخططات الهوية المرتبطة لاستخدام UUID/string في مسارات staff وonboardDoctor والتجميع.
- [x] P2: جعل Jest يضبط JWT_SECRET في setup وتشغيل المجموعة المحلية: 215/215 ناجحة.
- [x] P2: حصر فوالب localhost في app.module.ts وredis.service.ts خارج production فقط.
- [ ] إعادة تشغيل مصفوفة staging E2E للأدوار والملكية بعد رفع الإصلاحات، ولا تُعد 23/25 السابقة إثباتاً نهائياً.
- [ ] تدوير اعتماد R2 وإعادة بناء صورة FastAPI وإغلاق عقود consent/QR/location/error-codes قبل حكم الإنتاج.
