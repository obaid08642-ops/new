# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/patient-allowlist.ts`
- **Member SHA-256:** `756fa2b1ecf461416c21bb46aca27361715016ac039e54483f2c94cb8cdc1755`
- **Line count:** 48
- **Read range:** `1-48`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: const patientReadRoutes = [`
- `10: new RegExp("^/cart/checkout$"),`
- `13: new RegExp(`^/unified-bookings/consultation/${orderId}$`, "i"),`
- `36: new RegExp("^/articles/bookmarks/mine$"),`
- `43: return patientReadRoutes.some((route) => route.test(path));`
### backend_consumers_or_contracts
- `4: new RegExp("^/orders/mine$"),`
- `5: new RegExp(`^/orders/${orderId}$`, "i"),`
- `6: new RegExp("^/patient/pharmacy/orders$"),`
- `7: new RegExp(`^/patient/pharmacy/orders/${orderId}$`, "i"),`
- `8: new RegExp(`^/orders/${orderId}/tracking$`, "i"),`
- `14: new RegExp(`^/care/appointments/${orderId}$`, "i"),`
- `24: new RegExp("^/insurance/my-policy$"),`
- `25: new RegExp("^/insurance/benefits-summary$"),`
- `26: new RegExp("^/insurance/claims$"),`
### auth_ownership
- `35: new RegExp("^/users/me/sessions$"),`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `24: new RegExp("^/insurance/my-policy$"),`
- `25: new RegExp("^/insurance/benefits-summary$"),`
- `26: new RegExp("^/insurance/claims$"),`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
