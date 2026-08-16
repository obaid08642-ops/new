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

آخر تحديث: 2026-08-16، بعد الالتزام `9ff137f`.
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
- [ ] مراجعة بقية مسارات facility والـstaff لتأكيد توافق الأدوار والصلاحيات مع backend بعد الإصلاح.
