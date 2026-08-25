# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/mobile_to_web_screen_map.json`
- **Member SHA-256:** `d1deffa717c8c6e9b8a35fe30286b240f98dc9e1de51be12064c9722bc619fa9`
- **Line count:** 2628
- **Read range:** `1-2628`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: "mobile_screen": "(auth)/_layout.tsx",`
- `12: "mobile_screen": "(auth)/forgot-password.tsx",`
- `23: "mobile_screen": "(auth)/login.tsx",`
- `26: "/[locale]/login"`
- `36: "mobile_screen": "(auth)/otp.tsx",`
- `47: "mobile_screen": "(auth)/privacy.tsx",`
- `56: "mobile_screen": "(auth)/provider-info.tsx",`
- `65: "mobile_screen": "(auth)/register.tsx",`
- `76: "mobile_screen": "(auth)/reset-password.tsx",`
- `87: "mobile_screen": "(auth)/terms.tsx",`
- `96: "mobile_screen": "(auth)/welcome.tsx",`
- `107: "mobile_screen": "(onboarding)/_layout.tsx",`
### backend_consumers_or_contracts
- `192: "mobile_screen": "(tabs)/nursing.tsx",`
- `201: "mobile_screen": "(tabs)/pharmacy.tsx",`
- `213: "/[locale]/home-care/services"`
- `314: "/[locale]/appointments/[appointmentId]",`
- `319: "/[locale]/home-care/services/[serviceId]",`
- `321: "/[locale]/orders/[orderId]",`
- `385: "mobile_screen": "consultations/appointments.tsx",`
- `388: "/[locale]/appointments"`
- `400: "/[locale]/appointments/[appointmentId]",`
- `405: "/[locale]/home-care/services/[serviceId]",`
- `407: "/[locale]/orders/[orderId]",`
- `483: "/[locale]/appointments/[appointmentId]",`
### auth_ownership
- `23: "mobile_screen": "(auth)/login.tsx",`
- `26: "/[locale]/login"`
- `36: "mobile_screen": "(auth)/otp.tsx",`
- `134: "mobile_screen": "(onboarding)/permissions.tsx",`
- `1069: "mobile_screen": "family/permission-request.tsx",`
- `1080: "mobile_screen": "family/permissions.tsx",`
### state_transitions
- `9: "status": "missing_web_candidate"`
- `20: "status": "missing_web_candidate"`
- `33: "status": "candidate"`
- `44: "status": "missing_web_candidate"`
- `53: "status": "missing_web_candidate"`
- `62: "status": "missing_web_candidate"`
- `73: "status": "missing_web_candidate"`
- `84: "status": "missing_web_candidate"`
- `93: "status": "missing_web_candidate"`
- `104: "status": "missing_web_candidate"`
- `113: "status": "missing_web_candidate"`
- `122: "status": "missing_web_candidate"`
### payment_insurance_relevance
- `586: "mobile_screen": "consultations/offer/[id].tsx",`
- `762: "mobile_screen": "diagnostics/insurance-approval.tsx",`
- `773: "mobile_screen": "diagnostics/insurance-upload.tsx",`
- `1392: "mobile_screen": "insurance/add-policy.tsx",`
- `1393: "domain": "insurance",`
- `1403: "mobile_screen": "insurance/approval-pending.tsx",`
- `1404: "domain": "insurance",`
- `1412: "mobile_screen": "insurance/benefits-summary.tsx",`
- `1413: "domain": "insurance",`
- `1421: "mobile_screen": "insurance/claim-tracking.tsx",`
- `1422: "domain": "insurance",`
- `1430: "mobile_screen": "insurance/copay.tsx",`
### error_empty_loading_retry_cancel
- `428: "mobile_screen": "consultations/booking-pending.tsx",`
- `457: "mobile_screen": "consultations/cancel-reschedule.tsx",`
- `1403: "mobile_screen": "insurance/approval-pending.tsx",`
- `1938: "mobile_screen": "payments/failed.tsx",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
