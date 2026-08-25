# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/config/seo.ts`
- **Member SHA-256:** `96c6a44788b9372305d990d557deb74a7086d8ee8e5bb83e326d2295f5ba1ecf`
- **Line count:** 226
- **Read range:** `1-226`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `128: url: `${WEB_BASE}/labs/${test.slug}`,`
- `144: url: `${WEB_BASE}/nursing/${service.slug}`,`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `14: price: number;`
- `34: price?: number;`
- `35: insuranceCoverage?: string[];`
- `46: price: number;`
- `56: basePrice: number;`
- `79: priceRange: `${doctor.price} SAR`,`
- `109: offers: medicine.price`
- `111: '@type': 'Offer',`
- `112: price: medicine.price,`
- `113: priceCurrency: 'SAR',`
- `129: offers: {`
- `130: '@type': 'Offer',`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
