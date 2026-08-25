# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/_app.tsx`
- **Member SHA-256:** `e9316262889ee0600d8250142ddc85e732b9eece2838fe0ec2f96c0a9c7dc898`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: export default function App({ Component, pageProps, router }: AppProps) {`
- `6: // If the route is under /admin, wrap it with the AdminGuard`
- `7: if (router.pathname.startsWith('/admin')) {`
- `10: <Component {...pageProps} />`
- `16: return <Component {...pageProps} />;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: import { AdminGuard } from "@/components/AdminGuard";`
- `6: // If the route is under /admin, wrap it with the AdminGuard`
- `7: if (router.pathname.startsWith('/admin')) {`
- `9: <AdminGuard>`
- `11: </AdminGuard>`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
