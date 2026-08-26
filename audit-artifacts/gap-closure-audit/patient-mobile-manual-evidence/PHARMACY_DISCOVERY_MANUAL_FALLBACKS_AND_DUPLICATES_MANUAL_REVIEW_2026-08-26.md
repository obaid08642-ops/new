# Patient Mobile: Pharmacy discovery, manual fallbacks and duplicate routes — manual semantic review

## Scope

| Surface | Source | Lines |
|---|---|---:|
| barcode and package vision | `app/pharmacy/barcode-scanner.tsx` | 1–240 |
| custom-item support request | `app/pharmacy/custom-item.tsx` | 1–405 |
| drug-not-found fallback | `app/pharmacy/drug-not-found.tsx` | 1–157 |
| advanced filters | `app/pharmacy/filters.tsx` | 1–382 |
| manual cart item | `app/pharmacy/manual-order.tsx` | 1–142 |
| medicine compare | `app/pharmacy/medicine-compare.tsx` | 1–144 |
| legacy pharmacy chat | `app/pharmacy/pharmacist-chat.tsx` | 1–425 |
| product detail | `app/pharmacy/product-detail.tsx` | 1–562 |
| product-search alias | `app/pharmacy/product-search.tsx` | 1–6 |
| prescription OCR | `app/pharmacy/scan-prescription.tsx` | 1–376 |
| wishlist | `app/pharmacy/wishlist.tsx` | 1–247 |

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| PM-PHARM-DISC-001 | `barcode-scanner.tsx:25–58` | image AI result is used to select the first text-search product automatically; no patient confirmation, confidence, active ingredient, dosage or false-match safety gate exists | AI only proposes candidates with confidence/disclaimer; patient explicitly selects a verified catalog item |
| PM-PHARM-DISC-002 | `barcode-scanner.tsx:60–98` | barcode result labels catalog discovery as available and displays catalog price before any pharmacy offer | use catalog identity only; availability and final price remain offer-specific |
| PM-PHARM-DISC-003 | `scan-prescription.tsx:72–119` | raw base64 prescription is sent to OCR then upload; matched OCR lines are silently auto-added with `price: 0`, no patient line review/consent or structured unmatched-line flow | secure upload before OCR, explicit extraction review, clinical/prescription validation and server request lines; no zero-price client cart state |
| PM-PHARM-DISC-004 | `manual-order.tsx:24–48, 75–120` | photo and description are never persisted; a `manual_<timestamp>` product at zero price is inserted into cart and sent toward checkout | custom line must be a server-owned inquiry/request with attachment/document ID, review state and no fabricated catalog SKU |
| PM-PHARM-DISC-005 | `custom-item.tsx:68–95, 97–128` | UI promises pharmacy sourcing but creates a generic support ticket, returns no request identifier/status and can attach PHI through generic support media | explicitly label as support (or implement order-request contract), return owned tracking ID/status and use PHI-safe scoped upload/retention |
| PM-PHARM-DISC-006 | `drug-not-found.tsx:23–49, 102–143` | image upload is only a boolean; on shortage lookup failure the screen sets success and promises pharmacy notification without a persisted request | remove false success; implement upload + typed request/broadcast fallback and failure/retry state |
| PM-PHARM-DISC-007 | `filters.tsx:17–29, 57–92, 107–121` | hard-coded categories/forms stay usable after filter metadata failure, and client values are passed through route params without validation | remove deceptive fallback filters or label unavailable; stable server IDs/validated query schema and persistent filter semantics |
| PM-PHARM-DISC-008 | `medicine-compare.tsx:33–45, 108–120` | absent route IDs default to test products `1,2`; add-to-cart buttons are no-op placeholders. Price/rating based "best" label is an unsupported clinical recommendation simplification | require valid ids; bind cart action to catalog; remove/reframe "best" and use transparent comparison/medical-safety policy |
| PM-PHARM-DISC-009 | `pharmacist-chat.tsx:38–94, 157–162, 212–255` | second chat API loads the first thread and hard-codes "Al-Dawaa – Al-Malqa" identity. Its invoice message routes directly to payment without selected order/offer verification | delete or migrate legacy chat; retain only one order-scoped thread, signed identity, server invoice/offer version and payment eligibility |
| PM-PHARM-DISC-010 | `product-detail.tsx:117–137, 177–204, 314–375` | detail reads a catalog item but copies its catalog price and Rx flag to local cart. The Rx warning says upload occurs before payment rather than before broadcast/offer acceptance | cart takes immutable catalog item reference/quantity only; server quote/Rx state drives all checkout language and gating |
| PM-PHARM-DISC-011 | `wishlist.tsx:34–68, 105–179` | wishlist copies raw name/price/Rx/stock fields to cart and presents emoji/raw display fields; it does not revalidate catalog/Rx before ordering | fetch/revalidate catalog reference at add time; preserve Rx and do not treat wishlist data as an order quote |
| PM-PHARM-DISC-012 | `product-search.tsx:1–6` | this is a clean redirect alias to `/search`, not a separate product search surface | retain as documented alias or migrate deep links; audit `/search` in its actual domain before parity claims |

## Conclusion

All 22 Pharmacy sources in the Mobile inventory are now manually read. Several discovery surfaces contain active fake-success, zero-price, test-ID, or duplicate chat behavior. The correct remediation is not to copy any of these states to Web; it is one shared pharmacy request/offers/payer state machine with trusted catalog references, verified Rx/document handling, explicit patient consent and authoritative price/stock/insurance decisions.
