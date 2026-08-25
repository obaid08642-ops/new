# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-3-catalog-and-entity-strategy.md`
- **Member SHA-256:** `8b8aaaf3fbe9b2d700ec6ebc8c54e8f3ef5806cbb8ea507f3995eff487890654`
- **Line count:** 39
- **Read range:** `1-39`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: | مختبر/أشعة/خدمة منزلية | labs/radiology/home-care catalogs | service/package/provider id | slug منشور إن أقر | catalog عام مؤهل؛ booking/results/docs تتطلب patient ownership. |`
- `34: | المحتوى | المقال المنشور ذو slug صالح | drafts، bookmarks، تعليقات/تذاكر غير منشورة، بيانات مؤلفين خاصة. |`
- `39: تغطي contract tests حقول الهوية والاسم متعدد اللغة والحالة والتسعير والوصفة والنشر، وتغطي E2E عنصر منشور وغير منشور وكيان محذوف/غير نشط واستجابة فارغة وفشل API وتغير السعر قبل checkout. يختبر crawler policy أن كل route خاص يعطي `noindex` ول`
### backend_consumers_or_contracts
- `11: | الدواء | `medicines` وواجهات medicines/pharmacy | `id` الخلفي غير قابل للتخمين كمرجع عمل | `slug` منشور فقط بعد التحقق من النشاط والملكية والاسم | السعر والمخزون والوصفة من response حي؛ لا تدخل sitemap إلا إذا أقر النشر. |`
- `14: | مختبر/أشعة/خدمة منزلية | labs/radiology/home-care catalogs | service/package/provider id | slug منشور إن أقر | catalog عام مؤهل؛ booking/results/docs تتطلب patient ownership. |`
### auth_ownership
- `14: | مختبر/أشعة/خدمة منزلية | labs/radiology/home-care catalogs | service/package/provider id | slug منشور إن أقر | catalog عام مؤهل؛ booking/results/docs تتطلب patient ownership. |`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
