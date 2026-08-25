# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_RADIOLOGY_OPERATIONS_GAPS_20260819.md`
- **Member SHA-256:** `7f6d1b132b03551c30861edc19202110071f089d921a3ed80796f526a98c9522`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: Backend declares a provider inbox and explicit check-in, scanning, abort, insurance approval, report upload/review/publish, reschedule, tracking, and catalog-delta routes. The Provider app should use these stateful, owned transitions rather`
- `11: | **P0** | Report “upload” supplies a fabricated storage URL rather than a selected, stored report | Reporting screen POSTs `https://storage.nabdah.com/reports/{orderId}.pdf` without file selection/upload, then claims PDF draft success. | R`
- `12: | **P0** | Provider accepts cash and rejects bookings through a generic state patch | Initial actions PATCH `state: CONFIRMED/CANCELLED` rather than a specific provider acceptance/rejection/payment decision contract. This bypasses evidence,`
- `14: | **P1** | Rebooking creates an arbitrary future timestamp rather than selecting an available slot | “Tomorrow/2/3/7 days” becomes `Date.now + days` with no facility availability, modality capacity, timezone, preparation or patient agreemen`
- `16: | **P1** | Operational failures look like an empty zero-revenue day | Inboxes failures are converted to empty orders/zero statistics in home and order tabs. | Render loading/error/empty separately, preserve last confirmed data safely, and p`
- `17: | **P1** | Radiology output/UI does not meet locale/PHI display requirements | Dates are always formatted in Arabic locale; patient safety facts and financial values are displayed without six-language/RTL-LTR access review. | Complete local`
- `21: Radiology provider operations are **FIX/BLOCKED**. The current UI can report a nonexistent upload, represent unverified insurance and safety decisions as operational progress, and reschedule without availability validation.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: | **P0** | Provider accepts cash and rejects bookings through a generic state patch | Initial actions PATCH `state: CONFIRMED/CANCELLED` rather than a specific provider acceptance/rejection/payment decision contract. This bypasses evidence,`
- `17: | **P1** | Radiology output/UI does not meet locale/PHI display requirements | Dates are always formatted in Arabic locale; patient safety facts and financial values are displayed without six-language/RTL-LTR access review. | Complete local`
### state_transitions
- `3: ## Confirmed Backend scope`
- `5: Backend declares a provider inbox and explicit check-in, scanning, abort, insurance approval, report upload/review/publish, reschedule, tracking, and catalog-delta routes. The Provider app should use these stateful, owned transitions rather`
- `7: ## Confirmed defects`
- `11: | **P0** | Report “upload” supplies a fabricated storage URL rather than a selected, stored report | Reporting screen POSTs `https://storage.nabdah.com/reports/{orderId}.pdf` without file selection/upload, then claims PDF draft success. | R`
- `12: | **P0** | Provider accepts cash and rejects bookings through a generic state patch | Initial actions PATCH `state: CONFIRMED/CANCELLED` rather than a specific provider acceptance/rejection/payment decision contract. This bypasses evidence,`
- `14: | **P1** | Rebooking creates an arbitrary future timestamp rather than selecting an available slot | “Tomorrow/2/3/7 days” becomes `Date.now + days` with no facility availability, modality capacity, timezone, preparation or patient agreemen`
- `15: | **P1** | Safety questionnaire is shown but does not govern safe action | Pregnancy, implant, pacemaker and contrast fields are visually highlighted, yet generic confirmation/scanning controls are not blocked by a clinician-reviewed contra`
- `16: | **P1** | Operational failures look like an empty zero-revenue day | Inboxes failures are converted to empty orders/zero statistics in home and order tabs. | Render loading/error/empty separately, preserve last confirmed data safely, and p`
### payment_insurance_relevance
- `5: Backend declares a provider inbox and explicit check-in, scanning, abort, insurance approval, report upload/review/publish, reschedule, tracking, and catalog-delta routes. The Provider app should use these stateful, owned transitions rather`
- `12: | **P0** | Provider accepts cash and rejects bookings through a generic state patch | Initial actions PATCH `state: CONFIRMED/CANCELLED` rather than a specific provider acceptance/rejection/payment decision contract. This bypasses evidence,`
- `13: | **P1** | Insurance approval is a free-text NPHIES/coplay assertion | UI accepts any approval code/coplay locally and posts it without a policy/document/item decision or real NPHIES verification. | Bind approvals to an authorized insurer i`
- `21: Radiology provider operations are **FIX/BLOCKED**. The current UI can report a nonexistent upload, represent unverified insurance and safety decisions as operational progress, and reschedule without availability validation.`
### error_empty_loading_retry_cancel
- `5: Backend declares a provider inbox and explicit check-in, scanning, abort, insurance approval, report upload/review/publish, reschedule, tracking, and catalog-delta routes. The Provider app should use these stateful, owned transitions rather`
- `12: | **P0** | Provider accepts cash and rejects bookings through a generic state patch | Initial actions PATCH `state: CONFIRMED/CANCELLED` rather than a specific provider acceptance/rejection/payment decision contract. This bypasses evidence,`
- `16: | **P1** | Operational failures look like an empty zero-revenue day | Inboxes failures are converted to empty orders/zero statistics in home and order tabs. | Render loading/error/empty separately, preserve last confirmed data safely, and p`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
