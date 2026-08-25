# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/pages/NotFound.tsx`
- **Member SHA-256:** `4062794318dde4d0a321e0332cdee2cea68d19c1d9d81889ff425b02ed183f64`
- **Line count:** 52
- **Read range:** `1-52`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">`
- `27: Page Not Found`
- `31: Sorry, the page you are looking for doesn't exist.`
- `41: onClick={handleGoHome}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `2: import { Card, CardContent } from "@/components/ui/card";`
- `15: <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">`
- `16: <CardContent className="pt-8 pb-8 text-center">`
- `48: </CardContent>`
- `49: </Card>`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
