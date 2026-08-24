# Semantic evidence — Mobile DiagnosticsHub

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx` is a large combined Labs/Radiology hub. It fetches `/labs/packages`, `/labs/services`, `/radiology/services`, and `/providers?type=lab` in parallel (`:55–84`), but each failed request is converted to `{data: []}` and the outer catch only logs; error, empty, and unavailable are not distinguished.

The UI includes search input (`:107–125`), labs/radiology tab, home/clinic mode, selected address, insurance-upload CTA, package/test/lab navigation, diagnostic cart, and animated entrances (`:127–235`, `:389–439`). The `activeFilter` state is selected in a bottom sheet but is not used in the shown data filtering logic; the visible lists only use `mainTab`, `serviceType`, and `searchQuery` is not applied to list data in the confirmed source. This makes several filter controls visually present but behaviorally incomplete.

Lab tests add cart items with client-provided name/price and `kind: 'lab'` (`:262–274`, `:320–332`); packages navigate to detail; individual tests navigate to `/diagnostics/test-detail`. Lab cards navigate to `/diagnostics/lab/{id}`. Radiology cards filter by `homeAvailable`, route to the same test-detail page with `isRadiology=true`, and expose an immediate `/diagnostics/checkout` action carrying `total`, `radiologyType`, and `serviceId` as route params (`:342–382`). The cart CTA routes to `/diagnostics/cart` (`:389–404`).

The screen contains user-facing claims such as mobile radiology devices and accredited reports (`:345–351`) and an insurance prompt suggesting immediate coverage/booking; these require backend/provider evidence before being treated as guaranteed capabilities. It is `@ts-nocheck` and includes multiple local display transformations/fallbacks, so schema and truthfulness checks remain required.

## Cross-layer verification required

1. Reconcile `/labs/packages` and `/labs/services` canonical DTOs with Web.
2. Verify `/radiology/services` filter contract and detail identifier contract.
3. Trace package/test detail, lab detail, checkout, insurance upload/approval, cart, booking-confirm, and orders/results screens end to end.
4. Verify cart price authority, quantity, idempotency and rollback.
5. Verify home/clinic address and provider selection semantics.
6. Verify every filter actually changes the server request or local list.
7. Compare animation/accessibility/reduced-motion behavior with Web requirements.

No Phase 0 remediation was made.
