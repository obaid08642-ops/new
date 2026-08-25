# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/App.tsx`
- **Member SHA-256:** `d5be9281dc24312213bbca716a599ce653c47b20710ae87bb030b415b8e1572d`
- **Line count:** 42
- **Read range:** `1-42`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import NotFound from "@/pages/NotFound";`
- `4: import { Route, Switch } from "wouter";`
- `7: import Home from "./pages/Home";`
- `9: function Router() {`
- `10: // make sure to consider if you need authentication for certain routes`
- `13: <Route path={"/"} component={Home} />`
- `14: <Route path={"/404"} component={NotFound} />`
- `15: {/* Final fallback route */}`
- `16: <Route component={NotFound} />`
- `35: <Router />`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: import ErrorBoundary from "./components/ErrorBoundary";`
- `28: <ErrorBoundary>`
- `38: </ErrorBoundary>`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: import ErrorBoundary from "./components/ErrorBoundary";`
- `28: <ErrorBoundary>`
- `38: </ErrorBoundary>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
