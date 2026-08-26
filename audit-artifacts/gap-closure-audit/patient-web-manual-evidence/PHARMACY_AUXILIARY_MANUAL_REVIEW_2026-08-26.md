# Patient Web: Pharmacy auxiliary surfaces — manual source review

The remaining Mobile pharmacy candidates were reviewed against the localized Web route tree. Web has a protected wishlist at `app/[locale]/wishlist/page.tsx:14–29`; it reads item facts and links to medicine detail, but it has no add/remove wishlist action, cart handoff, stock reservation, price quote or notification control. No localized Web routes or CTAs were found for scanner, pharmacist chat, manual/custom order, compare, reorder or prescription scanning.

| Mobile row(s) | Classification | Source-bounded disposition |
|---|---|---|
| PM-206 pharmacy wishlist | `STATIC_MATCHED_PARTIAL` | Read-only wishlist and medicine-detail link exist; no wishlist mutation or purchase/stock workflow. |
| PM-185 barcode scanner; PM-204 scan prescription | `MISSING_CAPABILITY` | No camera/file upload/OCR/prescription verification/privacy/retention or pharmacy handoff surface. |
| PM-188/PM-199 pharmacist chat | `MISSING_CAPABILITY` | No pharmacist-specific chat route, compose, consent, attachment, escalation or audit workflow. |
| PM-190 custom item; PM-191 drug not found; PM-193 manual order | `MISSING_CAPABILITY` | No item request/manual order/availability substitution/pharmacy offer flow. |
| PM-192 filters; PM-194 medicine compare; PM-202 reorder | `MISSING_CAPABILITY` | No feature-specific filter/compare/reorder surface or authority for price/stock/prescription validity. |

No runtime, backend, OCR, inventory, payment or fulfillment claim is made from this source review.
