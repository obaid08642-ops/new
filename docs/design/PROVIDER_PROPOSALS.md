# Provider app proposals (read-only audit), 2026-10-08

Proposals only: nothing is merged, built or removed until the reviewer and owner approve. Source: `docs/journeys/provider.md` and `docs/design/needs-review/provider-journeys.json`. Merge rule (owner): two screens merge only when they show the same record through the same endpoint; a payload is never changed. Screens that call different endpoints for the same thing are listed under "Not merged" with the backend fix that would have to come first.

## Duplicate screens (merge proposals)

Endpoints come from `docs/design/inventory/provider-screens.json` (the `calls` of each route); files are under `provider-app/src/screens/`.

| # | Screens today | Shared endpoint(s) | Proposal | Reason |
|---|---|---|---|---|
| M1 | `doctor/doctor/CertificatesConfigScreen.tsx:37` and `shared/shared/CertificatesConfigScreen.tsx` | `GET /provider/kyc/documents`, `POST /provider/kyc/documents` | One shared screen; the doctor navigator registers it (`certificates_config`). Move `PreVisitChatScreen` (`:115`) and `InboundMedicalReportsScreen` out of the doctor file first. | Same document list, same two calls. The doctor file also hides the booking chat screen. |
| M2 | `pharmacy/PharmacyDashboard.tsx:798` `PharmacyWalletScreen` (one-line wrapper) and `shared/shared/ProviderWalletScreen.tsx:30` | `GET /provider/me`, `/provider/wallet`, `/provider/wallet/transactions` | Delete the wrapper; register `ProviderWalletScreen` directly. | Wrapper adds nothing. |
| M3 | `doctor/doctor/DoctorWalletTab.tsx:46` and `ProviderWalletScreen` | `GET /provider/wallet`, `/provider/wallet/transactions` | One wallet component (tab and stack route use it). | Same balance and list; the tab only lacks `/provider/me` (name). Fixes the wrong "Dues" figure in one place. |
| M4 | `shared/blueprint/RevenueInsights.tsx` and `facility/facility/FacilityFinancialScreen.tsx` | `GET /provider/ops/wallet/ledger` | One revenue screen with a role-specific header. | Same ledger, same call. |
| M5 | `pharmacy` routes `qr_menu` and `pharmacy_info` | none (both render `PharmacyQRMenuScreen`, `PharmacyDashboard.tsx:150`, `:168`) | One route. The screen itself is a placeholder (existing audit line). | Two routes, one component. |
| M6 | Pharmacy `DispatchWorkflowScreen` (`PharmacyDashboard.tsx:869`), `OrderHistoryScreen` (`:1429`), `DeliveryTrackingScreen` (`shared/RealScreensExtended.tsx:90`) and the list half of `PharmacyInsuranceQueueScreen` (`pharmacy/PharmacyInsuranceDecision.tsx:25`) | `GET /provider/pharmacy/allocations` (+ `?status=`) and `/allocations/:id` | One "Orders" screen with sections New, Preparing, On the way, Done (status filter). Insurance decision stays an action on the order (its own `POST .../insurance-decision`). | Four screens list the same allocations by status. History is empty today because of the wrong status filter (journeys json, scenario 1). |
| M7 | `radiology/RadiologyDashboard.tsx` `RadiologyHome` and `RadiologyOrdersTab` | `GET /radiology/provider/inbox` | One inbox list; home shows its first rows. | Same call and records. |
| M8 | `doctor/doctor/DoctorProfileEditScreen.tsx` and `NursingProfileEditScreen` (`nursing/NursingDashboard.tsx:1448`) | `GET/PATCH /provider/profile`, `GET /provider/profile/image/status`, `POST /provider/profile/image/upload` | One profile editor with role fields; `DoctorLocationScreen` and `shared/blueprint/ProfileWebConfig.tsx` become sections of it (same `GET/PATCH /provider/profile`). | Identical endpoint sets. The ambulance profile goes away with decision 14. |
| M9 | The six registration wizards: `DoctorRegistration`, `FacilityRegistration`, `LabRegistration`, `NursingRegistration`, `PharmacyRegistration`, `RadiologyRegistration` (about 1,100 lines each) | `/provider-onboarding/start|step2|step3|submit`, `/storage/upload`, `/legal/*`, `/locations/*`, `/insurance/companies` | One wizard shell (account, location, licences, contract, OTP, submit); each type supplies only its own step fields. Payload per type unchanged. Fixes the licence double-upload once. | Same sequence and endpoints in all six; the same bug (mime, no file validation) is copied six times. Large change: do it after the sign-up fixes. |
| M10 | Pharmacy `insurance_requests` (`shared/InsuranceRequestsScreen.tsx:27`) and `insurance_decisions` | not the same: `/insurance/requests/provider/queue` + `POST /insurance/requests/:id/decide` vs allocations + `POST /provider/pharmacy/orders/:id/insurance-decision` | Do not merge now. | Two different records and endpoints for pharmacy insurance (relay request vs order-level decision). Ask the backend owner which is canonical before touching either screen. |

### Not merged (same purpose, different endpoint or payload)

| Screens | Why not |
|---|---|
| Nursing `NursingFieldOps` (`/nursing/visits/:id/...`) vs `DigitalCheckin` and `VisitReport` (`/home-care/bookings/:id/...`) | Same booking, two endpoint families with different state rules (journeys json, scenario 3). Backend must pick one first; then one screen. |
| `ChatSystem` (`/chats/threads`), doctor `PreVisitChatScreen` (`/provider/chat/...`), `NursingChatScreen` (`/chats/threads/booking`), `PharmacyChatScreen` (`/pharmacy/chat/threads`), `FacilityInternalChatScreen` (`/chat/threads`) | Four endpoint families. The first three read the same booking thread of the chat service; the pharmacy and facility ones are separate stores. Needs a backend decision, not a UI merge. |
| `FacilitySettingsScreen`, `NursingPricingSettings`, `NursingServicesSettings` | All `POST /provider/settings/delta`, but each sends different keys; merging would change payloads. |
| `ShortageReportScreen` and `TechnicalSupportTicketsScreen` | Both post `/support/tickets`, but the shortage report should call `POST /provider/pharmacy/shortage-flags` (journeys json, scenario 1). Fix the call, do not merge. |
| `InsuranceConfigScreen`, `InsuranceRequestsScreen` | Different records (matrix vs queue). |

## Missing screens/steps

Pharmacy has 11 screens in the inventory and 40 registered names; of these the UI links to the radar, the offer composer, the order chat, the insurance queue and the three non-home tabs. The ambulance role goes (decision 14, O-2), so it is listed only under removal.

### Pharmacy (priority service)

| # | Missing | Why (journey step) | Endpoint that already exists | Note |
|---|---|---|---|---|
| P1 | Navigation to the 30+ registered screens (a "More" menu or the Settings tab): inventory, wallet, withdrawal, order history, reviews, working hours, notifications, support, insurance config, certificates | Scenario 1 step 4 (no stock, no way to add it), scenario 5 (no wallet) | already registered in `PharmacyDashboardNavigator` (`PharmacyDashboard.tsx:141-175`) | Pure navigation, no new endpoint. |
| P2 | Inventory and catalogue management as a first-class screen: search the master catalogue (`GET /medicines`), set price/stock, barcode scan | The offer composer maps lines only to the pharmacy's own inventory | `GET/POST /provider/capabilities/pharmacy`, `GET /medicines`, `GET /provider/inventory/search`, `POST /provider/inventory/:id/restock`, `GET /provider/inventory/low-stock-alerts` | `ActiveInventoryScreen` and `SmartBarcodeScannerScreen` exist but are unreachable; low-stock alerts have no client. |
| P3 | "My offers" list: draft, sent, chosen, not chosen, expired, with the quote expiry | Scenario 1 step 6 | needs a list route: offers are readable per order only; ask backend for `GET /provider/pharmacy/offers` (not found in the controllers) | [backend] gap. |
| P4 | Re-search box inside the offer composer (name, barcode) | Scenario 1 step 4 | `GET /provider/inventory/search?q=&barcode=` | Client only. |
| P5 | New-order notification for a selected offer and a badge on the Dispatch tab | Scenario 1 step 7 | `notifyPharmacyNewAllocation` (exists, never called) | [backend] gap. |
| P6 | Prescription review for lines typed by a doctor (manual lines are `PENDING_REVIEW`): queue, verify, substitute | Scenario 2 step 7 to pharmacy | `GET /prescriptions/manual-review/queue`, `POST /prescriptions/:id/verify`, `/substitute`, `GET /prescriptions/pharmacy/queue` | No client call exists; `PrescriptionProcessing` is a "disabled" notice. Decide with decision 18 whether the broadcast flow replaces this. [owner] |
| P7 | Returns (RMA) detail and decision | `ReturnsRMAScreen` only lists | `GET /pharmacy/returns/provider/list` (lead: a patient session got 200) | Check the role guard first. |
| P8 | Shortage report to the proper endpoint | Scenario 1 | `POST /provider/pharmacy/shortage-flags`, `GET /provider/pharmacy/shortage-flags` | Client rewiring only. |
| P9 | First-login checklist (hours, delivery area and fee, stock, bank, online) | Scenario 4 step 7 | `GET /provider-onboarding/progress`, `/provider/profile`, `/provider/working-hours` | Reuse the existing progress endpoint. |

### Other roles

| # | Missing | Why | Endpoint that exists |
|---|---|---|---|
| D1 | Follow-up: doctor books/proposes a follow-up, closes the thread early, extends it once; follow-up chat entry that survives completion | Decision 24; scenario 2 step 10 | none for close/extend (no route in `chat.service.ts`); booking via `POST /care/appointments` is patient-side. [backend] + [owner] |
| D2 | Prescription actions after "Finish" (or Finish that does not hide the tools); prescribe only in IN_PROGRESS | Scenario 2 step 7 | `POST /prescriptions/create` (needs IN_PROGRESS) |
| N1 | Nursing result/attachment upload at the end of a visit | Scenario 3 step 6 | `POST /storage/upload` + a field on `visit-report` (payload change, backend) |
| N2 | Single home-visit flow (transit, arrive, care, sign, complete) used by every entry point | Scenario 3 | `/nursing/visits/:id/*` is the complete one |
| A1 | Rejected / needs-changes / suspended screens with the reason and a resubmit path | Scenario 4 step 4 | `GET /provider-onboarding/progress`; status flows `rejected` and `needs_changes` to `pending_admin_approval` exist in `provider.enums.ts` |
| A2 | Status refresh on the Pending screen and a "sign in again" hint after approval | Scenario 4 step 5 | `GET /provider-onboarding/my-profile` |
| E1 | `withdrawal_workflow` registered in lab, nursing, radiology and facility navigators | Scenario 5 (existing audit line) | `GET /provider/payouts/balance`, `POST /provider/payouts/request` |
| E2 | One balance source: the wallet card should show `GET /provider/payouts/balance` (available, pending, locked) | Scenario 5 step 1 | exists; replaces `/provider/wallet` summary (backend `provider-ops.module.ts:718`) |
| E3 | Payout status mapped from `state` (pending admin approval, second approval, approved, completed, rejected with `rejection_reason`) | Scenario 5 step 5 | `GET /provider/payouts/mine` |

### Removal (decision 14, O-2)

Ambulance provider type: `AmbulanceRegistration` (offered at sign-up, `App.tsx:147`), `AmbulanceDashboardNavigator` (`App.tsx:124`), `ambulance/*` (7 screens, 13 endpoint pairs, the 7 owner lines in `needs-review/provider-ambulance.json`), the `Welcome` type picker entry, and the backend `emergency`, `ambulance-fleet` and `drivers` modules per the decision. Also remove `sos_dispatch` (`SosDispatchScreen`: `POST /emergency/trigger`, `GET /emergency/active`, `POST /emergency/:id/claim`) and `gps_router` (`POST /emergency/:id/track`) from the doctor, nursing and other navigators: both call the emergency dispatch API that decision 14 removes, and the doctor/nursing home alarm bell opens them.

## Build status, slice 1 (pharmacy first), branch `wip-prov-build1`

Done: P1 (More tab with 40 rows grouped Stock / Orders and insurance / Finance / Pharmacy / Growth, every row a registered route), P2 (inventory reachable, scanner button, low-stock alerts with acknowledge and restock), P4 (per-line name/barcode re-search in the composer), P8 (shortage report posts `POST /provider/pharmacy/shortage-flags`, lists own reports), P9 (setup checklist on the radar and in More), M2, M5, M6 (Orders: New / Preparing / On the way / Done; `order_history` opens the Done section; `delivery_track` unregistered), E1, E2, E3.
Not done (stay as Needs-review): P3 (backend list route), P5 (backend notification), P6 and P7 (owner / role guard), M1, M3, M4, M7 to M10, D*, N*, A*, removal of the ambulance role.
