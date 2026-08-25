# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/rn_screens.json`
- **Member SHA-256:** `507daa94eef666924f9f9e581418549bb126220e5d71989172ed18033f2d05e1`
- **Line count:** 838
- **Read range:** `1-838`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `103: "file": "pharmacy/prescription-upload.tsx",`
- `379: "file": "nursing/booking-confirm.tsx",`
- `459: "file": "consultations/cancel-reschedule.tsx",`
- `503: "file": "consultations/booking-success.tsx",`
- `515: "file": "consultations/booking-confirm.tsx",`
- `547: "file": "diagnostics/book-sample.tsx",`
- `571: "file": "diagnostics/booking-confirm.tsx",`
- `647: "file": "(auth)/login.tsx",`
- `651: "file": "(auth)/register.tsx",`
- `763: "file": "insurance/submit-claim.tsx",`
- `791: "file": "insurance/refund-status.tsx",`
### backend_consumers_or_contracts
- `7: "file": "settings/notifications-settings.tsx",`
- `27: "file": "settings/notifications.tsx",`
- `263: "file": "(tabs)/pharmacy.tsx",`
- `527: "file": "consultations/appointments.tsx",`
### auth_ownership
- `267: "file": "family/permission-request.tsx",`
- `287: "file": "family/permissions.tsx",`
- `391: "file": "(onboarding)/permissions.tsx",`
- `647: "file": "(auth)/login.tsx",`
- `655: "file": "(auth)/otp.tsx",`
- `683: "file": "community/live-session.tsx",`
### state_transitions
- `75: "file": "pharmacy/broadcast-status.tsx",`
- `127: "file": "payments/failed.tsx",`
- `131: "file": "payments/success.tsx",`
- `459: "file": "consultations/cancel-reschedule.tsx",`
- `503: "file": "consultations/booking-success.tsx",`
- `779: "file": "insurance/approval-pending.tsx",`
- `791: "file": "insurance/refund-status.tsx",`
### payment_insurance_relevance
- `55: "file": "offers/[id].tsx",`
- `127: "file": "payments/failed.tsx",`
- `131: "file": "payments/success.tsx",`
- `135: "file": "payments/processing.tsx",`
- `139: "file": "payments/failure.tsx",`
- `579: "file": "wallet/hub.tsx",`
- `583: "file": "wallet/transactions.tsx",`
- `587: "file": "wallet/transfer.tsx",`
- `591: "file": "wallet/topup.tsx",`
- `595: "file": "wallet/cards.tsx",`
- `759: "file": "insurance/index.tsx",`
- `763: "file": "insurance/submit-claim.tsx",`
### error_empty_loading_retry_cancel
- `127: "file": "payments/failed.tsx",`
- `459: "file": "consultations/cancel-reschedule.tsx",`
- `779: "file": "insurance/approval-pending.tsx",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
