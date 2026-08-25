# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE16_PRESCRIPTION_DOCTOR_IDENTITY_P0_REMEDIATION_20260820.md`
- **Member SHA-256:** `08d10484f461c49b9b5f32cf6a4c8c3c17c9e0d692d5290cb8840e206e299d23`
- **Line count:** 54
- **Read range:** `1-54`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `51: [1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "سجل Phase 16 وحالة النشر السابقة"`
### backend_consumers_or_contracts
- `54: [4]: `../../nabdah_execution/backend/src/modules/care/appointments.service.ts` "منطق هوية مالك الموعد"`
### auth_ownership
- `25: كانت `PrescriptionsService.create` تستعلم عن الموعد بـ`doctor_user_id: doctor.id` فقط. في المقابل، يستخدم `AppointmentsService` مجموعة identifiers للحساب/المزود/profile عند التحقق من owner. حسابات provider المنشورة قد تحمل `id` يختلف عن `Pr`
- `37: | `prescriptions.authorization.spec.ts` | PASS — 18 tests |`
- `53: [3]: `../../nabdah_execution/backend/src/modules/prescriptions/prescriptions.authorization.spec.ts` "اختبارات الملكية والانحدار"`
### state_transitions
- `11: على البيئة المنشورة وبحسابات Sandbox المعتمدة فقط، نجح إنشاء موعد `clinic/cash` بـHTTP 201 وكانت حالته الخادمية `CONFIRMED`. نجح `check-in` للمريض و`start` لطبيب Sandbox بـHTTP 200 لكل منهما، ما يثبت أن طبقة appointment lifecycle قبلت هوية `
- `15: | Create clinic/cash | Patient Sandbox | 201 | auto-confirm المنشور يعمل؛ الحالة `CONFIRMED` |`
- `45: بعد نشر مراجع صريح لهذا الأرشيف وSHA، تعاد دورة Sandbox التالية بمراجع منقحة وحالات قبل/بعد وتنظيف: إنشاء `clinic/cash` → check-in → start → `POST /prescriptions/create` لصنف يدوي (متوقع 201 و`PENDING_REVIEW`) → send للصيدلية المعينة → ظهور`
### payment_insurance_relevance
- `11: على البيئة المنشورة وبحسابات Sandbox المعتمدة فقط، نجح إنشاء موعد `clinic/cash` بـHTTP 201 وكانت حالته الخادمية `CONFIRMED`. نجح `check-in` للمريض و`start` لطبيب Sandbox بـHTTP 200 لكل منهما، ما يثبت أن طبقة appointment lifecycle قبلت هوية `
- `15: | Create clinic/cash | Patient Sandbox | 201 | auto-confirm المنشور يعمل؛ الحالة `CONFIRMED` |`
- `45: بعد نشر مراجع صريح لهذا الأرشيف وSHA، تعاد دورة Sandbox التالية بمراجع منقحة وحالات قبل/بعد وتنظيف: إنشاء `clinic/cash` → check-in → start → `POST /prescriptions/create` لصنف يدوي (متوقع 201 و`PENDING_REVIEW`) → send للصيدلية المعينة → ظهور`
### error_empty_loading_retry_cancel
- `45: بعد نشر مراجع صريح لهذا الأرشيف وSHA، تعاد دورة Sandbox التالية بمراجع منقحة وحالات قبل/بعد وتنظيف: إنشاء `clinic/cash` → check-in → start → `POST /prescriptions/create` لصنف يدوي (متوقع 201 و`PENDING_REVIEW`) → send للصيدلية المعينة → ظهور`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
