# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/config/deepLinks.ts`
- **Member SHA-256:** `a4b83ba3c176dbd232c9ca29a3f830b64297e2f9682a1cd77a4031e55f52e362`
- **Line count:** 217
- **Read range:** `1-217`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: type DeepLinkScreens = Record<string, string | { screens: DeepLinkScreens }>;`
- `20: // Maps all app routes to deep link paths`
- `21: export const DEEP_LINK_CONFIG: { screens: DeepLinkScreens } = {`
- `22: screens: {`
- `24: '(auth)/login': 'login',`
- `25: '(auth)/register': 'register',`
- `32: screens: {`
- `48: 'consultations/booking-confirm': 'booking/:doctorId',`
- `49: 'consultations/booking-success': 'booking-success/:id',`
- `50: 'consultations/cancel-reschedule': 'appointments/:id/reschedule',`
- `65: 'pharmacy/prescription-upload': 'pharmacy/prescription',`
- `67: 'pharmacy/order-confirm': 'pharmacy/checkout',`
### backend_consumers_or_contracts
- `46: 'consultations/appointments': 'appointments',`
- `68: 'pharmacy/order-tracking': 'pharmacy/orders/:id/track',`
- `69: 'pharmacy/order-history': 'pharmacy/orders',`
- `193: 'settings/notifications-settings': 'settings/notifications',`
### auth_ownership
- `24: '(auth)/login': 'login',`
- `26: '(auth)/otp': 'verify',`
- `51: 'consultations/chat-with-doctor': 'chat/doctor/:sessionId',`
- `52: 'consultations/video-call': 'call/:sessionId',`
- `53: 'consultations/waiting-room': 'waiting/:sessionId',`
- `54: 'consultations/virtual-waiting-room': 'virtual-waiting/:sessionId',`
- `55: 'consultations/post-call-rating': 'rating/:sessionId',`
- `78: 'pharmacy/chat-with-pharmacist': 'chat/pharmacist/:sessionId',`
- `125: 'family/permissions': 'family/permissions',`
### state_transitions
- `49: 'consultations/booking-success': 'booking-success/:id',`
- `50: 'consultations/cancel-reschedule': 'appointments/:id/reschedule',`
- `70: 'pharmacy/broadcast-status': 'pharmacy/broadcast/:id',`
- `135: 'insurance/approval-pending': 'insurance/pending/:id',`
- `136: 'insurance/refund-status': 'insurance/refund/:id',`
- `145: 'payments/success': 'payments/success/:id',`
- `146: 'payments/failed': 'payments/failed/:id',`
### payment_insurance_relevance
- `127: // Insurance`
- `128: 'insurance/hub': 'insurance',`
- `129: 'insurance/add-policy': 'insurance/add',`
- `130: 'insurance/policy-detail': 'insurance/:id',`
- `131: 'insurance/benefits-summary': 'insurance/:id/benefits',`
- `132: 'insurance/coverage-check': 'insurance/check',`
- `133: 'insurance/submit-claim': 'insurance/claim',`
- `134: 'insurance/claim-tracking': 'insurance/claim/:id',`
- `135: 'insurance/approval-pending': 'insurance/pending/:id',`
- `136: 'insurance/refund-status': 'insurance/refund/:id',`
- `138: // Wallet`
- `139: 'wallet/hub': 'wallet',`
### error_empty_loading_retry_cancel
- `50: 'consultations/cancel-reschedule': 'appointments/:id/reschedule',`
- `135: 'insurance/approval-pending': 'insurance/pending/:id',`
- `146: 'payments/failed': 'payments/failed/:id',`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
