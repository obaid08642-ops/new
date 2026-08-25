# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/settings/settings.module.css`
- **Member SHA-256:** `0375ab6489c2940c389cfc0f8a6b4f192606c3f420155a13bad461e5a77d054b`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `25: @media (max-width: 440px) { .page { gap: 1rem; padding-top: 1rem; } .card li { align-items: flex-start; flex-direction: column; gap: .25rem; } .card li strong { text-align: start; white-space: normal; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `17: .sessionsSummary { margin-top: .85rem !important; color: var(--muted); font-size: .78rem !important; line-height: 1.55; }`
### state_transitions
- `19: .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(`
- `20: .state h1, .state p { margin: 0; }`
- `21: .state h1 { color: var(--ink); font-size: 1.1rem; }`
- `22: .state p { line-height: 1.7; }`
### payment_insurance_relevance
- `9: .card { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: .95rem; padding: 1.2rem; border: 1px solid var(--line); border-radius: var(--radius-xl); background: rgba(255,255,255,.92); box-shadow: var(--shadow`
- `10: .card h2 { margin: 0 0 .85rem; color: var(--ink); font-size: 1.05rem; }`
- `11: .card p { margin: .65rem 0 .25rem; color: var(--muted); font-size: .84rem; line-height: 1.55; }`
- `12: .card strong { color: var(--brand-deep); font-size: .92rem; }`
- `14: .card ul { display: grid; gap: .65rem; margin: .9rem 0 0; padding: 0; list-style: none; }`
- `15: .card li { display: flex; justify-content: space-between; gap: .85rem; padding-block-start: .65rem; border-top: 1px solid rgba(229,232,238,.72); color: var(--muted); font-size: .8rem; }`
- `16: .card li strong { font-size: .8rem; text-align: end; white-space: nowrap; }`
- `25: @media (max-width: 440px) { .page { gap: 1rem; padding-top: 1rem; } .card li { align-items: flex-start; flex-direction: column; gap: .25rem; } .card li strong { text-align: start; white-space: normal; } }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
