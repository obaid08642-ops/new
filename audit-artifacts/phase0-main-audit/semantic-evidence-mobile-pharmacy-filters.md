# Semantic evidence — Mobile Pharmacy Filters

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/filters.tsx:17–29,57–92` initializes categories and forms from hard-coded fallback arrays before calling `/medicines/filters`. If the API fails, the catch is empty and fallback categories/forms remain visible, while brands remain empty; this can present a curated taxonomy not confirmed by the backend. API category labels are mapped through a small hard-coded Arabic `iconMap` and unmapped values are shown raw (`:67–81`); forms and brands are shown as raw server strings (`:83–88`).

Filter state is initialized from route params as unvalidated strings (`:46–55`), including category, forms, brands, rx flag, sort and min/max prices. The screen does not validate numeric ranges, min ≤ max, allowed enum values, duplicate brand/form values, locale or parameter length. Brand search uses case-sensitive `includes` (`:97`), with no normalization, pagination or empty-state explanation.

Apply replaces the pharmacy tab with serialized comma-separated parameters (`:107–121`), but this screen does not fetch or verify filtered results and there is no contract proof that the consumer interprets every key identically. Reset clears local state but does not apply until a separate Apply tap (`:123–132`), which can confuse the visible state and active catalog state. Filter requests have no retry/loading indicator and no visible stale-data timestamp.

The RX toggle and price range are client-side query controls (`:215–265`); server-side prescription eligibility, stock/price freshness, and unavailable/empty/error result semantics are not established here. No Phase 0 remediation was made.
