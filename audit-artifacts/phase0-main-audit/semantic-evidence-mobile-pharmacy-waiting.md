# Semantic evidence — Mobile Pharmacy Waiting for Pharmacy

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/waiting-for-pharmacy.tsx:90–121` polls `GET /orders/{orderId}` every three seconds and routes to `/pharmacy/order-confirm` when state is `ACCEPTED`, `PREPARING`, or `basket_review_status === submitted_for_patient_approval`. The source comments still state “after 5 seconds simulates pharmacy found” (`:5–8`), while the implementation says the simulated fallback was removed (`:116`); this documentation drift is itself a verification risk. Polling failures are swallowed (`:108–110`), so the patient sees an indefinite search with no retry/error/timeout/expired/closed state. Unknown backend states never transition the UI.

The route parameter is checked only for truthiness (`:93–96`); there is no identifier validation, owner/stranger/unauth proof, order-state authorization, correlation with patient/account, or terminal polling stop beyond the accepted branch. Polling has no backoff, cancellation on app background, server deadline, server-provided ETA, websocket alternative, or preservation/recovery of state after restart.

The cancel action asks for confirmation and sends `POST /orders/{orderId}/cancel`, navigating home only after request success (`:123–139`). This is better than unconditional navigation, but no visible Idempotency-Key, state/version precondition, replay behavior, ownership test, refund/payment compensation or already-accepted cancellation handling exists. A failed cancellation remains on the page with an alert but no domain-specific retry state. The informational cards claim verified pharmacies, insurance acceptance and nearest matching (`:198–247`) without showing the backend evidence or current values, so these claims require contract/UX truthfulness verification.

Radar/dots animation is present and should respect reduced-motion policy at the shared design-system level, but this screen has no visible reduced-motion branch. No Phase 0 remediation was made.
