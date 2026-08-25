# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `messages/en.json`
- **Member SHA-256:** `08114eae33752a26916c3ab37733f38ff5295fd8377692fee399dc2d598f00be`
- **Line count:** 818
- **Read range:** `1-818`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: "body": "The web experience is built against Nabd Plus contracts. Medicines, bookings and coverage are shown only when authorized backend data is available.",`
- `24: "Login": {`
- `29: "submit": "Secure sign in",`
- `30: "submitting": "Verifying…",`
- `33: "twoFactorSubmit": "Verify code",`
- `34: "twoFactorSubmitting": "Verifying…",`
- `39: "invalid": "Unable to sign in. Review your details and retry.",`
- `46: "otpSubmitting": "Securing sign in…",`
- `64: "diagnostics": "Diagnostic bookings",`
- `94: "unavailableBody": "No fallback data was shown. Please retry later."`
- `105: "notice": "Cart contents and totals are read directly from the authorized backend. No checkout or payment is performed here.",`
- `107: "unavailableBody": "No fallback data was shown. Please retry later.",`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: "title": "Patient care starts with a secure, clear session.",`
- `19: "safeBody": "This foundation separates private data from public content and keeps session tokens out of browser storage.",`
- `20: "safetyOne": "Server-protected session",`
- `24: "Login": {`
- `26: "body": "Credentials are sent through a protected server layer. Tokens are not stored in localStorage.",`
- `36: "twoFactorUnavailable": "Verification service is unavailable. No session was created.",`
- `40: "unavailable": "The service could not be reached. No local fallback session was created.",`
- `41: "twoFactor": "This session requires additional verification. The verification form will be enabled after its Sandbox DTO is verified.",`
- `42: "useOtp": "Use a one-time code",`
- `44: "otpRequest": "Send one-time code",`
- `45: "otpVerify": "Verify one-time code",`
- `46: "otpSubmitting": "Securing sign in…",`
### state_transitions
- `21: "safetyTwo": "Explicit error and denial states",`
- `39: "invalid": "Unable to sign in. Review your details and retry.",`
- `49: "otpSent": "A one-time code was requested. Check your approved contact method.",`
- `59: "loading": "Loading patient portal",`
- `78: "empty": "There are currently no orders available for this account.",`
- `80: "statusUnavailable": "Status unavailable",`
- `83: "status": "Status",`
- `94: "unavailableBody": "No fallback data was shown. Please retry later."`
- `99: "empty": "Your cart is empty.",`
- `107: "unavailableBody": "No fallback data was shown. Please retry later.",`
- `113: "empty": "There are currently no appointments available for this account.",`
- `115: "statusUnavailable": "Status unavailable",`
### payment_insurance_relevance
- `14: "body": "The web experience is built against Nabd Plus contracts. Medicines, bookings and coverage are shown only when authorized backend data is available.",`
- `91: "total": "Total",`
- `101: "subtotal": "Subtotal",`
- `103: "total": "Total",`
- `105: "notice": "Cart contents and totals are read directly from the authorized backend. No checkout or payment is performed here.",`
- `155: "callDiscard": "Discard session"`
- `176: "unavailableBody": "No fallback data or price was shown. Please retry later."`
- `237: "notice": "This is a read-only list. No payload links, read-marking action, device registration, or settings operation is performed from this interface.",`
- `327: "insurance": "Insurance",`
- `385: "notice": "No price, purchase, prescription, booking, patient, or insurance information is displayed in this public catalogue. It remains out of search indexing until the backend supplies a verified medicine classification.",`
- `404: "Insurance": {`
- `405: "eyebrow": "Private insurance",`
### error_empty_loading_retry_cancel
- `21: "safetyTwo": "Explicit error and denial states",`
- `39: "invalid": "Unable to sign in. Review your details and retry.",`
- `58: "body": "Links are available for features that passed their contract and authorization checks. No data is shown before it comes from the authorized backend.",`
- `59: "loading": "Loading patient portal",`
- `78: "empty": "There are currently no orders available for this account.",`
- `94: "unavailableBody": "No fallback data was shown. Please retry later."`
- `99: "empty": "Your cart is empty.",`
- `107: "unavailableBody": "No fallback data was shown. Please retry later.",`
- `113: "empty": "There are currently no appointments available for this account.",`
- `125: "unavailableBody": "No fallback data was shown. Please retry later.",`
- `133: "cancelAppointment": "Cancel appointment",`
- `134: "cancelConfirm": "Are you sure you want to cancel this appointment?",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
