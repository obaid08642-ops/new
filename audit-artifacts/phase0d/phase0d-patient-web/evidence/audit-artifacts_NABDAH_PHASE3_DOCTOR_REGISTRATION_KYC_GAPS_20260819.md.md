# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_DOCTOR_REGISTRATION_KYC_GAPS_20260819.md`
- **Member SHA-256:** `14a94a6a90b4a3cfc2175d5362550c725a92571689dd54be506134adbf5a53ae`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | Home-visit onboarding is internally invalid | Validation requires `data.homeDuration`, but that field is absent from the registration type/initial state and no home-duration input is rendered. Any doctor enabling home visits cann`
- `9: | **P0** | KYC/onboarding creates and logs in a provider before document verification/approval | Step 1 calls account start and login before identity/license documents, OTP, signature, admin review or credentials are verified. | Enforce a r`
- `10: | **P0** | Background-removal WebView sends provider image to a third party without consent/security processing contract | Profile step opens `remove.bg` directly and instructs upload/download workflow outside Nabdah controls. | Remove exte`
- `11: | **P1** | KYC document intake accepts arbitrary file types but labels uploads as JPEG | File picker uses `*/*`; upload then declares `image/jpeg` for documents that may be PDF/other. There is no size/content/virus/type validation in UI. | `
- `13: | **P1** | OTP/contract/bank flow lacks clear verified submission and destination control | OTP modal opens even when email sending fails; client collects payer IBAN/name without verified-account status and then submits a broad `full_data` `
- `18: `LabRegistration.tsx` and `RadiologyRegistration.tsx` repeat the same pattern: they call `ProviderApi.start` and `ProviderApi.login` before approval, accept `*/*` document uploads while assigning image/PDF MIME labels, and submit broad wiza`
### backend_consumers_or_contracts
- `12: | **P1** | Service/insurance/cash settings are incomplete or semantically inconsistent | Insurance flags are undeclared initial fields; pricing/availability are client-entered; final `accepts_cash` is set from `cashOnly`, incorrectly disabl`
### auth_ownership
- `8: | **P0** | “My location” fabricates a fixed Riyadh coordinate | Location button stores `24.7136, 46.6753` rather than requesting/verifying current location or selected facility address. | Remove the claim or use explicit permission, map sel`
- `9: | **P0** | KYC/onboarding creates and logs in a provider before document verification/approval | Step 1 calls account start and login before identity/license documents, OTP, signature, admin review or credentials are verified. | Enforce a r`
- `13: | **P1** | OTP/contract/bank flow lacks clear verified submission and destination control | OTP modal opens even when email sending fails; client collects payer IBAN/name without verified-account status and then submits a broad `full_data` `
- `14: | **P1** | Registration copy and sensitive process lack six-language/accessible review | KYC, pricing, location, insurance, contract, bank and error UI is AR/EN only. | Deliver reviewed AR/EN/UR/HI/BN/FIL content and accessible RTL/LTR/nati`
- `18: `LabRegistration.tsx` and `RadiologyRegistration.tsx` repeat the same pattern: they call `ProviderApi.start` and `ProviderApi.login` before approval, accept `*/*` document uploads while assigning image/PDF MIME labels, and submit broad wiza`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | Home-visit onboarding is internally invalid | Validation requires `data.homeDuration`, but that field is absent from the registration type/initial state and no home-duration input is rendered. Any doctor enabling home visits cann`
- `8: | **P0** | “My location” fabricates a fixed Riyadh coordinate | Location button stores `24.7136, 46.6753` rather than requesting/verifying current location or selected facility address. | Remove the claim or use explicit permission, map sel`
- `9: | **P0** | KYC/onboarding creates and logs in a provider before document verification/approval | Step 1 calls account start and login before identity/license documents, OTP, signature, admin review or credentials are verified. | Enforce a r`
- `10: | **P0** | Background-removal WebView sends provider image to a third party without consent/security processing contract | Profile step opens `remove.bg` directly and instructs upload/download workflow outside Nabdah controls. | Remove exte`
- `11: | **P1** | KYC document intake accepts arbitrary file types but labels uploads as JPEG | File picker uses `*/*`; upload then declares `image/jpeg` for documents that may be PDF/other. There is no size/content/virus/type validation in UI. | `
- `13: | **P1** | OTP/contract/bank flow lacks clear verified submission and destination control | OTP modal opens even when email sending fails; client collects payer IBAN/name without verified-account status and then submits a broad `full_data` `
- `14: | **P1** | Registration copy and sensitive process lack six-language/accessible review | KYC, pricing, location, insurance, contract, bank and error UI is AR/EN only. | Deliver reviewed AR/EN/UR/HI/BN/FIL content and accessible RTL/LTR/nati`
- `18: `LabRegistration.tsx` and `RadiologyRegistration.tsx` repeat the same pattern: they call `ProviderApi.start` and `ProviderApi.login` before approval, accept `*/*` document uploads while assigning image/PDF MIME labels, and submit broad wiza`
- `22: Doctor registration is **P0 FIX/BLOCKED**. It cannot be relied on to provision home service, provider identity, location, image/document processing, payment destination, or a restricted approval state.`
### payment_insurance_relevance
- `9: | **P0** | KYC/onboarding creates and logs in a provider before document verification/approval | Step 1 calls account start and login before identity/license documents, OTP, signature, admin review or credentials are verified. | Enforce a r`
- `12: | **P1** | Service/insurance/cash settings are incomplete or semantically inconsistent | Insurance flags are undeclared initial fields; pricing/availability are client-entered; final `accepts_cash` is set from `cashOnly`, incorrectly disabl`
- `13: | **P1** | OTP/contract/bank flow lacks clear verified submission and destination control | OTP modal opens even when email sending fails; client collects payer IBAN/name without verified-account status and then submits a broad `full_data` `
- `14: | **P1** | Registration copy and sensitive process lack six-language/accessible review | KYC, pricing, location, insurance, contract, bank and error UI is AR/EN only. | Deliver reviewed AR/EN/UR/HI/BN/FIL content and accessible RTL/LTR/nati`
- `22: Doctor registration is **P0 FIX/BLOCKED**. It cannot be relied on to provision home service, provider identity, location, image/document processing, payment destination, or a restricted approval state.`
### error_empty_loading_retry_cancel
- `7: | **P0** | Home-visit onboarding is internally invalid | Validation requires `data.homeDuration`, but that field is absent from the registration type/initial state and no home-duration input is rendered. Any doctor enabling home visits cann`
- `9: | **P0** | KYC/onboarding creates and logs in a provider before document verification/approval | Step 1 calls account start and login before identity/license documents, OTP, signature, admin review or credentials are verified. | Enforce a r`
- `11: | **P1** | KYC document intake accepts arbitrary file types but labels uploads as JPEG | File picker uses `*/*`; upload then declares `image/jpeg` for documents that may be PDF/other. There is no size/content/virus/type validation in UI. | `
- `14: | **P1** | Registration copy and sensitive process lack six-language/accessible review | KYC, pricing, location, insurance, contract, bank and error UI is AR/EN only. | Deliver reviewed AR/EN/UR/HI/BN/FIL content and accessible RTL/LTR/nati`
- `18: `LabRegistration.tsx` and `RadiologyRegistration.tsx` repeat the same pattern: they call `ProviderApi.start` and `ProviderApi.login` before approval, accept `*/*` document uploads while assigning image/PDF MIME labels, and submit broad wiza`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
