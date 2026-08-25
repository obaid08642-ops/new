# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_SMART_CATALOG_BACKFILL_REVIEWER_RUNBOOK_20260820.md`
- **Member SHA-256:** `16a62c4a3db298d0792c80f0890bbf014c3f31bb90259fa600015016d02e6e59`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `15: | Facilities/Lab/Radiology/Home-care | لا توجد علامة اعتماد legacy مستقلة؛ `active` وحدها لا تكفي | `pending` ومخفية | `legacy_backfill_pending_review` |`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: استُبدل backfill الذي كان يخفي جميع سجلات legacy بسياسة **وراثة ذكية ومتحفظة**. لا تعتبر السياسة `active` أو مجرد وجود السجل دليلاً على اعتماد عام. تُورَّث الإتاحة العامة فقط عندما يملك السجل علامة تحقق legacy صريحة قابلة للتدقيق؛ وما عدا ذ`
- `13: | `medicines_master` | `verified:true` وnot deleted | `public_eligibility:true`, `medical_review_status:'approved'`, `indexing_eligibility:false` | `legacy_verification_inherited:medicine.verified` |`
- `14: | `provider_profiles` | `status:'active'` **و** (`license_verified:true` أو `license_status:'verified'`) | القيم نفسها | `legacy_verification_inherited:provider.license_verified` |`
- `15: | Facilities/Lab/Radiology/Home-care | لا توجد علامة اعتماد legacy مستقلة؛ `active` وحدها لا تكفي | `pending` ومخفية | `legacy_backfill_pending_review` |`
- `25: | Dry run | `MONGO_URL=... npx ts-node scripts/backfill-catalog-governance.ts` | عدد المرشحين inherited/pending بلا تعديل |`
- `31: اختبارات backfill تثبت شرط الدواء `verified`, وشرط المزود النشط المرخص، ومنع توريث المنشآت التشغيلية فقط، وترتيب inherited ثم pending، وقيد rollback. كما أعيد تشغيل اختبارات public discovery والـprojection. بوابة Backend النهائية: **73 suit`
- `35: ينفذ Reviewer/DevOps الـdry run في نافذة النشر ويراجع عدد `inherited_public_candidates` و`pending_hidden_candidates` قبل apply. بعد الـapply، يجب التحقق بحسابات Sandbox فقط من أن بحث الأدوية يعيد دواءً legacy موثقاً قبل/بعد، وأن دواءً غير م`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `9: استُبدل backfill الذي كان يخفي جميع سجلات legacy بسياسة **وراثة ذكية ومتحفظة**. لا تعتبر السياسة `active` أو مجرد وجود السجل دليلاً على اعتماد عام. تُورَّث الإتاحة العامة فقط عندما يملك السجل علامة تحقق legacy صريحة قابلة للتدقيق؛ وما عدا ذ`
- `15: | Facilities/Lab/Radiology/Home-care | لا توجد علامة اعتماد legacy مستقلة؛ `active` وحدها لا تكفي | `pending` ومخفية | `legacy_backfill_pending_review` |`
- `25: | Dry run | `MONGO_URL=... npx ts-node scripts/backfill-catalog-governance.ts` | عدد المرشحين inherited/pending بلا تعديل |`
- `31: اختبارات backfill تثبت شرط الدواء `verified`, وشرط المزود النشط المرخص، ومنع توريث المنشآت التشغيلية فقط، وترتيب inherited ثم pending، وقيد rollback. كما أعيد تشغيل اختبارات public discovery والـprojection. بوابة Backend النهائية: **73 suit`
- `35: ينفذ Reviewer/DevOps الـdry run في نافذة النشر ويراجع عدد `inherited_public_candidates` و`pending_hidden_candidates` قبل apply. بعد الـapply، يجب التحقق بحسابات Sandbox فقط من أن بحث الأدوية يعيد دواءً legacy موثقاً قبل/بعد، وأن دواءً غير م`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
