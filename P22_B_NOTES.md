# P22-B (CARE slice) — Phase 22 mature-platform practices

Owner: agent B. Worktree `/var/folders/f1/j1zvgjbj0m16m2rwky7f5zqr0000gn/T/opencode/p22/b`, branch `p22-b`.
Owned: `backend/src/modules/{care,labs,radiology,home-care,emergency,prescriptions,billing}` (+ `visits`/`reports`/`nursing`/`consultation` do not exist as modules — covered via `care` appointments + `medical-reports` reads) and their schemas/DTOs/specs. AI-triage touched ONLY for the 22.14 red-flag rule.

## INVENTORY — exists vs built (plan mandates inventory first)

### 22.4 Delivery promise
| Item | Exists | Verdict |
|---|---|---|
| ETA for emergency SOS | YES — `emergency.service.ts:tracking()` computes `eta_minutes`/`distance_km` from live unit GPS; `updateUnitLocation()` live push | BUILT-ON-EXISTING (verify only) |
| ETA/tracking for labs | YES — `labs.service.ts:updateGps()/getTracking()` with `eta`+`distance`; real-device GPS enforced | BUILT-ON-EXISTING (verify only) |
| Pharmacy delivery promise / ETA by location on product pages | PARTIAL — `pharmacy.schema.ts` has `delivery{method,courier_name,courier_phone,courier_eta}`; `PharmacyAllocation.eta_minutes`; medicines `details()` full doc (has `cold_chain`) but card/list mapping drops `cold_chain`, no ETA | DEFERRED-NEED (pharmacy/medicines not owned) |
| Delivery slots (bookable windows) | NO — nowhere in repo | BUILT-NEW in `labs` (`lab_visit_slots` + `lab_slot_holds`) |
| Live courier tracking on canonical pharmacy orders | GAP — `orders.service.ts:getTracking()` returns `delivery:null` for governed `pharmacy_orders`; `DeliveryUpdateDto.location` unvalidated | DEFERRED-NEED (orders not owned) |
| Proof of delivery (photo / courier code) | PARTIAL — `delivery.schema.ts` has `photo_proof`/`signature` fields; pharmacy `delivered()` has COD collection proof only, no photo/code | BUILT-NEW analogue in `home-care` visit completion (`visit_code` + photo/signature, one required); pharmacy PoD → DEFERRED-NEED |
| Cold-chain flag | EXISTS in `medicine.schema.ts:cold_chain`; NOT surfaced in medicines card/list reads; NOT present on lab catalog | BUILT-NEW surfaced in labs catalog+booking reads; medicines surfacing → DEFERRED-NEED |
| Home-care visit tracking push/poll | HALF — `GET nursing/visits/:id/tracking` poll EXISTS; no live position push during transit | BUILT-NEW `POST nursing/visits/:id/position` |

### 22.6 Appointment quality
| Item | Exists | Verdict |
|---|---|---|
| Self-service reschedule | YES — `appointments.service.ts:reschedule()` + states/ownership/slot re-hold | BUILT-ON-EXISTING: verify at service level + fix gaps (hospital/family ownership, PENDING preservation) |
| No-show policy (deposit/fee, configurable) | PARTIAL — `cancel()` no-show → 0% refund fixed; `NO_SHOW` state exists but cancel() goes to CANCELLED | BUILT-NEW `markNoShow()` + `system_configs:noshow_policy` (admin-settable; admin PUT → DEFERRED-NEED) |
| Waitlist for full slots | STUB — `joinWaitlist()` only emits an event, no persistence/leave/offer/expiry | BUILT-NEW persistent waitlist + auto-offer on cancel with expiry + race safety |
| Doctor-running-late notices | NO | BUILT-NEW provider-triggered + auto threshold + `appointment.doctor_running_late` event (notifications listener → DEFERRED-NEED) |
| Visit summary afterwards | YES — `finish()/getSummary()` SOAP summary | BUILT-ON-EXISTING: fix `getSummary` ownership gap + verify tests |

### 22.9 Documents
| Item | Exists | Verdict |
|---|---|---|
| Prescription PDF + verifying QR | NO | BUILT-NEW (pdfkit+qrcode already in repo, no new deps): signed token → public verify endpoint |
| Downloadable e-invoices | YES — `billing.module.ts:invoicePdf()` + `GET billing/invoice/:kind/:bookingId/pdf` (ZATCA QR) | BUILT-ON-EXISTING: verify with test, don't duplicate |
| Downloadable visit reports | PARTIAL — `medical-reports` has no PDF; appointment summary exists | BUILT-NEW appointment report PDF in `care`; medical-reports PDF → DEFERRED-NEED |

### 22.14 Safety
| Item | Exists | Verdict |
|---|---|---|
| Red-flag "call 997" first in triage | GAP — `ai.service.ts:triage()` returns `selected_emergency_signs_require_local_emergency_services`, no 997-first rule; chat module has no triage/symptom path at all | BUILT-NEW rule in `triage()` only (allowed exception) + red-flag fixture tests |
| SOS monthly drill procedure + report + simulation | NO | BUILT-NEW `runDrill()` + runbook + report template + service-level simulation test; monthly HUMAN drill → BLOCKED (ops action) |

## Endpoint contracts provided (by this agent)
- 22.4: `GET /labs/services?city=` (+`home_collection_eta_minutes`), `GET /labs/services/:id?city=`, `POST /labs/slots`, `GET /labs/slots?city=&date=`, `POST /labs/slots/:id/book{idempotency_key}`, `POST /labs/slots/holds/:id/release`, `POST /nursing/visits/:id/position`, `POST /nursing/visits/:id/complete` (proof now required: signature|photo|visit_code)
- 22.6: `POST /care/appointments/:id/no-show`, `POST /care/appointments/waitlist/join|leave`, `POST /care/appointments/waitlist/offers/:id/accept`, `POST /care/appointments/:id/report-late`
- 22.9: `POST /prescriptions/:id/pdf`, `GET /prescriptions/verify/:token` (public), `GET /care/appointments/:id/report.pdf`
- 22.14: `POST /emergency/drills/run` (admin), `GET /emergency/drills/reports` (admin)

## Proofs (break → red → restore per behaviour)

### 22.4 (commit [P22.22.4])
- New: 27 tests — `visit-slots.p22.spec.ts` (15), `lab-delivery-promise.p22.spec.ts` (6), `visit-proof-tracking.p22.spec.ts` (6). Regressions: `labs.service.spec` + `home-care.service.spec` + `home-care.controller.spec` (25) green. `tsc --noEmit` clean.
- Proof A (ETA): forced `withDeliveryPromise` ETA to null → `list() attaches ETA…` RED (1 failed) → restored.
- Proof B (slot race): disabled the `modified===0` guard → `loser of the atomic race gets slot_full` RED → restored.
- Proof C (visit code): accepted any code → `rejects a wrong code…` RED → restored.

## DEFERRED-NEED (exact file + diff proposal, needs outside owned modules)

### 22.4
- D-22.4.1 `backend/src/modules/medicines/medicines.service.ts` (~card mapping L172-184): add `cold_chain: localized.cold_chain === true` so list cards show the flag (schema already has it; `details()` returns it).
- D-22.4.2 `backend/src/modules/pharmacy/services/pharmacy-allocation.service.ts:delivered()`: accept `body?: {photo_url?: string; handover_code?: string}`; require one of photo/code (code compared against `order.delivery.handover_code` issued at out-for-delivery and shown to the patient); persist to `delivery.proof={method,at,by}`.
- D-22.4.3 `backend/src/modules/orders/orders.service.ts:getTracking()` governed branch: resolve the live `pharmacy_allocations` row for the order and return `{state, courier position, eta}` instead of `delivery:null`.
- D-22.4.4 `backend/src/modules/orders/orders.dto.ts:DeliveryUpdateDto.location`: replace `unknown` with validated `{lat:number(±90), lng:number(±180), at?: ISO}` via class-validator.
- D-22.4.5 pharmacy product-page ETA-by-location + pharmacy delivery slots: new `pharmacy_delivery_slots` windows mirroring `lab_visit_slots` (another agent owns pharmacy).

## BLOCKED
- Monthly human SOS drill with real people/ambulances is an ops action, not code. Procedure + template + simulation ship here.
- Live journeys (docker/device/accounts): journeys are another agent's; exact live-journey steps documented per task below.

## Live-journey steps (for the journeys agent — no docker here)
- 22.4: (1) seed lab service + slot window; (2) patient `GET /labs/services?city=Riyadh` sees eta; (3) book slot → hold id; (4) create lab booking with `visit_slot_id`; (5) technician `updateGps` → patient `getTracking` sees eta; (6) nurse transit → `POST position` → patient `GET visits/:id/tracking` map poll; (7) complete visit with `visit_code` shown to patient at booking.
- 22.6: (1) book → reschedule to free 15-min slot; (2) full slot → join waitlist ×2 → cancel booking → exactly one offer; (3) doctor `report-late` → patient notified; (4) no-show → fee per admin policy visible inRefund calc event.
- 22.9: (1) doctor creates Rx → `POST /prescriptions/:id/pdf` → scan QR → public verify page shows authentic + core fields; (2) paid booking → `GET /billing/invoice/:kind/:bookingId/pdf`; (3) completed visit → `GET /care/appointments/:id/report.pdf`.
- 22.14: (1) triage with `red_flags:[chest_pain]` → response starts with call-997 directive; (2) admin `POST /emergency/drills/run` → report in `sos_drill_reports`.
