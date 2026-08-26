# Provider DoctorRegistration: manual semantic review

## Scope

تمت قراءة `src/screens/doctor/DoctorRegistration.tsx` كاملًا، lines 1–1129، مقابل baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. هذا توثيق source فقط؛ لا يثبت صلاحية أي API أو اعتماد أو تخزين server-side.

## Confirmed defects and gaps

| ID | evidence | defect / gap | required closure |
|---|---|---|---|
| P-DOC-021 | 106–123 | `TOTAL=7` بينما `next` يستطيع الوصول إلى خطوة 8 ويعرض `SuccessScreen` لا يمثل حالة اعتماد حقيقية | use server-authoritative onboarding/application states; success must mean submitted/pending, never approved/operational |
| P-DOC-022 | 154–177 | failure of account start falls back to login and advances without proving the intended application belongs to this flow | expose explicit resumable application state; avoid equating login success with valid registration creation |
| P-DOC-023 | 211–286 | KYC permits arbitrary files but uploads ID/SCFHS with fixed `image/jpeg`; input fields including national ID are not included in the immediate step-2 payload | implement typed document upload, server malware/content/size validation, encrypted storage, expiry/verification status, document-purpose access policy and correct ID binding |
| P-DOC-024 | 324–344 | user is directed to `remove.bg` in an in-app WebView to upload professional photo | external third-party image processing without documented consent/data-sharing/safety review; remove or use an approved controlled media pipeline |
| P-DOC-025 | 400–419, 521–529, 953–976 | home visit uses `data.lat/lng`, clinic location uses `data.location`; final submit sends `lat/lng`, initially zero, instead of selected `location` | confirmed location integrity defect; use one validated coordinate model with explicit consent/geocoding and reject missing/zero locations |
| P-DOC-026 | 541–697 and 861–930 | schedule UI accepts empty/invalid day/time intervals and final submit silently applies defaults or omits clinic schedule in per-service flow | server and client must validate service-specific availability, timezone, capacity, overlaps, approved vacation and booking locks; preserve all service schedules |
| P-DOC-027 | 703–845 | provider self-selects insurance companies/plans and service eligibility from catalog, including fields not declared in `DoctorRegData` | insurer network/provider contract must be server-authoritative with effective dates, plan/product terms, credential validation and later patient co-pay decision path |
| P-DOC-028 | 850–1000 | signature upload, OTP and sequential step2/step3/submit calls have no one transaction, idempotency or compensation path; signer and IBAN have no local completeness validation before submit | create versioned onboarding state machine with idempotency, contract/version/hash, signer authority, OTP binding, financial verification and retry-safe checkpoints |
| P-DOC-029 | 932–976 | images and financial data are processed alongside profile data without visible retention/access boundaries | use separate protected media/KYC/financial stores and server contracts with least privilege, audit, malware scanning and retention/deletion policy |
| P-DOC-030 | 1020–1126 | UI says all changes need approval, but no source proves approval gates discovery, schedule, prices, insurance or payouts | backend must fail closed for pending/suspended/rejected provider and approved-version changes; Admin decision/audit/notification evidence required |

## Product decision required

A doctor’s registration must not itself establish insurance acceptance, cash capability, price authority, clinical credential validity, or availability. These are reviewable claims that require independent backend verification and an approved version before patient search, booking or payment.
