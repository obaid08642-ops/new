# Semantic evidence — Mobile Offer Detail

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/offers/[id].tsx:24–42` validates only that the route parameter is a string and calls `/offers/{id}` plus `/promotions/offers/{id}/providers`. The detail has loading, load-error, retry and not-found states, but provider failures are silently converted to an empty array (`:37–39`), indistinguishable from no eligible providers. IDs and response shapes are otherwise untyped under `@ts-nocheck`; no ownership/eligibility, publication, expiry, region, or authorization semantics are established.

Pricing renders `discounted_price`, `original_price`, and a locally calculated saving (`:117–133`) without numeric/currency validation, arithmetic assertion, tax/fee disclosure, stock/capacity or payment terms. Validity displays only an end date or start date (`:136–148`) and does not handle expired, not-yet-active, invalid-timezone or cancelled campaigns. Inclusions and terms are direct strings with no sanitization or version/consent acknowledgement (`:150–174`).

Native share sends title, provider and both prices as a full message (`:51–57`) without privacy classification, link/canonical identity, localization policy or share confirmation. Provider cards route only to `/consultations/book/[id]` (`:59–64,176–208`), with no offer ID, campaign price, provider eligibility, appointment type, payment binding, redemption code or server reservation; the offer can therefore be lost in the generic booking journey. There is no purchase/redeem CTA, cart/checkout path, claim status, quota, cancellation/refund or receipt flow.

Missing IDs use list index keys for providers and missing provider data becomes generic text (`:179–187`); rating values are displayed without schema/freshness semantics. No Phase 0 remediation was made.
