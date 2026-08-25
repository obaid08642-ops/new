# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/FULL_SYSTEMATIC_QA_EXECUTION_REGISTER_20260818.md`
- **Member SHA-256:** `7f379b1831046061c957d862f3fd8f41c19d87d8fd8ab7ad577cb5473f966ae5`
- **Line count:** 94
- **Read range:** `1-94`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Nabdah Full Systematic QA & Workflow Validation Register`
- `12: | INCONCLUSIVE | timeout أو نقص دليل أو route غير محسوم | يبقى مفتوحاً ولا يتحول إلى PASS |`
- `20: | Patient readonly baseline | `PATIENT_READONLY_LIVE_MATRIX_20260818.json` | login and several catalog/order/wallet reads passed; guessed profile/family/appointments/hospitals paths returned 404 and require exact contract mapping |`
- `21: | Patient exact-read retry | `PATIENT_EXACT_READ_PROBE_20260818.md` | INCONCLUSIVE transport timeout; no functional conclusion |`
- `22: | Provider route map | `PROVIDER_OPERATIONAL_ROUTE_CATALOG_20260818.md`, `PROVIDER_INTAKE_BACKEND_ROUTE_MAP_20260818.txt` | source contracts mapped; live provider reads limited by 404 classification and 429 windows |`
- `23: | Provider readonly probe | `PROVIDER_READONLY_LIVE_MATRIX_20260818.json`, `PROVIDER_READONLY_FINDINGS_20260818.md` | no mutations performed; 404/429 require controlled retry and body classification |`
- `24: | Patient consumer/backend map | `PATIENT_CONSUMER_BACKEND_ROUTE_MAP_20260818.txt` | 1450-line reconciliation artifact created |`
- `25: | Provider screen inventory | `PROVIDER_SCREEN_CONTROLLER_INVENTORY_20260818.md` | 42 screen files and 5 API/context files inventoried |`
- `31: | Online consultation | directory → slot → booking | doctor inbox → accept/reject | chat/video → start/end/no-show | SOAP, prescription, lab/radiology referrals | payment gateway, ledger, notifications, patient2 BOLA | route map complete; l`
- `33: | Home consultation | doctor service → address/time → booking | doctor queue → accept/reassign | arrival/start/end | report/prescription | GPS policy remains fail-closed; ownership | live lifecycle open |`
- `34: | Pharmacy delivery | medicine/search → cart → checkout/order | broadcast/queue → accept → basket | preparing → ready → dispatch → delivered | reorder/refill and inventory before/after | payment blocked by Moyasar activation; BOLA/ledger | `
- `36: | Laboratory branch/home | service/package → slot/address → booking | lab inbox → accept/reassign | collected → analyzing → result | report/upload/access | insurance/cash/opt-in and BOLA | contract mapped; live lifecycle open |`
### backend_consumers_or_contracts
- `20: | Patient readonly baseline | `PATIENT_READONLY_LIVE_MATRIX_20260818.json` | login and several catalog/order/wallet reads passed; guessed profile/family/appointments/hospitals paths returned 404 and require exact contract mapping |`
- `25: | Provider screen inventory | `PROVIDER_SCREEN_CONTROLLER_INVENTORY_20260818.md` | 42 screen files and 5 API/context files inventoried |`
- `31: | Online consultation | directory → slot → booking | doctor inbox → accept/reject | chat/video → start/end/no-show | SOAP, prescription, lab/radiology referrals | payment gateway, ledger, notifications, patient2 BOLA | route map complete; l`
- `44: For each provider type—doctor, pharmacy, laboratory, radiology, nursing, hospital, and ambulance—the controlled order is: login once; read `/provider/auth/me`, `/provider/profile`, `/provider/me`, `/provider/dashboard/stats`, `/provider/das`
- `62: Doctor, laboratory, radiology, pharmacy, nursing, and hospital sandbox provider logins each returned HTTP 201 in the controlled origin-direct wave. Progress, notifications, wallet balance, and wallet transactions returned HTTP 200 for each `
- `68: A real order ID was selected from Patient-1 `/orders/mine`; no ID was fabricated. Patient-1 owner read before and after the foreign attempt returned HTTP 200 with identical body size. Patient-2 received HTTP 403 for the foreign order read a`
- `90: LabDashboard consumes approximately 30 `/labs/bookings/*` actions. The source snapshot contains overlapping `LabsController` routes delegated through `LabsService` and a legacy `LabsEngineController` mounted under the same prefix with no vi`
### auth_ownership
- `5: هذا السجل هو المرجع التنفيذي لجولة التدقيق الحالية. يغطي Patient App وProvider App وAdmin Dashboard وBackend/Database، ويعامل كل شاشة وزر ومسار كعقد يجب تتبعه من consumer إلى controller/service/schema ثم إلى حالة الواجهة. لا يُعلن اكتمال أي`
- `19: | Backend security remediation | production commit history and live Gatekeeper evidence | BOLA/role fixes largely confirmed; later regression must remain open until rechecked |`
- `20: | Patient readonly baseline | `PATIENT_READONLY_LIVE_MATRIX_20260818.json` | login and several catalog/order/wallet reads passed; guessed profile/family/appointments/hospitals paths returned 404 and require exact contract mapping |`
- `29: | Domain | Patient initiation | Provider intake | Execution | Completion/reporting | Financial/notification/ownership checks | Current gate |`
- `32: | Clinic consultation | facility/doctor → slot → confirmation | doctor/facility appointment inbox | check-in → consultation → end | medical report and follow-up | location/attendance/ownership | live lifecycle open |`
- `33: | Home consultation | doctor service → address/time → booking | doctor queue → accept/reassign | arrival/start/end | report/prescription | GPS policy remains fail-closed; ownership | live lifecycle open |`
- `38: | Nursing/home care | package → address/time → request | nurse queue → accept/reject | start/location/visit/end | completion/evaluation | GPS/push and ownership | live lifecycle open |`
- `39: | Hospital/facility | hospital/branch/service → booking | hospital staff permissions and inbox | appointment status | discharge/report | hospital-admin vs provider isolation | source contract mapped; live read/mutation open |`
- `44: For each provider type—doctor, pharmacy, laboratory, radiology, nursing, hospital, and ambulance—the controlled order is: login once; read `/provider/auth/me`, `/provider/profile`, `/provider/me`, `/provider/dashboard/stats`, `/provider/das`
- `50: | Moyasar live payment | gateway returns `Entity not activated to use live account`; application correctly returns `502 payment_gateway_unavailable` | owner activates commercial account, then sandbox payment/webhook/idempotency/refund test `
- `51: | Consent/QR/location/error-code contracts | owner legal/product approval is pending; contracts remain fail-closed | independent approval record plus technical Gatekeeper review |`
- `54: | Device-level push/call/GPS | requires real phones and production permissions | owner checklist with screenshots/video/logs |`
### state_transitions
- `7: | Status | Meaning | Release interpretation |`
- `19: | Backend security remediation | production commit history and live Gatekeeper evidence | BOLA/role fixes largely confirmed; later regression must remain open until rechecked |`
- `21: | Patient exact-read retry | `PATIENT_EXACT_READ_PROBE_20260818.md` | INCONCLUSIVE transport timeout; no functional conclusion |`
- `23: | Provider readonly probe | `PROVIDER_READONLY_LIVE_MATRIX_20260818.json`, `PROVIDER_READONLY_FINDINGS_20260818.md` | no mutations performed; 404/429 require controlled retry and body classification |`
- `31: | Online consultation | directory → slot → booking | doctor inbox → accept/reject | chat/video → start/end/no-show | SOAP, prescription, lab/radiology referrals | payment gateway, ledger, notifications, patient2 BOLA | route map complete; l`
- `34: | Pharmacy delivery | medicine/search → cart → checkout/order | broadcast/queue → accept → basket | preparing → ready → dispatch → delivered | reorder/refill and inventory before/after | payment blocked by Moyasar activation; BOLA/ledger | `
- `35: | Pharmacy pickup | branch/product → pickup order | pharmacy intake and readiness | ready → pickup confirmation | completed/reorder | inventory and notification | contract/lifecycle open |`
- `39: | Hospital/facility | hospital/branch/service → booking | hospital staff permissions and inbox | appointment status | discharge/report | hospital-admin vs provider isolation | source contract mapped; live read/mutation open |`
- `44: For each provider type—doctor, pharmacy, laboratory, radiology, nursing, hospital, and ambulance—the controlled order is: login once; read `/provider/auth/me`, `/provider/profile`, `/provider/me`, `/provider/dashboard/stats`, `/provider/das`
- `50: | Moyasar live payment | gateway returns `Entity not activated to use live account`; application correctly returns `502 payment_gateway_unavailable` | owner activates commercial account, then sandbox payment/webhook/idempotency/refund test `
- `51: | Consent/QR/location/error-code contracts | owner legal/product approval is pending; contracts remain fail-closed | independent approval record plus technical Gatekeeper review |`
- `52: | Provider 404/429 | 404 bodies were not retained by the initial matrix and 429 windows were active | one-account-at-a-time retry after window with body classification |`
### payment_insurance_relevance
- `20: | Patient readonly baseline | `PATIENT_READONLY_LIVE_MATRIX_20260818.json` | login and several catalog/order/wallet reads passed; guessed profile/family/appointments/hospitals paths returned 404 and require exact contract mapping |`
- `27: ## Lifecycle coverage matrix`
- `31: | Online consultation | directory → slot → booking | doctor inbox → accept/reject | chat/video → start/end/no-show | SOAP, prescription, lab/radiology referrals | payment gateway, ledger, notifications, patient2 BOLA | route map complete; l`
- `34: | Pharmacy delivery | medicine/search → cart → checkout/order | broadcast/queue → accept → basket | preparing → ready → dispatch → delivered | reorder/refill and inventory before/after | payment blocked by Moyasar activation; BOLA/ledger | `
- `36: | Laboratory branch/home | service/package → slot/address → booking | lab inbox → accept/reassign | collected → analyzing → result | report/upload/access | insurance/cash/opt-in and BOLA | contract mapped; live lifecycle open |`
- `37: | Radiology branch/home | service → slot/address → booking | radiology inbox → accept/reassign | performed → report/images | patient access | insurance/cash and BOLA | contract mapped; live lifecycle open |`
- `40: | Shared identity | profile/family/settings | onboarding/KYC/bank/schedule | notifications/chat/reconnect | wallet/payout/history | cross-account reads and mutation BOLA | partial evidence; exact consumers open |`
- `50: | Moyasar live payment | gateway returns `Entity not activated to use live account`; application correctly returns `502 payment_gateway_unavailable` | owner activates commercial account, then sandbox payment/webhook/idempotency/refund test `
- `62: Doctor, laboratory, radiology, pharmacy, nursing, and hospital sandbox provider logins each returned HTTP 201 in the controlled origin-direct wave. Progress, notifications, wallet balance, and wallet transactions returned HTTP 200 for each `
- `64: No provider queue, accept, reject, toggle, staff, visit, report, payment, or wallet mutation was executed in this wave. Empty read lists are not treated as lifecycle success; a real eligible sandbox request is required before mutation testi`
### error_empty_loading_retry_cancel
- `12: | INCONCLUSIVE | timeout أو نقص دليل أو route غير محسوم | يبقى مفتوحاً ولا يتحول إلى PASS |`
- `21: | Patient exact-read retry | `PATIENT_EXACT_READ_PROBE_20260818.md` | INCONCLUSIVE transport timeout; no functional conclusion |`
- `23: | Provider readonly probe | `PROVIDER_READONLY_LIVE_MATRIX_20260818.json`, `PROVIDER_READONLY_FINDINGS_20260818.md` | no mutations performed; 404/429 require controlled retry and body classification |`
- `44: For each provider type—doctor, pharmacy, laboratory, radiology, nursing, hospital, and ambulance—the controlled order is: login once; read `/provider/auth/me`, `/provider/profile`, `/provider/me`, `/provider/dashboard/stats`, `/provider/das`
- `51: | Consent/QR/location/error-code contracts | owner legal/product approval is pending; contracts remain fail-closed | independent approval record plus technical Gatekeeper review |`
- `52: | Provider 404/429 | 404 bodies were not retained by the initial matrix and 429 windows were active | one-account-at-a-time retry after window with body classification |`
- `62: Doctor, laboratory, radiology, pharmacy, nursing, and hospital sandbox provider logins each returned HTTP 201 in the controlled origin-direct wave. Progress, notifications, wallet balance, and wallet transactions returned HTTP 200 for each `
- `64: No provider queue, accept, reject, toggle, staff, visit, report, payment, or wallet mutation was executed in this wave. Empty read lists are not treated as lifecycle success; a real eligible sandbox request is required before mutation testi`
- `68: A real order ID was selected from Patient-1 `/orders/mine`; no ID was fabricated. Patient-1 owner read before and after the foreign attempt returned HTTP 200 with identical body size. Patient-2 received HTTP 403 for the foreign order read a`
- `70: A follow-up report-object BOLA check used the same real sandbox order. Owner PDF access returned HTTP 200 with a 1524-byte valid response; Patient-2 foreign PDF access returned HTTP 403 with a 71-byte error response. The PDF bodies were rem`
- `74: A real Patient-1 pending pharmacy order was inspected read-only. It carries a pharmacy assignment ID, but the pharmacy sandbox account has no started onboarding profile and its provider broadcast list is empty. The account cannot be safely `
- `78: The real lab provider inbox was inspected without mutation. The sanitized summary shows one request already in `REPORTED` state and a wrapper entry with no request status; there is no pending/accepted request suitable for accept, collection`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
