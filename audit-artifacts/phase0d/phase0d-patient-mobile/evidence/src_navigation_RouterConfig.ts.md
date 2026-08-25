# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/navigation/RouterConfig.ts`
- **Member SHA-256:** `2395aa4a6b73dfd4dc4d90a55dda3defaf8376457748ec322ae397d7428cb5f5`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { Href } from 'expo-router';`
- `6: // Centralized route definitions to avoid hardcoded strings`
- `7: export const Routes = {`
- `16: Login: '/(auth)/login' as Href,`
- `17: Register: '/(auth)/register' as Href,`
- `28: export type AppRoutes = keyof typeof Routes;`
### backend_consumers_or_contracts
- `11: Pharmacy: '/pharmacy' as Href,`
- `12: Wallet: '/wallet' as Href,`
- `25: ProductDetails: (id: string | number) => `/pharmacy/product/${id}` as Href,`
### auth_ownership
- `16: Login: '/(auth)/login' as Href,`
- `18: ForgotPassword: '/(auth)/forgot-password' as Href,`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `12: Wallet: '/wallet' as Href,`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
