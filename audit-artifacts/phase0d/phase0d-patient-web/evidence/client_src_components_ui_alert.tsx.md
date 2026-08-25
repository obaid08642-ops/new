# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/alert.tsx`
- **Member SHA-256:** `eccfc7f6ca9d51407cb413a3ca4b5ac721898ac93d38e95c02c35188ad674abe`
- **Line count:** 66
- **Read range:** `1-66`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `30: role="alert"`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `11: default: "bg-card text-card-foreground",`
- `13: "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
