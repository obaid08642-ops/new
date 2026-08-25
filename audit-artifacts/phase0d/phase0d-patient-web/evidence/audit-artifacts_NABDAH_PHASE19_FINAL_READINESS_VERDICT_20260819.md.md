# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE19_FINAL_READINESS_VERDICT_20260819.md`
- **Member SHA-256:** `fa97fc4fca50c4ca347157cde15748f32033f64d10c67f35b72287379d2b82dd`
- **Line count:** 67
- **Read range:** `1-67`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `22: | الدفع/Moyasar | BLOCKED | لا تفعيل test-safe مفوض؛ يمنع lifecycle مالي أو refund حقيقي |`
- `27: ثبتت بعض حدود الملكية الحية بحسابات Sandbox فقط: Unified Booking وLab Booking وRadiology Booking أعادت owner access مقابل إخفاء foreign، كما أعاد مسار التمريض Doctor HTTP 403 وNursing HTTP 200 بعد إصلاح P0 المنشور. لا توسع هذه النتائج إلى ا`
- `40: | P0 | Moyasar غير مفعل test-safe | Owner/Finance/DevOps | intent/webhook/idempotency/refund lifecycle Sandbox فقط |`
- `61: [2]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "مصفوفة Phase 16 والأدلة الحية والموانع"`
### backend_consumers_or_contracts
- `38: | P0 | lifecycle/BOLA غير مكتملان للـPrescription/Pharmacy/Lab/Radiology/Nursing/Hospital/Admin | Reviewer/QA/Owners | fixtures Sandbox مملوكة قابلة للتنظيف مع before/after/cleanup لكل صف |`
### auth_ownership
- `27: ثبتت بعض حدود الملكية الحية بحسابات Sandbox فقط: Unified Booking وLab Booking وRadiology Booking أعادت owner access مقابل إخفاء foreign، كما أعاد مسار التمريض Doctor HTTP 403 وNursing HTTP 200 بعد إصلاح P0 المنشور. لا توسع هذه النتائج إلى ا`
- `29: كما اكتشفت الجولة الحية عيوباً لم تكن البوابات المصدرية وحدها كافية لكشفها. كان إنشاء الاستشارة النقدية يحفظ موعداً `PENDING` ثم يعيد HTTP 403 بسبب actor داخلي غير مخول في auto-confirm؛ أصلح المصدر وأضيف regression، لكن الإصلاح لا يزال يحتا`
- `31: يتضمن مرشح Backend الحالي أيضاً مسار الدواء اليدوي المقيد بالمراجعة، وربط الوصفة بموعد `IN_PROGRESS`، وطابور مراجعة الصيدلية، وتقوية BOLA للمسارات المعدِّلة، وإصلاح تطبيع Hospital Provider role. جميعها موثقة ومختبرة مصدرّياً، لكن لا يجوز نس`
- `38: | P0 | lifecycle/BOLA غير مكتملان للـPrescription/Pharmacy/Lab/Radiology/Nursing/Hospital/Admin | Reviewer/QA/Owners | fixtures Sandbox مملوكة قابلة للتنظيف مع before/after/cleanup لكل صف |`
- `40: | P0 | Moyasar غير مفعل test-safe | Owner/Finance/DevOps | intent/webhook/idempotency/refund lifecycle Sandbox فقط |`
- `41: | P0 | legal/product approvals غائبة لعقود حساسة | Owner/Legal/Product | موافقات مكتوبة وعقود server-authoritative واختبارات التشغيل |`
- `43: | P1 | provider intake وAdmin RBAC محجوبان بغياب fixtures/2FA مفوض | Owner/QA/Admin reviewer | isolated fixtures وstep-up/OTP مفوض وسجل تدقيق |`
- `49: 3. ينشأ أو يربط المالك fixtures معزولة للـpharmacy، lab، radiology، nursing، hospital، provider intake وAdmin RBAC؛ لا تستخدم بيانات أو دفعات حقيقية.`
- `66: [7]: `NABDAH_PHASE16_HOSPITAL_PROVIDER_ROLE_REMEDIATION_20260819.md` "تطبيع Hospital Provider role"`
### state_transitions
- `22: | الدفع/Moyasar | BLOCKED | لا تفعيل test-safe مفوض؛ يمنع lifecycle مالي أو refund حقيقي |`
- `29: كما اكتشفت الجولة الحية عيوباً لم تكن البوابات المصدرية وحدها كافية لكشفها. كان إنشاء الاستشارة النقدية يحفظ موعداً `PENDING` ثم يعيد HTTP 403 بسبب actor داخلي غير مخول في auto-confirm؛ أصلح المصدر وأضيف regression، لكن الإصلاح لا يزال يحتا`
- `40: | P0 | Moyasar غير مفعل test-safe | Owner/Finance/DevOps | intent/webhook/idempotency/refund lifecycle Sandbox فقط |`
### payment_insurance_relevance
- `22: | الدفع/Moyasar | BLOCKED | لا تفعيل test-safe مفوض؛ يمنع lifecycle مالي أو refund حقيقي |`
- `40: | P0 | Moyasar غير مفعل test-safe | Owner/Finance/DevOps | intent/webhook/idempotency/refund lifecycle Sandbox فقط |`
- `48: 2. بعد إثبات SHA المنشور، تعاد اختبارات Sandbox للـcash auto-confirm، وHospital staff، وLab embedded report، ومسار الوصفة اليدوية وبديل الصيدلية، مع تسجيل الحالة قبل/بعد والتنظيف.`
- `63: [4]: `NABDAH_PHASE16_CONSULTATION_CASH_AUTOCONFIRM_P0_REMEDIATION_20260819.md` "P0 الاستشارة النقدية"`
### error_empty_loading_retry_cancel
- `29: كما اكتشفت الجولة الحية عيوباً لم تكن البوابات المصدرية وحدها كافية لكشفها. كان إنشاء الاستشارة النقدية يحفظ موعداً `PENDING` ثم يعيد HTTP 403 بسبب actor داخلي غير مخول في auto-confirm؛ أصلح المصدر وأضيف regression، لكن الإصلاح لا يزال يحتا`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
