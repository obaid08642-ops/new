# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/ProductImage.tsx`
- **Member SHA-256:** `77bc0bb06f1fe386b0bc99fb7d08f5f0b3766e709a5d26bb669992c2a5b93dd4`
- **Line count:** 63
- **Read range:** `1-63`
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
- `1: import React, { useState } from 'react';`
- `11: *   ✔ placeholder (blurred box + pill icon while loading)`
- `12: *   ✔ onError fallback — a broken image is NEVER shown`
- `32: const [failed, setFailed] = useState(false);`
- `34: if (!resolved || failed) {`
- `52: onError={() => setFailed(true)}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `11: *   ✔ placeholder (blurred box + pill icon while loading)`
- `12: *   ✔ onError fallback — a broken image is NEVER shown`
- `32: const [failed, setFailed] = useState(false);`
- `34: if (!resolved || failed) {`
- `52: onError={() => setFailed(true)}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
