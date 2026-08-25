# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/pages/Home.tsx`
- **Member SHA-256:** `2eaea972c22e4e1f35a424ed5c1a9d993918220ad54bf6dbe5ea6574595f100f`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: * All content in this page are only for example, replace with your own feature implementation`
- `8: * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls`
- `12: // To implement login/logout, call logout(), or start login from an event`
- `13: // handler: onClick={() => startLogin()} (imported from "@/const"). Never call`
- `14: // startLogin() during render (no href={startLogin()}) — it mints a one-time`
- `16: let { user, loading, error, isAuthenticated, logout } = useAuth();`
- `22: <div className="min-h-screen flex flex-col">`
- `26: Example Page`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: // To implement login/logout, call logout(), or start login from an event`
- `13: // handler: onClick={() => startLogin()} (imported from "@/const"). Never call`
- `14: // startLogin() during render (no href={startLogin()}) — it mints a one-time`
- `15: // nonce cookie and must run only at the moment of navigation.`
- `16: let { user, loading, error, isAuthenticated, logout } = useAuth();`
### state_transitions
- `11: // The useAuth hook provides authentication state.`
- `16: let { user, loading, error, isAuthenticated, logout } = useAuth();`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `16: let { user, loading, error, isAuthenticated, logout } = useAuth();`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
