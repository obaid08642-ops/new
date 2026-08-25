# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase9-pnpm-audit-summary.json`
- **Member SHA-256:** `2f83ef1ff815c431d5935ec47ccb1b4483d6ce1227ba7c235d7c441b3a56d8a0`
- **Line count:** 403
- **Read range:** `1-403`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `174: "title": "Vite Vulnerable to Arbitrary File Read via Vite Dev Server WebSocket",`
### auth_ownership
- `55: "title": "pnpm has Path Traversal via arbitrary file permission modification ",`
### state_transitions
- `384: "title": "PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure",`
### payment_insurance_relevance
- `2: "total_records": 56,`
### error_empty_loading_retry_cancel
- `384: "title": "PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure",`
- `398: "title": "node-tar: Uncontrolled recursion in mapHas/filesFilter allows uncatchable stack-overflow DoS via crafted long-path tar with member selection",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
