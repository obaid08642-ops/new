# منصة نبض — Phase 16: إصلاح P0 لهوية الطبيب في إنشاء الوصفة

**التاريخ:** 2026-08-20
**الفرع الوحيد:** `manus/on-live-reconciliation`
**الحالة:** **FIX source / live retest required.**
**أرشيف Backend المرشح:** `nabdah-backend.zip`
**SHA-256:** `107b8aa8b1d6aea98d51a6bae02ec7c6ff47ff6671e1f4e14635cc7bc5981482`

## الدليل الحي المؤدي للاكتشاف

على البيئة المنشورة وبحسابات Sandbox المعتمدة فقط، نجح إنشاء موعد `clinic/cash` بـHTTP 201 وكانت حالته الخادمية `CONFIRMED`. نجح `check-in` للمريض و`start` لطبيب Sandbox بـHTTP 200 لكل منهما، ما يثبت أن طبقة appointment lifecycle قبلت هوية طبيب المزود. لكن طلب `POST /prescriptions/create` للموعد نفسه والمريض نفسه أعاد HTTP 404. أكمل الطبيب الموعد بـHTTP 200 إلى حالة terminal، لذلك لم يبق fixture تشغيلي نشط.

| العملية | actor | HTTP | الاستنتاج |
|---|---:|---:|---|
| Create clinic/cash | Patient Sandbox | 201 | auto-confirm المنشور يعمل؛ الحالة `CONFIRMED` |
| Check-in | Patient Sandbox | 200 | انتقال المريض صحيح |
| Start | Doctor Sandbox | 200 | lifecycle يتعرف على هوية الطبيب المنطبعة |
| Create manual prescription | Doctor Sandbox | 404 | **P0**: عقد الوصفة لا يطابق هوية الطبيب بالأسلوب نفسه |
| Complete | Doctor Sandbox | 200 | fixture أنهي بعد الفشل |

لم تسجل هذه الوثيقة JWT أو IDs أو PII أو محتوى سريري.

## السبب المصدرّي

كانت `PrescriptionsService.create` تستعلم عن الموعد بـ`doctor_user_id: doctor.id` فقط. في المقابل، يستخدم `AppointmentsService` مجموعة identifiers للحساب/المزود/profile عند التحقق من owner. حسابات provider المنشورة قد تحمل `id` يختلف عن `ProviderProfile.user_id` بينما يطابق `ProviderProfile.id`؛ لذلك مر انتقال الموعد وفشلت الوصفة للموعد المملوك نفسه.

## الإصلاح الضيق

يحصل إنشاء الوصفة الآن على الموعد فقط عبر `id` و`patient_id` وحالة `IN_PROGRESS` الخادمية، ثم يقارن مجموعة actor identifiers (`id`, `account_id`, `provider_id`, `provider_profile_id`) بمعرّفي الموعد (`doctor_user_id`, `doctor_id`). إذا لم يحدث تقاطع، يبقى السلوك `NotFound` لإخفاء المورد عن طبيب أجنبي. يسجل كاتب الوصفة actor id، ويربط تحديث الموعد بـ`doctor_id` الخادمي الذي ثبته التحقق.

لا يغير الإصلاح شرط الموعد النشط، أو ملكية المريض، أو دور Doctor، أو الكتالوج المعتمد، أو شرط البديل المعتمد للصنف اليدوي.

## بوابات التحقق المصدرّي

| البوابة | النتيجة |
|---|---|
| `prescriptions.authorization.spec.ts` | PASS — 18 tests |
| Regression جديد | PASS — Provider account المطابق لـappointment doctor profile يسمح له بإنشاء الوصفة؛ Provider أجنبي يعاد له `NotFound` ولا تنشأ وصفة |
| `npm run build` Backend | PASS |
| Backend full suite | PASS — 67 suites / 390 tests |
| ZIP integrity/exclusion | PASS — 926 ملفاً، بلا secrets أو node_modules أو dist |

## إعادة الاختبار الحي الإلزامية بعد نشر المرشح

بعد نشر مراجع صريح لهذا الأرشيف وSHA، تعاد دورة Sandbox التالية بمراجع منقحة وحالات قبل/بعد وتنظيف: إنشاء `clinic/cash` → check-in → start → `POST /prescriptions/create` لصنف يدوي (متوقع 201 و`PENDING_REVIEW`) → send للصيدلية المعينة → ظهور الطابور → approved substitute → approve → dispense → archive → complete. كما يعاد الاختبار السلبي لطبيب أجنبي وللمريض الأجنبي.

لا يعد هذا الإصلاح حياً أو مرشحاً للإطلاق حتى يثبت هذا السيناريو بعد النشر.

## References

[1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "سجل Phase 16 وحالة النشر السابقة"
[2]: `../../nabdah_execution/backend/src/modules/prescriptions/prescriptions.service.ts` "منطق إنشاء الوصفة بعد الإصلاح"
[3]: `../../nabdah_execution/backend/src/modules/prescriptions/prescriptions.authorization.spec.ts` "اختبارات الملكية والانحدار"
[4]: `../../nabdah_execution/backend/src/modules/care/appointments.service.ts` "منطق هوية مالك الموعد"
