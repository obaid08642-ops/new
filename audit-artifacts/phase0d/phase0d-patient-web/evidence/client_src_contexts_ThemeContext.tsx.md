# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/contexts/ThemeContext.tsx`
- **Member SHA-256:** `e025cdb51ad747757235b16dccbb39b5e949cdf93fa9a822ff81ef6e32f65924`
- **Line count:** 64
- **Read range:** `1-64`
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
- `1: import React, { createContext, useContext, useEffect, useState } from "react";`
- `24: const [theme, setTheme] = useState<Theme>(() => {`
- `61: throw new Error("useTheme must be used within ThemeProvider");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `61: throw new Error("useTheme must be used within ThemeProvider");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
