# Semantic evidence — Patient Web home-care catalog and detail

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

The services page validates locale, fetches `getPublicHomeCareServices`, parses through `extractHomeCareServices`, supports GET search, renders unavailable/empty/no-match states, and links each service using the server-provided `service.id`. It displays server-derived name, description and price when present. The list is a read/catalog surface.

The detail page validates locale, fetches by `serviceId`, returns not-found for 404 or invalid extraction, and renders name, description, price, duration, insurance availability and a translated `bookingNotice`. It does not render a provider selector, address form, slot selection, quote confirmation, insurance/cash choice, payment CTA or booking mutation. Therefore home-care service detail is not a complete patient purchase/booking journey in this baseline. It is a truthful detail/notice surface only.

The use of `service.id` in links and parser extraction requires identifier validation and current Backend route proof. Price and insurance flags are display-only at this layer and cannot authorize a booking amount or payment state. No Phase 0 remediation was made.
