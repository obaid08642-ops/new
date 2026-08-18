# Phase 3 Provider — doctor registration and KYC workflow gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Home-visit onboarding is internally invalid | Validation requires `data.homeDuration`, but that field is absent from the registration type/initial state and no home-duration input is rendered. Any doctor enabling home visits cannot pass Step 4. | Add one validated canonical home-service duration field/DTO and test clinic/video/home registration paths to submitted/pending-review state. |
| **P0** | “My location” fabricates a fixed Riyadh coordinate | Location button stores `24.7136, 46.6753` rather than requesting/verifying current location or selected facility address. | Remove the claim or use explicit permission, map selection, geocoding/validation and approved provider service-area/location-retention contract. |
| **P0** | KYC/onboarding creates and logs in a provider before document verification/approval | Step 1 calls account start and login before identity/license documents, OTP, signature, admin review or credentials are verified. | Enforce a restricted pending account state server-side, deny all provider operations/PHI/inbox/payments until verified approval, and test state/role transition gates. |
| **P0** | Background-removal WebView sends provider image to a third party without consent/security processing contract | Profile step opens `remove.bg` directly and instructs upload/download workflow outside Nabdah controls. | Remove external image processing or implement approved processor, informed consent, DPA/security review, secure transfer/retention/deletion and audit. |
| **P1** | KYC document intake accepts arbitrary file types but labels uploads as JPEG | File picker uses `*/*`; upload then declares `image/jpeg` for documents that may be PDF/other. There is no size/content/virus/type validation in UI. | Apply server-enforced allowlist, MIME/content verification, size/virus controls, secure owned storage/review metadata and user-safe error recovery. |
| **P1** | Service/insurance/cash settings are incomplete or semantically inconsistent | Insurance flags are undeclared initial fields; pricing/availability are client-entered; final `accepts_cash` is set from `cashOnly`, incorrectly disabling cash when a provider accepts both cash and insurance. | Use a typed server-authoritative configuration schema with valid service/insurance relationships, quote/currency checks, and independent cash/insurance eligibility fields. |
| **P1** | OTP/contract/bank flow lacks clear verified submission and destination control | OTP modal opens even when email sending fails; client collects payer IBAN/name without verified-account status and then submits a broad `full_data` snapshot. | Require successful server OTP challenge before verification UI, scoped/minimized submitted fields, verified bank ownership/change controls, signed contract version/hash, and approval/audit results. |
| **P1** | Registration copy and sensitive process lack six-language/accessible review | KYC, pricing, location, insurance, contract, bank and error UI is AR/EN only. | Deliver reviewed AR/EN/UR/HI/BN/FIL content and accessible RTL/LTR/native permission flows. |

## Decision

Doctor registration is **P0 FIX/BLOCKED**. It cannot be relied on to provision home service, provider identity, location, image/document processing, payment destination, or a restricted approval state.
