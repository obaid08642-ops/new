# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE16_HOSPITAL_PROVIDER_ROLE_REMEDIATION_20260819.md`
- **Member SHA-256:** `f6283c2ffa03def307b308da970f1dcb36ae88994192e38ec8393cf4650ddaea`
- **Line count:** 64
- **Read range:** `1-64`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `62: [1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "سجل النتيجة الحية ومصفوفة Phase 16"`
### backend_consumers_or_contracts
- `9: بعد تسجيل دخول حساب Hospital Sandbox المعتمد بنجاح، أعاد `GET /provider/auth/me` HTTP 200، ما أثبت صلاحية جلسة الحساب. ومع ذلك، أعاد `GET /hospital/staff` HTTP 403. لم تنفذ أي عملية إنشاء أو تعديل أو حذف، ولم يسجل هذا الدليل أي identifier أ`
- `13: | `GET /provider/auth/me` | Hospital Sandbox | HTTP 200 | الحساب والجلسة صالحان |`
### auth_ownership
- `19: كانت `HospitalService.assertFacilityActor` تستخرج الدور بهذه الأولوية: `actor.role || actor.provider_type`. حسابات Provider تستخدم `role: provider` مع `provider_type: hospital`؛ لأن `role` غير فارغ لم تكن خدمة المستشفى تصل إلى نوع المزود. و`
- `21: هذا عيب تطبيع هوية/دور، وليس دليلاً على خلل بيانات موظفين أو حاجة إلى bypass. لا يعالج بقبول role العام `provider`، لأن ذلك سيوسع نطاق المستشفى إلى مزودين غير منشآت.`
- `25: استبدل الإصلاح استخراج الدور الخام بـ`getEffectiveRoles(actor)`، ثم يختبر قائمة صريحة:`
- `29: | القراءة | `hospital` أو `hospital_admin` أو `branch_admin` أو `receptionist` أو `finance` أو `admin` أو `super_admin` |`
- `30: | الكتابة | `hospital` أو `hospital_admin` أو `branch_admin` أو `admin` أو `super_admin` |`
- `32: لذلك يقبل actor من الشكل `{ role: "provider", provider_type: "hospital" }` ويستمر رفض `{ role: "provider", provider_type: "doctor" }` و`patient` قبل أي query. لا تغير المعالجة schema أو migration أو contract path، ولا تنشئ staff fixture.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `44: أعيد بناء `nabdah-backend.zip` من worktree الذي اجتاز بوابة الاختبارات الكاملة. تحققت سلامة ZIP واستبعاد `node_modules` و`dist` و`coverage` وملفات `.env` والبناءات المحلية.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
