# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/index.css`
- **Member SHA-256:** `b0f80913bdb81b376adaf666b19c438422a580bbd0bc7bbf709cd7d3b53b22e6`
- **Line count:** 177
- **Read range:** `1-177`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `126: [type="submit"]:not(:disabled),`
- `143: * - Set max-width for large screens`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `124: [role="button"]:not([aria-disabled="true"]),`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `13: --color-card: var(--card);`
- `14: --color-card-foreground: var(--card-foreground);`
- `58: --card: oklch(1 0 0);`
- `59: --card-foreground: oklch(0.235 0.015 65);`
- `88: --card: oklch(0.21 0.006 285.885);`
- `89: --card-foreground: oklch(0.85 0.005 65);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
