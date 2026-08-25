# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT_EXACT_READ_PROBE_20260818.md`
- **Member SHA-256:** `27a26835169ea1617f4e0a1ea593428e90247b1631e646fde512a71a7cbe4dc2`
- **Line count:** 3
- **Read range:** `1-3`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `3: تمت محاولة واحدة عبر origin المباشر مع `--resolve api.nabd.plus:443:57.131.133.208` لتسجيل دخول حساب `patient.sandbox@nabd.plus` ثم قراءة المسارات المثبتة مصدرّياً (`/doctors/appointments/mine`, `/notifications`, `/wallet/balance`, `/orders`
### auth_ownership
- `3: تمت محاولة واحدة عبر origin المباشر مع `--resolve api.nabd.plus:443:57.131.133.208` لتسجيل دخول حساب `patient.sandbox@nabd.plus` ثم قراءة المسارات المثبتة مصدرّياً (`/doctors/appointments/mine`, `/notifications`, `/wallet/balance`, `/orders`
### state_transitions
- `3: تمت محاولة واحدة عبر origin المباشر مع `--resolve api.nabd.plus:443:57.131.133.208` لتسجيل دخول حساب `patient.sandbox@nabd.plus` ثم قراءة المسارات المثبتة مصدرّياً (`/doctors/appointments/mine`, `/notifications`, `/wallet/balance`, `/orders`
### payment_insurance_relevance
- `3: تمت محاولة واحدة عبر origin المباشر مع `--resolve api.nabd.plus:443:57.131.133.208` لتسجيل دخول حساب `patient.sandbox@nabd.plus` ثم قراءة المسارات المثبتة مصدرّياً (`/doctors/appointments/mine`, `/notifications`, `/wallet/balance`, `/orders`
### error_empty_loading_retry_cancel
- `3: تمت محاولة واحدة عبر origin المباشر مع `--resolve api.nabd.plus:443:57.131.133.208` لتسجيل دخول حساب `patient.sandbox@nabd.plus` ثم قراءة المسارات المثبتة مصدرّياً (`/doctors/appointments/mine`, `/notifications`, `/wallet/balance`, `/orders`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
