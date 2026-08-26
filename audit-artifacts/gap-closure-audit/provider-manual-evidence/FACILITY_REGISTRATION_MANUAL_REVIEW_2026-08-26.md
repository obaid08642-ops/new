# Provider FacilityRegistration: manual semantic review

## Scope

تمت قراءة `src/screens/facility/FacilityRegistration.tsx` كاملًا، lines 1–1176، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

| ID | evidence | defect / gap | required closure |
|---|---|---|---|
| P-FAC-038 | 78–110 | parent has a `SuccessScreen` at step 8 although only 7 steps are defined; a success UI cannot prove submitted/pending/approved state | source application status from backend and route only to an authorized pending state |
| P-FAC-039 | 210–305 and 324–370 | legal fields/documents are not validated at Step2; arbitrary files allowed then CR/MOH documents uploaded as `image/jpeg` | typed document contract, mandatory-field validation, encrypted/malware-scanned storage, verified legal entity/license state and approval evidence required |
| P-FAC-040 | 413–820 | sub-providers are assembled entirely in local state; no individual identity/license/consent/account/invitation/organization-link transition is created during this step | split facility registration from authorized sub-provider onboarding/invitation and prove credential, employment/contract, role and approval lifecycle per person/unit |
| P-FAC-041 | 431–446 and 878–924 | **confirmed data-loss defect:** UI permits `pharmacy` sub-provider, but step 5 serializes only doctor/lab/radiology/nursing rosters; pharmacy is silently omitted from payload | add explicit pharmacy roster/contract or remove the UI until supported; provide server confirmation for every submitted sub-provider |
| P-FAC-042 | 558–790 and 934–1008 | facility self-sets service prices, home services, insurance and operating hours from catalog/UI switches | price/catalog/insurance availability must be server-authoritative and separately approved; enforce capability, capacity, credential and effective-date policies |
| P-FAC-043 | 917–930 | error handler calls `require('../../context')` and tries `show` outside React context | confirmed invalid error-notification path; use the existing hook obtained at component scope and typed failures |
| P-FAC-044 | 1014–1035 | "I Understand & Agree" only calls `onNext`; it does not record terms/approval acknowledgment | record versioned terms/contract acceptance server-side with actor/time/hash and enforce required acknowledgment |
| P-FAC-045 | 1039–1173 | final submit accepts raw signature, signer fields and banking data without local completeness/IBAN verification or server-proof of representative authority; uses zero coordinate fallback | versioned contract/signature/OTP binding, financial verification/access segregation, legal-representative authority and explicit valid location required; no 0,0 fallback |
| P-FAC-046 | 1047 and 1092 | references `data.email`, which is not defined in `FacilityRegData`; intended manager email path is inconsistent | repair identity target model and validate OTP target against the signed-in application/account |
| P-FAC-047 | 351–365, 917–925, 1052–1066 | sequential uploads/step2/step3/submit have no one transactional state/idempotency/retry/compensation boundary | backend onboarding state machine with idempotency, resumable checkpoints and no public/patient visibility until approved is required |

Facility onboarding must not be treated as an operational provider flow until its entity, child providers, financial recipient and offer/capability claims have each completed server-side verification and approval.
