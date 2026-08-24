# Semantic evidence — Mobile Nursing Service Info

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/nursing/service-info.tsx:26–45` calls `/home-care/services/{serviceId}` and has a loading and missing-service state, but the request does not visibly validate `serviceId`, owner/public access, service status or 404 semantics. The catch logs only and the user receives a generic unavailable screen; there is no retry action or distinction between unauthenticated, unavailable, expired or deleted service.

The title/description/preparation/image are selected through localization helpers (`:47–53`) and the image falls back to a generic nurse icon (`:63–70`). Price, duration, insurance availability and localized content are rendered directly from the response (`:80–100`) without typed range/currency/freshness/availability validation or provenance. `insurance_availability` is displayed as “accepts insurance” without proving policy/network eligibility, copay, preauthorization or supported service types.

The `احجز الآن` CTA routes to `/nursing/service-details` and passes service ID plus `flow`, `gender`, `availability`, `nationality` and `search` values from route params/defaults (`:55–58,128–137`). These filters are not server-confirmed in this screen, and no slot/provider selection, quote, address, payment or insurance context is established here. There is no explicit unavailable/booking-disabled state for a service that lacks price, availability or contract support. No Phase 0 remediation was made.
