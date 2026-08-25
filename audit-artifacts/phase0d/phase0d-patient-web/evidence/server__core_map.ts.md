# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/map.ts`
- **Member SHA-256:** `c04f24ee38ef6840d56053f3464091d164a6236fc36e37672d555a684461ab7e`
- **Line count:** 319
- **Read range:** `1-319`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `106: routes: Array<{`
- `246: * DIRECTIONS - Get navigation routes between locations`
- `249: * Output: DirectionsResult  // routes[0].legs[0].distance, duration, steps`
### backend_consumers_or_contracts
- `49: * @param endpoint - The API endpoint (e.g., "/maps/api/geocode/json")`
- `74: const response = await fetch(url.toString(), {`
- `240: * Endpoint: /maps/api/geocode/json`
- `247: * Endpoint: /maps/api/directions/json`
- `254: * Endpoint: /maps/api/distancematrix/json`
- `261: * Endpoint: /maps/api/place/textsearch/json`
- `268: * Endpoint: /maps/api/place/nearbysearch/json`
- `275: * Endpoint: /maps/api/place/details/json`
- `282: * Endpoint: /maps/api/elevation/json`
- `289: * Endpoint: /maps/api/timezone/json`
- `304: * Endpoint: /maps/api/place/autocomplete/json`
- `311: * Endpoint: /maps/api/staticmap`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `26: throw new Error(`
- `83: const errorText = await response.text();`
- `84: throw new Error(`
- `85: `Google Maps API request failed (${response.status} ${response.statusText}): ${errorText}``
- `128: status: string;`
- `136: status: string;`
- `141: status: string;`
- `163: status: string;`
- `176: business_status?: string;`
- `179: status: string;`
- `206: status: string;`
- `215: status: string;`
### payment_insurance_relevance
- `175: user_ratings_total?: number;`
- `191: user_ratings_total?: number;`
### error_empty_loading_retry_cancel
- `26: throw new Error(`
- `83: const errorText = await response.text();`
- `84: throw new Error(`
- `85: `Google Maps API request failed (${response.status} ${response.statusText}): ${errorText}``

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
