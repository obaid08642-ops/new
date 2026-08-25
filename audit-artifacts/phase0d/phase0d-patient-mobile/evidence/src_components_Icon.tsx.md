# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/Icon.tsx`
- **Member SHA-256:** `d65396255f099de87336379c418b910bac4cc3adab75f8e5c65a567ed11c4a60`
- **Line count:** 80
- **Read range:** `1-80`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: const STATIC_MAP: Record<string, string> = {'back': 'arrow-right', 'diagnostics': 'flask', 'doctor': 'doctor', 'hospital': 'hospital-building', 'pulse': 'heart-pulse', 'heartPulse': 'heart-pulse', 'bloodBag': 'blood-bag', 'user': 'account',`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `6: const STATIC_MAP: Record<string, string> = {'back': 'arrow-right', 'diagnostics': 'flask', 'doctor': 'doctor', 'hospital': 'hospital-building', 'pulse': 'heart-pulse', 'heartPulse': 'heart-pulse', 'bloodBag': 'blood-bag', 'user': 'account',`
- `21: otp: 'shield-key',`
### state_transitions
- `6: const STATIC_MAP: Record<string, string> = {'back': 'arrow-right', 'diagnostics': 'flask', 'doctor': 'doctor', 'hospital': 'hospital-building', 'pulse': 'heart-pulse', 'heartPulse': 'heart-pulse', 'bloodBag': 'blood-bag', 'user': 'account',`
- `8: // Names that are NOT valid MaterialCommunityIcons glyphs (from the user's error log`
### payment_insurance_relevance
- `6: const STATIC_MAP: Record<string, string> = {'back': 'arrow-right', 'diagnostics': 'flask', 'doctor': 'doctor', 'hospital': 'hospital-building', 'pulse': 'heart-pulse', 'heartPulse': 'heart-pulse', 'bloodBag': 'blood-bag', 'user': 'account',`
- `17: payments: 'cash-multiple',`
### error_empty_loading_retry_cancel
- `6: const STATIC_MAP: Record<string, string> = {'back': 'arrow-right', 'diagnostics': 'flask', 'doctor': 'doctor', 'hospital': 'hospital-building', 'pulse': 'heart-pulse', 'heartPulse': 'heart-pulse', 'bloodBag': 'blood-bag', 'user': 'account',`
- `8: // Names that are NOT valid MaterialCommunityIcons glyphs (from the user's error log`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
