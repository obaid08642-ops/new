# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE16_LAB_EMBEDDED_REPORT_CONTRACT_REMEDIATION_20260819.md`
- **Member SHA-256:** `ab718127517f5dcd2624eadcb41a40069de1eda62ad3ccf3e4cb0382bcb0df24`
- **Line count:** 64
- **Read range:** `1-64`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: أعادت قائمة `GET /lab-results/mine` بحساب Patient Sandbox نتيجة واحدة من نوع تقرير مخبأ ضمن `labbookings.reports`. لم يعرض الاختبار محتوى التقرير أو الملف أو identifier. وعند استخدام reference نفسه مع `GET /lab-results/:id` أعاد المالك HTTP`
- `20: | تقرير مخبأ في `labbookings.reports` | aggregate يعرض `reports.id` وmetadata |`
- `22: لكن `LabResultsService.one` كان يبحث فقط في `LabResultRepository.findOne({ id })`. ولذلك لا يجد `reports.id` الذي تعرضه القائمة للمريض، حتى عندما يكون هذا المريض مالك `labbooking`.`
- `32: للمستخدم غير الإداري، ثم يعيد metadata اللازمة للفتح: `id` و`booking_id` و`name` و`mime` و`url` و`notes` و`uploaded_at` و`state` و`source`. لا يعيد raw `base64` ولا يتخطى `patient_id`. الإدارة فقط تستخدم scope إداري قائم كما في العقد السابق`
- `62: [1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "سجل Sandbox ومصفوفة Phase 16"`
### backend_consumers_or_contracts
- `63: [2]: `../../nabdah_execution/backend/src/modules/labs/lab-results.service.ts` "مسارات قائمة وdetail نتيجة المختبر"`
- `64: [3]: `../../nabdah_execution/backend/src/modules/labs/lab-results.service.spec.ts` "اختبارات owner وforeign للتقرير المخبأ"`
### auth_ownership
- `36: | Patient owner | metadata قابلة للقراءة | — |`
- `38: | Admin | scope إداري قائم | حسب صلاحية الإدارة القائمة |`
- `52: بعد نشر SHA المرشح بتفويض منفصل، يستخدم owner/foreign Sandbox لذات report reference:`
- `54: 1. يعيد owner HTTP 200 وmetadata فقط، من دون طباعة أو حفظ محتوى التقرير في دليل Git.`
- `64: [3]: `../../nabdah_execution/backend/src/modules/labs/lab-results.service.spec.ts` "اختبارات owner وforeign للتقرير المخبأ"`
### state_transitions
- `32: للمستخدم غير الإداري، ثم يعيد metadata اللازمة للفتح: `id` و`booking_id` و`name` و`mime` و`url` و`notes` و`uploaded_at` و`state` و`source`. لا يعيد raw `base64` ولا يتخطى `patient_id`. الإدارة فقط تستخدم scope إداري قائم كما في العقد السابق`
### payment_insurance_relevance
- `47: | سلامة ZIP | PASS — استبعد `node_modules` و`dist` و`coverage` و`.env` |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
