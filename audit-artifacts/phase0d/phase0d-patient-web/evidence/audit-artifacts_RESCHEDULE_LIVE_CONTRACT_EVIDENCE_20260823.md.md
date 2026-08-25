# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/RESCHEDULE_LIVE_CONTRACT_EVIDENCE_20260823.md`
- **Member SHA-256:** `6e0de035bb70e62cc44e29cf23fb26dec8b145488915bca728a1fa94b4207c35`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Reschedule live contract evidence`
- `5: - `/api/v1/care/appointments/{id}/reschedule``
- `6: - `/api/v1/labs/bookings/{id}/reschedule``
- `7: - `/api/v1/radiology/bookings/{id}/reschedule``
- `8: - `/api/v1/unified-bookings/{kind}/{id}/reschedule``
- `12: - `POST /unified-bookings/{id}/reschedule` يستدعي consultation reschedule.`
- `13: - `POST /unified-bookings/{kind}/{id}/reschedule` يستدعي النوع العام.`
- `16: - consultation service ينفذ `apptSvc.reschedule(id, user, { slot_start: new_scheduled_at })`.`
### backend_consumers_or_contracts
- `5: - `/api/v1/care/appointments/{id}/reschedule``
- `6: - `/api/v1/labs/bookings/{id}/reschedule``
- `7: - `/api/v1/radiology/bookings/{id}/reschedule``
- `8: - `/api/v1/unified-bookings/{kind}/{id}/reschedule``
- `19: مصدر API الحي: `https://api.nabd.plus/api/v1`. فحص OPTIONS الآمن للمسار العام أعاد HTTP 204، ولم يُرسل أي body أو بيانات شخصية أو mutation فعلي.`
### auth_ownership
- `17: - الخدمة ترفض الموعد الماضي وتتحقق من ownership داخل appointment service.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
