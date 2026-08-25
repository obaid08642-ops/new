# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/wishlist/wishlist.module.css`
- **Member SHA-256:** `ea38e30b78b93d9fa76029ee955e8e1e0b4760c540995a4f63441a7b710b24ed`
- **Line count:** 1
- **Read range:** `1-1`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page{display:grid;gap:24px}.hero{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:28px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(245,248,252,.7`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: .page{display:grid;gap:24px}.hero{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:28px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(245,248,252,.7`
### payment_insurance_relevance
- `1: .page{display:grid;gap:24px}.hero{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:28px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(245,248,252,.7`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
