# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/INSURANCE_NETWORK_PROVENANCE_AUDIT_20260820.md`
- **Member SHA-256:** `da859387c93417152d4d1fefbc4e50a0fb5598a95214a2b0b70582263670a28e`
- **Line count:** 57
- **Read range:** `1-57`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `56: [4]: https://www.sama.gov.sa/en-US/MediaCenter/News/pages/news00024052018.aspx "إيقاف وفا عن الإصدار والتجديد"؛ https://cma.gov.sa/MediaCenter/NEWS/Pages/CMA_N_3089.aspx "إلغاء إدراج وفا"`
### backend_consumers_or_contracts
- `5: **النطاق:** سجلات `insurance_networks` وفئات التأمين المعادة من `GET /insurance/companies`، مع الحفاظ على عرض المريض الحالي حتى يعتمد المراجع معالجة مرحلية.`
- `53: [1]: https://api.nabd.plus/api/v1/insurance/companies "قراءة عامة لمسار شركات التأمين، 20 أغسطس 2026"`
- `54: [2]: ../../nabdah_execution/backend/src/schemas/insurance.schema.ts "تعريف `InsuranceCompany` و`InsuranceNetwork` في المرشح المصدرّي"`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `22: نموذج `InsuranceNetwork` يحتوي بالفعل الحقول اللازمة لتوثيق الفئة الواحدة: `source_url` و`source_label` و`verified_at` و`catalog_status` و`provenance`.[2] ويجب استعمالها لكل فئة قائمة أو جديدة بدلاً من استنتاج الفئة من اسم الشركة أو من قائم`
- `29: | `catalog_status` | `pending_review` أو `verified` أو `retired` | لا تتحول إلى `verified` من دون السند المحدد. |`
- `34: ينفذ المراجع أولاً backfill توثيقياً فقط للفئات الحالية: يتركها قابلة للقراءة العامة، ويضيف provenance يصفها بأنها موروثة وغير معتمدة، مع عدم تغيير `catalog_status` إلى `retired` أو حذفها. بعد ذلك يراجع المسؤول فئات كل شركة من مصدرها الرسمي`
- `45: يؤكد موقع MEDGULF الرسمي اندماج بروج مع MEDGULF؛ لذلك لا تُعتمد فئة أو شعار مستقلان لبروج بوصفه كياناً عاماً نشطاً قبل تثبيت علاقة الخلف.[3] كما أن سجلات وفا يجب أن تبقى تاريخية وغير عامة في ضوء إيقاف إصدار وتجديد الوثائق وإلغاء الإدراج، لا`
### payment_insurance_relevance
- `5: **النطاق:** سجلات `insurance_networks` وفئات التأمين المعادة من `GET /insurance/companies`، مع الحفاظ على عرض المريض الحالي حتى يعتمد المراجع معالجة مرحلية.`
- `22: نموذج `InsuranceNetwork` يحتوي بالفعل الحقول اللازمة لتوثيق الفئة الواحدة: `source_url` و`source_label` و`verified_at` و`catalog_status` و`provenance`.[2] ويجب استعمالها لكل فئة قائمة أو جديدة بدلاً من استنتاج الفئة من اسم الشركة أو من قائم`
- `53: [1]: https://api.nabd.plus/api/v1/insurance/companies "قراءة عامة لمسار شركات التأمين، 20 أغسطس 2026"`
- `54: [2]: ../../nabdah_execution/backend/src/schemas/insurance.schema.ts "تعريف `InsuranceCompany` و`InsuranceNetwork` في المرشح المصدرّي"`
### error_empty_loading_retry_cancel
- `29: | `catalog_status` | `pending_review` أو `verified` أو `retired` | لا تتحول إلى `verified` من دون السند المحدد. |`
- `45: يؤكد موقع MEDGULF الرسمي اندماج بروج مع MEDGULF؛ لذلك لا تُعتمد فئة أو شعار مستقلان لبروج بوصفه كياناً عاماً نشطاً قبل تثبيت علاقة الخلف.[3] كما أن سجلات وفا يجب أن تبقى تاريخية وغير عامة في ضوء إيقاف إصدار وتجديد الوثائق وإلغاء الإدراج، لا`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
