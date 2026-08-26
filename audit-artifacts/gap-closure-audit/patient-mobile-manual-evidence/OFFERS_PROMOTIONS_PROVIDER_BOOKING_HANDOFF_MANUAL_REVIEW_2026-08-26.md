# Patient Mobile: Offers, promotions and provider booking handoff — manual review

## Scope boundary

This read-only source review covers both Offers inventory routes. It does not validate campaign eligibility, price authority, stock/capacity, dates/timezones, advertising disclosures, provider/service mapping, insurance applicability, booking/payment state, or backend authorization.

| Reviewed source | Scope |
|---|---|
| `app/offers/index.tsx` | Offer list and display fields |
| `app/offers/[id].tsx` | Offer details, campaign providers, share and booking CTA |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-OFF-001 | `STATIC_MATCHED_PARTIAL` | `offers/index.tsx:20–30, 57–83`; `offers/[id].tsx:26–49, 117–174` | Surfaces load offer/list data and render prices, discounts, validity, inclusions and terms. Static source cannot establish currency/tax/price authority, campaign inventory/capacity, eligibility, expiry/timezone, sponsored disclosure requirements or consumer-policy audit. | Campaign/price/eligibility contract with authoritative quote/version/expiry; provider/service inventory semantics; pricing/audit/runtime tests. |
| PM-OFF-002 | `CONFIRMED_DEFECT` | `offers/[id].tsx:59–64, 176–210` | Every promotional provider is routed to a consultation booking path solely by provider ID, regardless of offer/service/provider type. No offer ID, price quote, campaign eligibility or selected service is carried to booking. | Service-type-aware CTA with provider/service/offer/quote context; booking/payment/insurance state chain and end-to-end tests. |
| PM-OFF-003 | `INSUFFICIENT_EVIDENCE` | `offers/[id].tsx:51–57, 91–115` | Share composes price and provider text directly from loaded data. Source does not establish validity at share/redeem time, user disclosure/consent, image/content safety or campaign attribution. | Validated share/deep-link policy and current offer-state verification. |

## Conclusion

Offers are data-driven readers, but the provider booking CTA is source-confirmed as generic consultation-only and loses campaign/quote context. Manual source review is complete only for the two listed inventory paths.
