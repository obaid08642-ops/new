# Business-logic abuse (16.12): the rules and the test of each

| rule | where it is enforced | test |
|---|---|---|
| No loyalty accrual on prescription items (D-10) | `LoyaltyService.onOrderDelivered` / `onServiceCompleted` (`isPrescriptionOnlyOrder`) | `loyalty/loyalty-rx-earn.spec.ts` |
| No coupon on prescription items | `CouponService`: the discount, the minimum order and the cap are worked out on `order_total - rx_total`; an all-Rx cart is `rx_only_cart` | `finance-engine/coupon-rx-abuse.spec.ts` |
| No points redemption against prescription items | `LoyaltyRedeemService.quote/redeem(…, rxTotal)` | same spec (second describe) |
| Challenges are health habits only (decision 9) | `LoyaltyService` (create refused, hidden from patients) | `loyalty/loyalty-purchase-challenges.spec.ts` (existing) |
| Loyalty earn caps per day / month, one award per (reason, ref), atomic claim of rewards | `LoyaltyService.awardPoints`, `claimReward` | `loyalty/loyalty.earn.spec.ts`, `loyalty.service.spec.ts` (existing) |
| Coupon guessing stops after 10 refused codes an hour (per account) | `CouponService.validate` (`coupon_failures`) | `coupon-rx-abuse.spec.ts` |
| One use per account; `max_uses` cannot be overused by parallel orders; a cancelled order gives the use back once | `CouponService.apply/release` | `coupon-rx-abuse.spec.ts` (12 parallel orders, 3 uses: exactly 3 win) |
| Referral: one person per referral (phone of the account, device of the session; keyed hashes only), the referrer's own second account refused, atomic by unique index | `ReferralService.apply` | `referral/referral-fraud.spec.ts` (real MongoDB, 6 parallel requests: 1 wins) |
| Referral: a referrer is rewarded for at most 10 conversions in 30 days (`REFERRAL_MAX_REWARDS_PER_MONTH`), the rest are held without points | `ReferralService.onBookingCompleted` | same spec |
| Reviews only from a finished service the reviewer used, about the provider who did it | `RatingsService.verifiedProvider` (POST /ratings); `PatientUxService.rate` (POST /patient-ux/review, already) | `ratings/ratings-verified.spec.ts` |
| Server-side prices and totals | pricing is computed in the services; the client sends no total | existing order / pharmacy specs |
| Atomic stock reservation; a release gives the stock back once | `SmartSplitService.reserveStock`, `releaseStockForAllocation` (the release is now claimed atomically) | `pharmacy/services/stock-reservation-atomic.spec.ts` (real MongoDB: 20 parallel reservations of 5 units: exactly 5 win; 3 parallel releases: stock back once) |
| Per-user rate limits on expensive actions: AI (daily quota + per-minute), uploads (60 an hour per account; 10 an hour per address for the guest image upload), search (120 a minute, suggestions 600) | `AiUserQuotaGuard`, `UserRateLimitGuard` (`USER_RATE_LIMIT_<BUCKET>=<limit>/<seconds>` tunes a bucket) | `common/user-rate-limit.spec.ts` |

Live: `tools/live/j_business_rules.py` (reviews of invented bookings are refused; the referral rules over HTTP).

## Findings fixed on the way
- `POST /ratings` accepted any entity id and any provider id: anyone could rate any provider. It now needs a finished service of the reviewer and takes the provider from that service.
- `releaseStockForAllocation` could credit stock twice when two paths released the same allocation at once (the flag was checked before it was flipped).
- Referral had no check on who the referred person is: any number of accounts could apply codes from one phone or one device.
- `CouponService.recordCouponFailure` existed but nothing called it; the counting now lives in `validate`.

## Not reachable today (stated)
Coupons and points redemption have no live caller: `OrdersService.create` is disabled (`canonical_pharmacy_flow_required`) and the canonical pharmacy flow takes no coupon. The rules are in the engines, so wiring a coupon into the pharmacy flow later must pass `rx_total` (the SAR value of the lines with `requires_prescription`); the spec shows what the engine does with it.
