# Semantic evidence — Mobile Pharmacy Checkout

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/checkout.tsx:23–79` presents delivery/pickup, address, insurance presence, wallet balance, loyalty quote and coupon validation. Profile/address/insurance failures are logged or converted to empty defaults (`:47–68`), so unavailable address/insurance can be confused with absence. Delivery fee is calculated locally as 15 SAR for delivery and zero for pickup (`:70–71`); the server may revalidate, but no quote/availability contract is demonstrated in this screen.

Coupon and loyalty calls use POST without a visible idempotency key (`:73–89`), while the rendered total is calculated locally from AsyncStorage/cart subtotal, local delivery fee, coupon result and loyalty quote (`:120–123`). Payment choices include card, wallet, wallet_split, cash and insurance (`:301–333`), but insurance is gated only by the presence of profile insurance and does not show eligibility/authorization/preauthorization; no explicit online payment-intent redirect or payment confirmation path is handled here.

The order payload sends client item IDs, names, quantities and prices, client-derived address fields, payment method, prescription URL and discounts (`:125–158`). The order creation POST `/orders/create` has no visible `Idempotency-Key` (`:160–167`). On success, wallet orders clear the cart and navigate directly to tracking; all other payment types navigate to waiting-for-pharmacy (`:169–177`) without checking that an order ID exists, payment intent state is authorized, insurance accepted, or cash/pickup constraints are satisfied. A replay after timeout can create duplicate orders unless the backend independently enforces idempotency.

The UI has loading/submitting and generic error alert paths, but no explicit state for partial payment, payment cancellation, wallet insufficient race, coupon invalidation between quote and order, address changed/stale, insurance rejected, server price/stock mismatch, duplicate order, or missing order ID. No Phase 0 remediation was made.
