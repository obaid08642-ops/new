# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_CONSULTATION_INSURANCE_FINANCIAL_GAP_20260819.md`
- **Member SHA-256:** `c8120645751722140f2680233232a2deceef8bd5274d9e6e860d518df1176b05`
- **Line count:** 26
- **Read range:** `1-26`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Phase 2 Patient — consultation booking insurance and financial-truthfulness gap`
- `5: The Patient confirmation screen creates a real appointment through `POST /care/appointments`. Card payments create a payment intent afterward. Backend appointment creation calculates its own service, platform, home-visit, and transportation`
- `13: | Insurance booking state | Patient may send `payment_method: insurance`; Backend auto-confirms non-card appointments | **P0 FIX — create/attach a server-side insurance request, keep appointment pending until a verified insurance decision, `
- `17: | Visit mode | Confirmation allows all three visit modes again, independent of the selected slot/provider capability | **FIX — lock to the validated selected mode or re-query slot/provider availability before submit** |`
- `22: Card flow is correctly routed to a payment intent and passes transaction metadata to the processing screen. Slot creation is server-owned and duplicate slots are protected by the Backend unique constraint. These controls do not make the ins`
### backend_consumers_or_contracts
- `5: The Patient confirmation screen creates a real appointment through `POST /care/appointments`. Card payments create a payment intent afterward. Backend appointment creation calculates its own service, platform, home-visit, and transportation`
- `18: | Insurance UI claim | UI says coverage is checked via NPHIES even when contract/auth/profile conditions are incomplete | **FIX — show only verified coverage status and a fail-closed pending/error state** |`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: The Patient confirmation screen creates a real appointment through `POST /care/appointments`. Card payments create a payment intent afterward. Backend appointment creation calculates its own service, platform, home-visit, and transportation`
- `9: ## Confirmed gaps`
- `13: | Insurance booking state | Patient may send `payment_method: insurance`; Backend auto-confirms non-card appointments | **P0 FIX — create/attach a server-side insurance request, keep appointment pending until a verified insurance decision, `
- `15: | Coverage transport | Patient bypasses `apiFetch` and reconstructs a base URL with a brittle string replacement/fallback | **P1 FIX — use the central authenticated API client and the configured production base URL; propagate structured cov`
- `18: | Insurance UI claim | UI says coverage is checked via NPHIES even when contract/auth/profile conditions are incomplete | **FIX — show only verified coverage status and a fail-closed pending/error state** |`
### payment_insurance_relevance
- `1: # Phase 2 Patient — consultation booking insurance and financial-truthfulness gap`
- `5: The Patient confirmation screen creates a real appointment through `POST /care/appointments`. Card payments create a payment intent afterward. Backend appointment creation calculates its own service, platform, home-visit, and transportation`
- `7: The same Backend code automatically confirms every non-card appointment, including `payment_method: insurance`, immediately after it stores the client-provided insurance provider/member fields. No verified insurance decision, approval reque`
- `13: | Insurance booking state | Patient may send `payment_method: insurance`; Backend auto-confirms non-card appointments | **P0 FIX — create/attach a server-side insurance request, keep appointment pending until a verified insurance decision, `
- `14: | Insurance identity | A logged-in patient without a saved policy can select company/category, but the client sends no policy/member identifier; category is not sent at all | **P0 FIX — require an owned validated policy or a governed manual`
- `15: | Coverage transport | Patient bypasses `apiFetch` and reconstructs a base URL with a brittle string replacement/fallback | **P1 FIX — use the central authenticated API client and the configured production base URL; propagate structured cov`
- `16: | Financial display | Patient locally computes 15% VAT and a zero home fee, while Backend recomputes price plus service/home/transport fees | **P1 FIX — request/display a server quote or returned appointment financial breakdown before payme`
- `18: | Insurance UI claim | UI says coverage is checked via NPHIES even when contract/auth/profile conditions are incomplete | **FIX — show only verified coverage status and a fail-closed pending/error state** |`
- `22: Card flow is correctly routed to a payment intent and passes transaction metadata to the processing screen. Slot creation is server-owned and duplicate slots are protected by the Backend unique constraint. These controls do not make the ins`
- `26: Consultation insurance must be **FIX/BLOCKED** until insurance identity, approval, price/coplay authority, and payment handoff are server-bound and tested through sandbox cases for online, clinic, and home visits.`
### error_empty_loading_retry_cancel
- `5: The Patient confirmation screen creates a real appointment through `POST /care/appointments`. Card payments create a payment intent afterward. Backend appointment creation calculates its own service, platform, home-visit, and transportation`
- `13: | Insurance booking state | Patient may send `payment_method: insurance`; Backend auto-confirms non-card appointments | **P0 FIX — create/attach a server-side insurance request, keep appointment pending until a verified insurance decision, `
- `15: | Coverage transport | Patient bypasses `apiFetch` and reconstructs a base URL with a brittle string replacement/fallback | **P1 FIX — use the central authenticated API client and the configured production base URL; propagate structured cov`
- `18: | Insurance UI claim | UI says coverage is checked via NPHIES even when contract/auth/profile conditions are incomplete | **FIX — show only verified coverage status and a fail-closed pending/error state** |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
