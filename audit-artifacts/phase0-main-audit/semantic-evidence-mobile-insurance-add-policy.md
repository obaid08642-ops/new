# Semantic evidence — Mobile Insurance Add Policy

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/insurance/add-policy.tsx:28–32` loads `/insurance/companies` and converts any failure to an empty company list, with no unavailable/retry distinction. Camera OCR sends a base64 image to `POST /insurance/ocr-extract` (`:34–70`) but the source shows no image-size/type/retention policy, idempotency, user-visible structured failure, provenance confidence, or server-side verification before extracted policy/member identifiers are used.

The OCR provider name is matched locally against the loaded companies list using substring/contains rules (`:54–62`), which can select an unintended company and is not proof of an authoritative company identifier. OCR data is inserted into editable fields and the user is told to review it, but there is no field-level validation for policy/member/national ID/date formats or expiry/identity consistency (`:48–65,148–164`).

Save requires only company and policy number locally (`:73–76`) and sends `POST /insurance/save-policy` with client-derived provider/company identifiers, optional expiry/name, national ID, `verified:false` and `ocr_extracted` (`:77–90`). No visible Idempotency-Key, re-auth/step-up, ownership binding, duplicate policy handling, eligibility verification, document attachment binding, or approval/preauthorization state is shown. Any successful HTTP response immediately navigates to the insurance hub (`:90–96`).

No explicit handling exists for expired/invalid policy, member mismatch, duplicate coverage, insurer unavailable, manual review, rejected/approved/pending transitions, consent for storing sensitive identifiers, or cash-versus-insurance selection in downstream checkout. No Phase 0 remediation was made.
