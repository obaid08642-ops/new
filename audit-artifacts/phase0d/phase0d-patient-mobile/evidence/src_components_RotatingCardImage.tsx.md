# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/RotatingCardImage.tsx`
- **Member SHA-256:** `0faa6abb2579e526036da41b37e4ffd786737f6895752c3f8e931cf0da3313ee`
- **Line count:** 50
- **Read range:** `1-50`
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
- `1: import React, { useEffect, useRef, useState } from 'react';`
- `22: const [idx, setIdx] = useState(0);`
- `25: const [width, setWidth] = useState(0);`
### payment_insurance_relevance
- `6: * RotatingCardImage — for catalogue cards. When a product has several real`
- `7: * photos, the card cycles through them every few seconds with a SLIDE`
- `11: export default function RotatingCardImage({`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
