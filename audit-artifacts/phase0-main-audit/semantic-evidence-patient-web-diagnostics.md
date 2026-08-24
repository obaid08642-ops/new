# Semantic evidence — Patient Web diagnostics catalogs

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Labs services

Source: `app/[locale]/diagnostics/labs/page.tsx`.

The Labs page validates locale, reads search/home-only query parameters, calls `getPublicLabServices`, parses through `extractLabServices`, and renders distinct unavailable and empty/no-match states. It displays service names/descriptions, server-derived price when present, sample type, fasting, home/facility support and unavailable badges. Cards are articles without a detail link or booking CTA in this page. Therefore this source proves a catalog read surface, not a complete lab booking journey.

## Radiology services

Source: `app/[locale]/diagnostics/radiology/page.tsx`.

The Radiology page calls both public services and modalities helpers, validates query values through normalized first values, supports search/modality/body part and home/highest-rated/lowest-price filters, parses the service payload, and renders unavailable/empty/no-match states. It displays server-derived modality, body part, price, duration and support badges. Each service card explicitly renders the translated `detailBlocked` notice and has no detail or booking link. This is a truthful blocked state for the unavailable detail contract, not a broken link.

Both pages use Lucide vector icons and server-backed parsers. Remaining gates include current live endpoint proof, all locale translations, catalog freshness, service detail/booking contracts, quote/payment/insurance/cash branches, and end-to-end patient journeys. No Phase 0 remediation was made.
