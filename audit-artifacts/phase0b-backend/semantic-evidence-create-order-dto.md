# Phase 0B semantic evidence — create-order.dto.ts

**Archive member:** `src/modules/orders/dto/create-order.dto.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–64; full 64-line member covered.

Lines 3–10 define optional `items` and `cartItems` arrays typed `any[]`; no nested item DTO, quantity/medicine identifier validation, duplicate detection or mutually-exclusive rule is visible.

Lines 12–21 define optional prescription_id string, untyped delivery_address and notes string. Delivery address has no structured schema, coordinate/ownership/normalization/privacy constraints.

Lines 23–41 define optional payment_method string, delivery_mode typed as a TypeScript union but decorated only with IsString, visitType string, hasInsurance boolean and insurance_status string. No enum validation, payment-method allowlist, insurance verification state machine or relation between prescription, insurance and order is visible.

Lines 43–53 define optional numeric totalAmount, home_visit_fee and total_copay with only IsNumber. No nonnegative, precision, currency, max/min or client/server source distinction is encoded. These values are potentially client-controlled and must never be trusted as payable totals or fees.

Lines 55–63 define optional coupon_code string and loyalty_points number. Comments state CouponService validates the coupon server-side and LoyaltyRedeemService caps redemption, but this DTO itself has no numeric nonnegative/integer/bounds validation or idempotency/order replay field.

**Critical contract finding:** The DTO permits two arbitrary line-item array shapes, arbitrary delivery address, arbitrary payment/visit/insurance strings and client-supplied financial amounts. A safe service must derive lines, prices, fees, insurance copay, discounts, currency and payable total from server-side authoritative records, with an idempotency key and atomic inventory/payment/order write.

**Test implications:** require DTO rejection for malformed/empty/duplicate items, invalid quantities, unsupported payment/delivery/visit methods, negative/nonfinite/overprecision money, invalid loyalty points, oversized notes/address, and conflicting items/cartItems. Contract tests must prove totals are ignored/recomputed, prescription/insurance ownership is enforced, address ownership is enforced, and replay returns one stable order without duplicate charge or stock deduction. No tests executed during this semantic read.
