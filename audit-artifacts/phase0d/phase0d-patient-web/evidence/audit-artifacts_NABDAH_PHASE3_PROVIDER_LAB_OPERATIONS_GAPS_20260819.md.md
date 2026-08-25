# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_LAB_OPERATIONS_GAPS_20260819.md`
- **Member SHA-256:** `57c9f1eba7b4328b75b88bfa56f0afe7a7b1ea9e2fa7ddc2d2f99f14273682cd`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The laboratory Controller exposes an authenticated provider inbox plus server methods for valid booking transitions, technician assignment, insurance decision, sample registration/stages, report upload, rescheduling, and tracking. Provider `
- `11: | **P0** | Provider insurance flow records an unverified decision as a generic note/state change | UI asks a provider to enter an NPHIES code and copay, then PATCHes generic booking state with `note: nphies_code..., copay...`; it does not c`
- `12: | **P1** | Booking rejection is represented as sample rejection | “Decline” sends `SAMPLE_REJECTED`, conflating a provider refusing an incoming booking with a lab-quality sample rejection. | Define distinct authorized transitions/reasons fo`
- `15: | **P1** | Radiology quick action points to no registered navigator route | Lab home navigates to `rad_home`, but the Lab navigator does not define that screen. | Remove the action or route to an implemented role-appropriate feature with ex`
### backend_consumers_or_contracts
- `11: | **P0** | Provider insurance flow records an unverified decision as a generic note/state change | UI asks a provider to enter an NPHIES code and copay, then PATCHes generic booking state with `note: nphies_code..., copay...`; it does not c`
### auth_ownership
- `15: | **P1** | Radiology quick action points to no registered navigator route | Lab home navigates to `rad_home`, but the Lab navigator does not define that screen. | Remove the action or route to an implemented role-appropriate feature with ex`
### state_transitions
- `3: ## Confirmed Backend controls`
- `7: ## Confirmed defects`
- `11: | **P0** | Provider insurance flow records an unverified decision as a generic note/state change | UI asks a provider to enter an NPHIES code and copay, then PATCHes generic booking state with `note: nphies_code..., copay...`; it does not c`
- `12: | **P1** | Booking rejection is represented as sample rejection | “Decline” sends `SAMPLE_REJECTED`, conflating a provider refusing an incoming booking with a lab-quality sample rejection. | Define distinct authorized transitions/reasons fo`
- `13: | **P1** | Dashboard manufactures operational patient, test, total and time values | Missing inbox fields become “Nabdah Patient,” `cbc`, cash, `150`, and “soon.” A failed data load becomes zero metrics and an empty dashboard. | Render only`
- `14: | **P1** | Provider result/status fields are inconsistently mapped | Order tab filters `order.status`; home tab maps `x.state`, and local views translate selected state strings only. This can hide valid orders or misstate stages as DTOs evo`
- `20: Laboratory provider operations are **FIX/BLOCKED**. Explicit Backend operations exist, but insurance and intake UX currently bypasses their intended semantics and can conceal data failure or misrepresent clinical/financial state.`
### payment_insurance_relevance
- `1: # Phase 3 Provider — laboratory order, sample and insurance operation gaps`
- `5: The laboratory Controller exposes an authenticated provider inbox plus server methods for valid booking transitions, technician assignment, insurance decision, sample registration/stages, report upload, rescheduling, and tracking. Provider `
- `11: | **P0** | Provider insurance flow records an unverified decision as a generic note/state change | UI asks a provider to enter an NPHIES code and copay, then PATCHes generic booking state with `note: nphies_code..., copay...`; it does not c`
- `13: | **P1** | Dashboard manufactures operational patient, test, total and time values | Missing inbox fields become “Nabdah Patient,” `cbc`, cash, `150`, and “soon.” A failed data load becomes zero metrics and an empty dashboard. | Render only`
- `16: | **P1** | UI remains limited to Arabic/English and uses non-semantic placeholder glyphs | Sample pipeline/stats use text symbols and non-localized clinical/payment display. | Adopt six-language, accessible vector icon, locale datetime/curr`
- `20: Laboratory provider operations are **FIX/BLOCKED**. Explicit Backend operations exist, but insurance and intake UX currently bypasses their intended semantics and can conceal data failure or misrepresent clinical/financial state.`
### error_empty_loading_retry_cancel
- `12: | **P1** | Booking rejection is represented as sample rejection | “Decline” sends `SAMPLE_REJECTED`, conflating a provider refusing an incoming booking with a lab-quality sample rejection. | Define distinct authorized transitions/reasons fo`
- `13: | **P1** | Dashboard manufactures operational patient, test, total and time values | Missing inbox fields become “Nabdah Patient,” `cbc`, cash, `150`, and “soon.” A failed data load becomes zero metrics and an empty dashboard. | Render only`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
