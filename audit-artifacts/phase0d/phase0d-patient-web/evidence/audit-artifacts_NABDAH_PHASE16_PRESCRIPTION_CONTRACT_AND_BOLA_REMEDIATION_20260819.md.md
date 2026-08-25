# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE16_PRESCRIPTION_CONTRACT_AND_BOLA_REMEDIATION_20260819.md`
- **Member SHA-256:** `3e0b08a7e6d49b34f2b2aef59f7650ef013764e66ff1be6b082c67d87c941a2d`
- **Line count:** 119
- **Read range:** `1-119`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `118: [4]: `../../nabdah_execution/provider/src/screens/doctor/DoctorDashboard.tsx` "واجهة إصدار وصفة مرتبطة بموعد خادمي"`
- `119: [5]: `../../nabdah_execution/provider/src/screens/pharmacy/PharmacyDashboard.tsx` "طابور المراجعة وحجب الصرف في واجهة الصيدلية"`
### backend_consumers_or_contracts
- `119: [5]: `../../nabdah_execution/provider/src/screens/pharmacy/PharmacyDashboard.tsx` "طابور المراجعة وحجب الصرف في واجهة الصيدلية"`
### auth_ownership
- `85: | `CI=1 npx jest src/modules/prescriptions/prescriptions.authorization.spec.ts --runInBand` | PASS — 17 اختباراً | إنشاء مقيد، دواء يدوي، منع الصرف، بديل معتمد، وBOLA سلبي للإرسال/الانتقال/البديل |`
- `117: [3]: `../../nabdah_execution/backend/src/modules/prescriptions/prescriptions.authorization.spec.ts` "اختبارات التفويض والانحدار"`
### state_transitions
- `17: | دواء يدوي استثنائي | مرفوض بالكامل بعد التقوية الأولى | يقبل ضمن الوصفة فقط مع `is_manual_entry: true` و`verified: false` و`manual_review_status: PENDING_REVIEW`؛ لا ينشئ صفاً في `medicines_master` | PASS محلياً؛ يلزم اختبار حي بعد النشر `
- `19: | الصرف | خطر صرف صنف يدوي غير معتمد | يمنع `DISPENSED` ما لم تصبح كل مادة يدوية `SUBSTITUTED_APPROVED` | PASS محلياً؛ يلزم اختبار حي بعد النشر |`
- `20: | BOLA في mutation | الانتقال/الإرسال/البديل لم تكن تتحقق كلها من طرف الوصفة | الطبيب المالك فقط يرسل الوصفة المنشأة؛ الصيدلية المعيّنة فقط تعدل/تصرف أو تسجل بديلاً؛ الإدارة ذات الامتياز فقط تتجاوز الملكية وفق state machine | PASS محلياً؛ ي`
- `26: المسار المعتمد هو `POST /prescriptions/create`، وهو مقيد بدور `DOCTOR`. يجب أن تحتوي الحمولة على `appointment_id` و`patient_id` و`items` غير فارغة. ينفذ الخادم lookup واحداً مقيداً بـ`id` للموعد و`patient_id` و`doctor_user_id` و`status: IN_`
- `35: "medicine_id": "approved-catalogue-medicine-id",`
- `43: لا تستخدم واجهة الطبيب fallbacks مثل `guest_patient` أو معرف موعد محلي. تستخرج الشاشة القيمتين من `GET /provider/jobs/queue?status=active&kind=consultation` وتبقي زر الإصدار معطلاً ما لم تكن حالة العمل الخادمية `IN_PROGRESS`.`
- `53: "manual_review_status": "PENDING_REVIEW"`
- `62: "new_medicine_id": "approved-catalogue-medicine-id"`
- `66: بعد التحقق يكتب الخادم `substituted_to_medicine_id` و`manual_review_status: SUBSTITUTED_APPROVED` ومرجع المراجع ووقته؛ ثم فقط يمكن لمسار state machine أن يصل إلى `DISPENSED`.`
- `104: 3. ينشئ الطبيب وصفة تحتوي مادة يدوية معلّمة، ويتحقق أن القائمة الرئيسة للأدوية لا تتغير وأن السجل يحمل `PENDING_REVIEW`.`
- `106: 5. تسجل الصيدلية المعيّنة بديلاً معتمداً، ثم تحاول صرف الوصفة؛ يجب أن يفشل الصرف قبل البديل ويصبح ممكناً فقط بعد `SUBSTITUTED_APPROVED` وفق state machine.`
- `107: 6. يوثق لكل صف method/path/status وID منقح وstate قبل/بعد وخطوة cleanup في سجل Phase 16.`
### payment_insurance_relevance
- `91: أعيد بناء الأرشيفين من worktree التنفيذ بعد نجاح البوابات المبينة أعلاه. فُحصت سلامة ZIP واستُبعدت `node_modules` و`dist` و`coverage` وملفات `.env` والبناءات المحلية. لا يمثل ذلك نشراً، ولا يستبدل التحقق من SHA الذي ينشره المراجع لاحقاً.`
- `111: لا يثبت هذا الإصلاح دورة صيدلية كاملة أو قبولاً طبياً أو توافر واجهة متجر. كما لا يرفع موانع المدفوعات وMoyasar أو اعتماد العقود القانونية أو Native signing والأجهزة الحقيقية. تظل هذه الموانع مفتوحة في Phases 16–19.`
### error_empty_loading_retry_cancel
- `17: | دواء يدوي استثنائي | مرفوض بالكامل بعد التقوية الأولى | يقبل ضمن الوصفة فقط مع `is_manual_entry: true` و`verified: false` و`manual_review_status: PENDING_REVIEW`؛ لا ينشئ صفاً في `medicines_master` | PASS محلياً؛ يلزم اختبار حي بعد النشر `
- `53: "manual_review_status": "PENDING_REVIEW"`
- `104: 3. ينشئ الطبيب وصفة تحتوي مادة يدوية معلّمة، ويتحقق أن القائمة الرئيسة للأدوية لا تتغير وأن السجل يحمل `PENDING_REVIEW`.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
