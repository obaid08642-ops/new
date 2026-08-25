# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_NURSING_OPERATIONS_GAPS_20260819.md`
- **Member SHA-256:** `a4409579c1f09bb4bcfc39c3022c0a467a9ebe2637f0cd9c05f2513ac64466d0`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The authenticated compatibility contract exposes `GET /home-care/bookings/nursing/all` and `POST /home-care/bookings/:id/respond`. It permits a nursing provider to claim an unassigned request into `PROVIDER_ASSIGNED`, records state history,`
- `11: | **P0** | Provider app uses conflicting/non-canonical nursing queues and response routes | Dashboard uses `/provider/jobs/queue`, orders tab uses `/nursing/jobs/active`, modal uses `/nursing/visits/:id/respond`, while canonical compat rout`
- `12: | **P0** | One provider rejection cancels the patient’s broadcast request | Backend response with `accept: false` transitions an unassigned booking to `CANCELLED`; the UI labels it “reject” without warning that this prevents other nurses fr`
- `15: | **P1** | Online toggle is optimistic and calls an unverified availability route | UI changes global context before `POST /home-care/provider/availability` succeeds, ignores any error, and no matching compat endpoint governs queue eligibil`
- `16: | **P1** | Quick actions can operate without an active visit and emergency dispatch remains exposed | The dashboard passes `jobs[0]` when no active job exists, and routes alarm acceptance to SOS dispatch despite unapproved emergency contrac`
- `21: Nursing provider operations are **P0 FIX/BLOCKED**. The current route drift and cancel-on-decline behavior can prevent safe reallocation of a patient visit, while operational location and clinical data are not truthful.`
### backend_consumers_or_contracts
- `5: The authenticated compatibility contract exposes `GET /home-care/bookings/nursing/all` and `POST /home-care/bookings/:id/respond`. It permits a nursing provider to claim an unassigned request into `PROVIDER_ASSIGNED`, records state history,`
- `11: | **P0** | Provider app uses conflicting/non-canonical nursing queues and response routes | Dashboard uses `/provider/jobs/queue`, orders tab uses `/nursing/jobs/active`, modal uses `/nursing/visits/:id/respond`, while canonical compat rout`
- `15: | **P1** | Online toggle is optimistic and calls an unverified availability route | UI changes global context before `POST /home-care/provider/availability` succeeds, ignores any error, and no matching compat endpoint governs queue eligibil`
### auth_ownership
- `12: | **P0** | One provider rejection cancels the patient’s broadcast request | Backend response with `accept: false` transitions an unassigned booking to `CANCELLED`; the UI labels it “reject” without warning that this prevents other nurses fr`
### state_transitions
- `3: ## Confirmed Backend contract`
- `5: The authenticated compatibility contract exposes `GET /home-care/bookings/nursing/all` and `POST /home-care/bookings/:id/respond`. It permits a nursing provider to claim an unassigned request into `PROVIDER_ASSIGNED`, records state history,`
- `7: ## Confirmed defects`
- `11: | **P0** | Provider app uses conflicting/non-canonical nursing queues and response routes | Dashboard uses `/provider/jobs/queue`, orders tab uses `/nursing/jobs/active`, modal uses `/nursing/visits/:id/respond`, while canonical compat rout`
- `12: | **P0** | One provider rejection cancels the patient’s broadcast request | Backend response with `accept: false` transitions an unassigned booking to `CANCELLED`; the UI labels it “reject” without warning that this prevents other nurses fr`
- `14: | **P1** | Visit cards fabricate patient demographic, care and timing data | Missing age, gender, notes, service and time become `70`, male, generic home care, or local default. Failures silently show no jobs. | Remove all clinical/PHI defa`
- `15: | **P1** | Online toggle is optimistic and calls an unverified availability route | UI changes global context before `POST /home-care/provider/availability` succeeds, ignores any error, and no matching compat endpoint governs queue eligibil`
- `16: | **P1** | Quick actions can operate without an active visit and emergency dispatch remains exposed | The dashboard passes `jobs[0]` when no active job exists, and routes alarm acceptance to SOS dispatch despite unapproved emergency contrac`
- `21: Nursing provider operations are **P0 FIX/BLOCKED**. The current route drift and cancel-on-decline behavior can prevent safe reallocation of a patient visit, while operational location and clinical data are not truthful.`
### payment_insurance_relevance
- `14: | **P1** | Visit cards fabricate patient demographic, care and timing data | Missing age, gender, notes, service and time become `70`, male, generic home care, or local default. Failures silently show no jobs. | Remove all clinical/PHI defa`
- `17: | **P1** | Nursing UI is Arabic/English-only with placeholder stats/icons | Clinical operations, revenue and emergency labels lack six-language, accessible and RTL/LTR coverage. | Implement reviewed six-language content and accessible contr`
### error_empty_loading_retry_cancel
- `12: | **P0** | One provider rejection cancels the patient’s broadcast request | Backend response with `accept: false` transitions an unassigned booking to `CANCELLED`; the UI labels it “reject” without warning that this prevents other nurses fr`
- `14: | **P1** | Visit cards fabricate patient demographic, care and timing data | Missing age, gender, notes, service and time become `70`, male, generic home care, or local default. Failures silently show no jobs. | Remove all clinical/PHI defa`
- `15: | **P1** | Online toggle is optimistic and calls an unverified availability route | UI changes global context before `POST /home-care/provider/availability` succeeds, ignores any error, and no matching compat endpoint governs queue eligibil`
- `16: | **P1** | Quick actions can operate without an active visit and emergency dispatch remains exposed | The dashboard passes `jobs[0]` when no active job exists, and routes alarm acceptance to SOS dispatch despite unapproved emergency contrac`
- `21: Nursing provider operations are **P0 FIX/BLOCKED**. The current route drift and cancel-on-decline behavior can prevent safe reallocation of a patient visit, while operational location and clinical data are not truthful.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
