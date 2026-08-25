# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ManusDialog.tsx`
- **Member SHA-256:** `66237a756ee50b4195a074f689aa97dd4ec445cbbc6f0d11f12bb32a6fb4cd0d`
- **Line count:** 89
- **Read range:** `1-89`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: onLogin: () => void;`
- `25: onLogin,`
- `73: Please login with Manus to continue`
- `78: {/* Login button */}`
- `80: onClick={onLogin}`
- `83: Login with Manus`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `16: onLogin: () => void;`
- `25: onLogin,`
- `73: Please login with Manus to continue`
- `78: {/* Login button */}`
- `80: onClick={onLogin}`
- `83: Login with Manus`
### state_transitions
- `1: import { useEffect, useState } from "react";`
- `29: const [internalOpen, setInternalOpen] = useState(open);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
