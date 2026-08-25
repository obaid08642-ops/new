# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_DOCTOR_PROVIDER_CONFIGURATION_GAPS_20260819.md`
- **Member SHA-256:** `b7bf70396e1cc8f10eca069e31700f4a8a8390ee793a2eea96a314567de88b87`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: | **P0** | Vacation mode cannot be persisted despite claiming it blocks new bookings | Toggle changes local UI and displays success, but the only save button is disabled when vacation mode is enabled. No server command is sent at toggle tim`
- `9: | **P0** | Insurance configuration is hard-coded and can report local success without persistence | `InsuranceConfigScreen` has static insurers/copays/tiers and its save function only displays a toast. The availability screen also submits t`
- `10: | **P0** | Credentials and document upload are simulated | Certificate screen starts with named verified/pending credentials and uses a timed progress loop to create a fabricated pending document, without file selection, storage, KYC review`
- `11: | **P1** | Provider profile image and clinic-image controls are incomplete | Image uploader sets `avatarUrl` locally, but profile PATCH omits it; clinic image add button has no handler and static image placeholders are rendered. | Persist o`
- `12: | **P1** | Location, coverage radius, and transport-fee save is purely local | Location screen provides a decorative map and accepts radius/fee but `handleSave` only shows success. | Use an approved geolocation/coverage pricing contract wit`
- `17: Doctor provider configuration is **P0 FIX/BLOCKED**. It cannot govern patient booking, insurance, credential verification, location coverage, or provider identity while its core data and success states are locally fabricated or unpersisted.`
### backend_consumers_or_contracts
- `13: | **P1** | Multiple controls are Arabic/English-only and include emoji/text placeholders | Configuration labels, dates, status, icons and health/insurance content lack six-language locale coverage and premium accessible controls. | Complete`
### auth_ownership
- `9: | **P0** | Insurance configuration is hard-coded and can report local success without persistence | `InsuranceConfigScreen` has static insurers/copays/tiers and its save function only displays a toast. The availability screen also submits t`
- `10: | **P0** | Credentials and document upload are simulated | Certificate screen starts with named verified/pending credentials and uses a timed progress loop to create a fabricated pending document, without file selection, storage, KYC review`
- `12: | **P1** | Location, coverage radius, and transport-fee save is purely local | Location screen provides a decorative map and accepts radius/fee but `handleSave` only shows success. | Use an approved geolocation/coverage pricing contract wit`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | Availability, exceptions, vacation, and insurance begin as invented provider data | Doctor availability declares fixed weekly hours, dated exceptions, insurers, tiers, copays, and service coverage in component state, without load`
- `8: | **P0** | Vacation mode cannot be persisted despite claiming it blocks new bookings | Toggle changes local UI and displays success, but the only save button is disabled when vacation mode is enabled. No server command is sent at toggle tim`
- `9: | **P0** | Insurance configuration is hard-coded and can report local success without persistence | `InsuranceConfigScreen` has static insurers/copays/tiers and its save function only displays a toast. The availability screen also submits t`
- `10: | **P0** | Credentials and document upload are simulated | Certificate screen starts with named verified/pending credentials and uses a timed progress loop to create a fabricated pending document, without file selection, storage, KYC review`
- `11: | **P1** | Provider profile image and clinic-image controls are incomplete | Image uploader sets `avatarUrl` locally, but profile PATCH omits it; clinic image add button has no handler and static image placeholders are rendered. | Persist o`
- `12: | **P1** | Location, coverage radius, and transport-fee save is purely local | Location screen provides a decorative map and accepts radius/fee but `handleSave` only shows success. | Use an approved geolocation/coverage pricing contract wit`
- `13: | **P1** | Multiple controls are Arabic/English-only and include emoji/text placeholders | Configuration labels, dates, status, icons and health/insurance content lack six-language locale coverage and premium accessible controls. | Complete`
- `17: Doctor provider configuration is **P0 FIX/BLOCKED**. It cannot govern patient booking, insurance, credential verification, location coverage, or provider identity while its core data and success states are locally fabricated or unpersisted.`
### payment_insurance_relevance
- `1: # Phase 3 Provider — doctor availability, insurance, credentials, profile and location gaps`
- `7: | **P0** | Availability, exceptions, vacation, and insurance begin as invented provider data | Doctor availability declares fixed weekly hours, dated exceptions, insurers, tiers, copays, and service coverage in component state, without load`
- `9: | **P0** | Insurance configuration is hard-coded and can report local success without persistence | `InsuranceConfigScreen` has static insurers/copays/tiers and its save function only displays a toast. The availability screen also submits t`
- `12: | **P1** | Location, coverage radius, and transport-fee save is purely local | Location screen provides a decorative map and accepts radius/fee but `handleSave` only shows success. | Use an approved geolocation/coverage pricing contract wit`
- `13: | **P1** | Multiple controls are Arabic/English-only and include emoji/text placeholders | Configuration labels, dates, status, icons and health/insurance content lack six-language locale coverage and premium accessible controls. | Complete`
- `17: Doctor provider configuration is **P0 FIX/BLOCKED**. It cannot govern patient booking, insurance, credential verification, location coverage, or provider identity while its core data and success states are locally fabricated or unpersisted.`
### error_empty_loading_retry_cancel
- `7: | **P0** | Availability, exceptions, vacation, and insurance begin as invented provider data | Doctor availability declares fixed weekly hours, dated exceptions, insurers, tiers, copays, and service coverage in component state, without load`
- `8: | **P0** | Vacation mode cannot be persisted despite claiming it blocks new bookings | Toggle changes local UI and displays success, but the only save button is disabled when vacation mode is enabled. No server command is sent at toggle tim`
- `10: | **P0** | Credentials and document upload are simulated | Certificate screen starts with named verified/pending credentials and uses a timed progress loop to create a fabricated pending document, without file selection, storage, KYC review`
- `11: | **P1** | Provider profile image and clinic-image controls are incomplete | Image uploader sets `avatarUrl` locally, but profile PATCH omits it; clinic image add button has no handler and static image placeholders are rendered. | Persist o`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
