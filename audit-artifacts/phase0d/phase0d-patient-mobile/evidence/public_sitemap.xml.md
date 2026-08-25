# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `public/sitemap.xml`
- **Member SHA-256:** `5483f781fe405607e8df3d8103b15b3ea80ad7f59716502972bfb22ff8a9d1a2`
- **Line count:** 112
- **Read range:** `1-112`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: <!-- Main Pages -->`
- `68: <!-- Dynamic Pages: Doctor Detail -->`
- `79: <!-- Dynamic Pages: Medicine Detail -->`
- `90: <!-- Dynamic Pages: Lab Detail -->`
- `101: <!-- Dynamic Pages: Nursing Service Detail -->`
### backend_consumers_or_contracts
- `27: <loc>https://nabdahplus.com/labs</loc>`
- `34: <loc>https://nabdahplus.com/nursing</loc>`
- `48: <loc>https://nabdahplus.com/insurance</loc>`
- `91: <!-- Pattern: /labs/:slug -->`
- `94: <loc>https://nabdahplus.com/labs/complete-blood-count</loc>`
- `102: <!-- Pattern: /nursing/:slug -->`
- `105: <loc>https://nabdahplus.com/nursing/home-iv-injection</loc>`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `48: <loc>https://nabdahplus.com/insurance</loc>`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
