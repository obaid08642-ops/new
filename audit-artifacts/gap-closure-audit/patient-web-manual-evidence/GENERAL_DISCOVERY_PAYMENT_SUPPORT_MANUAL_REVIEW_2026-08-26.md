# Patient Web: General discovery, payments and support — manual source review

The localized route tree contains no community, delivery-address, drug-scanner, map, offers, payment-outcome, programs, review, room, public short-link resolver, search, services-directory, location-picker, support-ticket, voice or wearable page. The source tree does include isolated appointment payment-intent and call-token BFFs, but no dedicated patient-facing outcome/room flow; those BFFs are not equivalent to the Mobile surfaces below.

| Mobile rows | Classification | Source-bounded gap |
|---|---|---|
| PM-020 AI assistant; PM-212 AI report | `MISSING_CAPABILITY` | No Web AI assistant/report interaction, consent, grounding, safety or escalation surface. |
| PM-031/PM-032 community | `MISSING_CAPABILITY` | No community hub/post detail/moderation/report/consent workflow. |
| PM-061 delivery address; PM-237 shared location picker; PM-144 map | `MISSING_CAPABILITY` | No address/location/geocoding/permission/default-address/privacy workflow. |
| PM-082 drug scanner | `MISSING_CAPABILITY` | No scanner/camera/OCR/medicine verification/retention workflow. |
| PM-178/PM-179 offers | `MISSING_CAPABILITY` | No offer list/detail/eligibility/redemption/expiry or price authority surface. |
| PM-181–PM-184 payment outcomes | `MISSING_CAPABILITY` | No payment processing/success/failure/receipt/retry/reconciliation UI; a BFF alone does not create a patient outcome flow. |
| PM-211 programs; PM-214/PM-215 report passport/timeline | `MISSING_CAPABILITY` | No programs/report-passport/timeline surface or PHI sharing/provenance workflow. |
| PM-220 reviews | `MISSING_CAPABILITY` | No review form, booking ownership, moderation or outcome surface. |
| PM-221 room; PM-222 public short link; PM-223 search; PM-224 services | `MISSING_CAPABILITY` | No room join/deep-link resolver/search/service-directory patient surface. |
| PM-239 support ticket; PM-240 voice; PM-246 wearables | `MISSING_CAPABILITY` | No ticketing/voice/device-linking consent, lifecycle, audit or error surface. |

No source-only absence finding proves backend availability, native behavior, browser permissions, payments, security enforcement, or runtime behavior.
