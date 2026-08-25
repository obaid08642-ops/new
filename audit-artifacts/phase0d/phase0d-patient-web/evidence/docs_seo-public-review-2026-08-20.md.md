# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/seo-public-review-2026-08-20.md`
- **Member SHA-256:** `87aed92267af36c49ea22f635060a105a23acbae6f3ad4533fbf0d0ff2f74a09`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: | البيانات المنظمة | تبقى `WebSite` و`MedicalOrganization` للصفحة الرئيسية فقط، ويظل كتالوج الأدوية المختلط `MedicalWebPage` و`noindex`. | لا `Drug` أو `Product` أو `Offer` ما لم يقدم Backend تصنيف نشر وحقولاً موثوقة وصريحة. |`
- `29: [2] [Google Search Central — Localized versions of your pages](https://developers.google.com/search/docs/specialty/international/localized-versions)`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `17: | البيانات المنظمة | تبقى `WebSite` و`MedicalOrganization` للصفحة الرئيسية فقط، ويظل كتالوج الأدوية المختلط `MedicalWebPage` و`noindex`. | لا `Drug` أو `Product` أو `Offer` ما لم يقدم Backend تصنيف نشر وحقولاً موثوقة وصريحة. |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
