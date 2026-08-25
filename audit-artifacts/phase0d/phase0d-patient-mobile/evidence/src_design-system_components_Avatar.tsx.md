# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/Avatar.tsx`
- **Member SHA-256:** `46481be6b347c6eb3e96b21eb903aef07452c0d7920d7c6daed353d607994fd3`
- **Line count:** 236
- **Read range:** `1-236`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `10: import { BorderRadius, Typography } from '../tokens';`
- `111: accessibilityRole="image"`
### state_transitions
- `3: * online indicator, badge overlay, and image loading states.`
- `5: import React, { useState } from 'react';`
- `87: const [imgError, setImgError] = useState(false);`
- `95: const hasImage = source && !imgError;`
- `118: onError={() => setImgError(true)}`
- `146: backgroundColor: isOnline ? colors.success : colors.textTertiary,`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `3: * online indicator, badge overlay, and image loading states.`
- `87: const [imgError, setImgError] = useState(false);`
- `95: const hasImage = source && !imgError;`
- `118: onError={() => setImgError(true)}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
