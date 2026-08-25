# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_LABS_PACKAGES_GET_SLICE_AR.md`
- **Member SHA-256:** `a64053c34cf3d2b85d09ebe21bfb06ad856b4bfdefec26695d1d12949f8b6bf3`
- **Line count:** 40
- **Read range:** `1-40`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `5: **الحالة: منفذة ومختبرة محلياً، جاهزة للدفع؛ ليست Sandbox-verified حتى الآن.** أُغلقت القراءة العامة للباقات عبر `GET /labs/packages` وتفاصيلها عبر `GET /labs/packages/{id}`، وهما مساران مثبتان في `LabsController` وخرائط العقود المحلية.`
- `37: - `/home/ubuntu/nabdah_backend_work/src/modules/labs/labs.controller.ts`: تعريف مسارات packages وpackage detail.`
### auth_ownership
- `15: يستخدم wrapper العام GET فقط ويمرر `Accept: application/json` دون Authorization أو token. يتم رفض `packageId` غير المطابق للـidentifier policy، ويحوّل upstream `404` إلى `notFound()` لمنع عرض مورد غير موجود. parser يحتفظ بالحقول العامة اللا`
### state_transitions
- `19: أضيفت مفاتيح `LabsPackages` إلى EN وAR وUR وHI وBN وFIL. الواجهتان RTL-compatible، responsive، وتحتويان على empty/error states صادقة. الحركة مقتصرة على transitions منخفضة التكلفة مع احترام `prefers-reduced-motion`.`
### payment_insurance_relevance
- `29: | Targeted total | 4 files / 7 tests ناجحة |`
### error_empty_loading_retry_cancel
- `19: أضيفت مفاتيح `LabsPackages` إلى EN وAR وUR وHI وBN وFIL. الواجهتان RTL-compatible، responsive، وتحتويان على empty/error states صادقة. الحركة مقتصرة على transitions منخفضة التكلفة مع احترام `prefers-reduced-motion`.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
