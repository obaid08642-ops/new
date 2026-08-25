# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AF_DOCTOR_CLINICAL_RECORD_INTEGRITY_20260819.md`
- **Member SHA-256:** `da4e515d88782493b8b41af41a755e503ff548bf9ed669aa37127398516a6bad`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | Medical report | The report route resolves the owned request first, derives patient identity/name server-side, rejects a supplied foreign patient ID, and does not honor a caller-selected appointment. |`
- `14: | Insurance decision | The decision route resolves the owned request, derives service price from its server record, bounds patient copay to that price, requires a verified patient insurance policy, and has no `unknown` policy fallback. The `
- `32: | Branch upload | **PASS** — archive commit `7ea7d4f` (`fix: enforce doctor clinical record ownership`) is pushed to `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- `11: | Prescription/lab orders | `GET /provider/requests/:id/orders` now requires `@CurrentUser()` and resolves through `ProviderRequestEngineService.detail()`, which scopes the record to the authenticated provider account. |`
- `12: | Consultation end | `POST /provider/requests/:id/end` obtains the owned request, requires the canonical in-progress state, stores SOAP/orders only against that owned request, then calls the canonical completion transition before emitting t`
### auth_ownership
- `15: | Wallet and doctor chat | Request failure produces explicit empty/error state. Fixed balances, transaction ledger rows, named chats and optimistic unacknowledged messages were removed. A sent message is displayed only after the server muta`
- `17: | Unapproved integrations | The dashboard no longer claims a Ministry-verified QR, starts a video session with a toast, or presents Google/Apple calendar synchronization as connected. These surfaces are explicit fail-closed states pending t`
- `32: | Branch upload | **PASS** — archive commit `7ea7d4f` (`fix: enforce doctor clinical record ownership`) is pushed to `manus/on-live-reconciliation`. |`
- `36: No patient, report, appointment, insurance decision, wallet record, chat, diagnostic file, calendar connection or call session was read, created or altered in production or sandbox. This source-level result does not authorize clinical repor`
### state_transitions
- `5: The doctor dashboard still mixed operational data with local fixtures and success-only UI. It could substitute wallet balances, transactions, patient chats, pre-visit content and inbound diagnostic reports after a failed request. It also co`
- `12: | Consultation end | `POST /provider/requests/:id/end` obtains the owned request, requires the canonical in-progress state, stores SOAP/orders only against that owned request, then calls the canonical completion transition before emitting t`
- `14: | Insurance decision | The decision route resolves the owned request, derives service price from its server record, bounds patient copay to that price, requires a verified patient insurance policy, and has no `unknown` policy fallback. The `
- `15: | Wallet and doctor chat | Request failure produces explicit empty/error state. Fixed balances, transaction ledger rows, named chats and optimistic unacknowledged messages were removed. A sent message is displayed only after the server muta`
- `16: | Pre-visit and inbound reports | The fabricated patient attachment and the timeout-created radiology/lab reports with external example URLs were removed. The private report list remains empty until its authorized list contract is implement`
- `17: | Unapproved integrations | The dashboard no longer claims a Ministry-verified QR, starts a video session with a toast, or presents Google/Apple calendar synchronization as connected. These surfaces are explicit fail-closed states pending t`
- `18: | Waiting room | Ping and no-show success feedback now requires an HTTP success response; rejected responses keep error feedback. |`
- `29: | Provider production web export | **PASS** — Expo web bundle completed. |`
- `36: No patient, report, appointment, insurance decision, wallet record, chat, diagnostic file, calendar connection or call session was read, created or altered in production or sandbox. This source-level result does not authorize clinical repor`
### payment_insurance_relevance
- `5: The doctor dashboard still mixed operational data with local fixtures and success-only UI. It could substitute wallet balances, transactions, patient chats, pre-visit content and inbound diagnostic reports after a failed request. It also co`
- `14: | Insurance decision | The decision route resolves the owned request, derives service price from its server record, bounds patient copay to that price, requires a verified patient insurance policy, and has no `unknown` policy fallback. The `
- `15: | Wallet and doctor chat | Request failure produces explicit empty/error state. Fixed balances, transaction ledger rows, named chats and optimistic unacknowledged messages were removed. A sent message is displayed only after the server muta`
- `24: | Focused Backend doctor-record contract | **PASS** — 5/5: owned order retrieval, non-progress end rejection, canonical owned completion, foreign-patient report rejection, and missing-policy insurance rejection. |`
- `36: No patient, report, appointment, insurance decision, wallet record, chat, diagnostic file, calendar connection or call session was read, created or altered in production or sandbox. This source-level result does not authorize clinical repor`
### error_empty_loading_retry_cancel
- `5: The doctor dashboard still mixed operational data with local fixtures and success-only UI. It could substitute wallet balances, transactions, patient chats, pre-visit content and inbound diagnostic reports after a failed request. It also co`
- `14: | Insurance decision | The decision route resolves the owned request, derives service price from its server record, bounds patient copay to that price, requires a verified patient insurance policy, and has no `unknown` policy fallback. The `
- `15: | Wallet and doctor chat | Request failure produces explicit empty/error state. Fixed balances, transaction ledger rows, named chats and optimistic unacknowledged messages were removed. A sent message is displayed only after the server muta`
- `16: | Pre-visit and inbound reports | The fabricated patient attachment and the timeout-created radiology/lab reports with external example URLs were removed. The private report list remains empty until its authorized list contract is implement`
- `17: | Unapproved integrations | The dashboard no longer claims a Ministry-verified QR, starts a video session with a toast, or presents Google/Apple calendar synchronization as connected. These surfaces are explicit fail-closed states pending t`
- `18: | Waiting room | Ping and no-show success feedback now requires an HTTP success response; rejected responses keep error feedback. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
