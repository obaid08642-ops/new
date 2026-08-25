# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/skeleton.tsx`
- **Member SHA-256:** `1f75b999a5ad2f65e8fb807faa2b3fccef9eb333996fb4c9030575dac7393091`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `3: function Skeleton({ className, ...props }: React.ComponentProps<"div">) {`
- `6: data-slot="skeleton"`
- `13: export { Skeleton };`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
