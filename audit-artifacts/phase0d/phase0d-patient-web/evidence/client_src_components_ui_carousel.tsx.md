# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/carousel.tsx`
- **Member SHA-256:** `42f66e6fde568c209df5d58a4ca13c3ae92d120a04fd99f7be695d6a570ef0a9`
- **Line count:** 239
- **Read range:** `1-239`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `193: onClick={scrollPrev}`
- `223: onClick={scrollNext}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `122: role="region"`
- `123: aria-roledescription="carousel"`
- `159: role="group"`
- `160: aria-roledescription="slide"`
### state_transitions
- `37: throw new Error("useCarousel must be used within a <Carousel />");`
- `59: const [canScrollPrev, setCanScrollPrev] = React.useState(false);`
- `60: const [canScrollNext, setCanScrollNext] = React.useState(false);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `37: throw new Error("useCarousel must be used within a <Carousel />");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
