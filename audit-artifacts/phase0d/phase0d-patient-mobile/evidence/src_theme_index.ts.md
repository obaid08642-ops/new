# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/theme/index.ts`
- **Member SHA-256:** `4f22932f537fd0c217c83aeadf125b513746af1d4ab11b50909f4b2a84ef90be`
- **Line count:** 316
- **Read range:** `1-316`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `223: screen: 20,`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `4: // Brand tokens – single source of truth.`
- `5: // In the future, an Admin Dashboard can override `BrandColors` at runtime`
### state_transitions
- `18: success: '#5BA84F',`
- `19: successLight: '#8FD4E3',`
- `22: error: '#F0695C',`
- `23: errorLight: '#FEEFED',`
- `58: success: BrandColors.success,`
- `59: successLight: BrandColors.successLight,`
- `60: successSurface: '#EBF6E9',`
- `64: error: BrandColors.error,`
- `65: errorLight: BrandColors.errorLight,`
- `66: errorSurface: '#FEEFED',`
- `132: success: '#5BA84F',`
- `133: successLight: '#8FD4E3',`
### payment_insurance_relevance
- `287: card: 10,`
### error_empty_loading_retry_cancel
- `22: error: '#F0695C',`
- `23: errorLight: '#FEEFED',`
- `64: error: BrandColors.error,`
- `65: errorLight: BrandColors.errorLight,`
- `66: errorSurface: '#FEEFED',`
- `138: error: '#F0695C',`
- `139: errorLight: '#FEEFED',`
- `140: errorSurface: '#1A2234',`
- `268: shadowColor: BrandColors.error,`
- `301: emergency: [BrandColors.error, BrandColors.errorLight],`
- `303: sunset: [BrandColors.warning, BrandColors.error],`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
