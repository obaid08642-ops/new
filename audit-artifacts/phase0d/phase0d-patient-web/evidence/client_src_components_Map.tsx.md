# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/Map.tsx`
- **Member SHA-256:** `931413fea95936e68f872bc34733138f9e11a656446b1a56a98fba9532954e22`
- **Line count:** 155
- **Read range:** `1-155`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `55: * 🛣️ ROUTES (from `routes` library)`
- `59: * directionsService.route(`
- `138: fullscreenControl: true,`
### backend_consumers_or_contracts
- `98: script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `13: *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.`
- `39: * geocoder.geocode({ address: "New York" }, (results, status) => {`
- `40: *   if (status === "OK" && results[0]) {`
- `61: *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)`
- `105: script.onerror = () => {`
- `106: console.error("Failed to load Google Maps script");`
- `131: console.error("Map container not found");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `105: script.onerror = () => {`
- `106: console.error("Failed to load Google Maps script");`
- `131: console.error("Map container not found");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
