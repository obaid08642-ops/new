# Nabd Plus — Final Manual Root Defect Register

**Issue date:** 2026-08-27
**Frozen source baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`
**Status:** **Phase 4 mapping closed; static evidence register only — NO-GO for production readiness**

> This is the final manual consolidation of `CONFIRMED_ROOT` candidate labels into repairable aggregate/subroot boundaries. It is not a remediation plan, build instruction, approval to edit source, runtime verification, production-readiness decision, merge, deployment, or authorization to use production data, secrets, PSPs, Sentry, Redis, databases, or external providers.

## Register basis and closure checks

The register was generated exclusively from the completed working mapping and frozen reviewer ledger. Exact evidence in each constituent is literal ledger evidence, not an artifact-branch report, a keyword match, or a runtime observation. The external artifact branch was rechecked during Phase 4; later artifact-only deltas remain isolated and unaccepted as source truth.

| Closure control | Result |
|---|---:|
| Candidate labels / frozen `CONFIRMED_ROOT` IDs | 852 / 852 |
| Final mappings / unreviewed mappings | 852 / 0 |
| Unique final root/subroot boundaries | 125 |
| Required mapping fields | Complete |
| Raw-ID uniqueness and coverage | PASS |
| Exact evidence equals frozen ledger | PASS |
| Valid derived taxonomy with no mapped-raw overlap | PASS |
| Blocking reconciliation issues | 0 |
| Derived-graph fan-out advisories | 178 claims across documented cross-links |

The independent validation record is `PHASE4_MAPPING_COMPLETENESS_AUDIT_2026-08-27.md`. Its cross-root derived-graph register is `PHASE4_CROSS_ROOT_DERIVED_REVIEW_2026-08-27.md`. A derived duplicate is a non-owning evidence-graph edge; it does not add candidate scope, override a direct mapping, or prescribe a combined implementation.

## Interpretation rules

Each `final_root_id` below owns **one bounded aggregate or state-machine problem**. Where several confirmed labels share a root, the register retains their separate exact evidence and causal variants instead of pretending they are one observation. The “business/authority boundary” states what must remain server-authoritative and what a future remediation must preserve; it is not a proposed design or acceptance approval.

For pharmacy, the frozen business rule remains: request broadcast, provider offers, one patient selection, then payment for cash/card; insurance requires provider/insurance decision and co-pay/confirmation rather than automatic cash. Consultation, laboratory, radiology and home-care cash/card need provider/slot selection and payment before confirmation; insurance needs request, decision, co-pay, then confirmation. In all cases, client state cannot be authoritative for clinical, legal, stock, pricing, coverage, co-pay, payment, or fulfillment outcome.

## Root register

### `R-01A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 5 |
| Confirmed raw IDs | F-1124<br>F-456<br>F-1123<br>F-1118<br>F-465 |
| Owners | Identity/Auth + Notification Platform<br>Identity/Auth + SMS/Mail |
| Derived graph | F-1125<br>F-455<br>F-1119<br>F-2524<br>F-2525 |

**Observed constituent causes.** OTP mail delivery job lacks privacy-safe correlation from authenticated issuance challenge through queued attempt, provider outcome, expiry/attempt/cancellation state and audit. OTP identity success is not bound to a verified usable delivery channel and canonical one-time challenge lifecycle.

**Business/authority boundary.** OTP authentication uses a server-owned challenge with normalized destination and issuer/purpose, one-time code hash, expiry/attempt/cancellation enforcement, idempotent delivery command and privacy-safe correlation/audit. Delivery transport is a dependency, not authentication success. An identity assertion may succeed only after server-verified challenge issuance, normalized destination, usable delivery/correlation, one-time verification, expiry, rate/lockout and audit.

**Frozen exact evidence.** `F-1124: src/modules/notifications/processors/mail.processor.ts:9–18`<br>`F-456: src/modules/sms/sms.service.ts:6–16,34–42,57–60`<br>`F-1123: src/modules/notifications/processors/mail.processor.ts:9–17`<br>`F-1118: src/modules/notifications/processors/mail.processor.ts:9–13`<br>`F-465: src/modules/mail/mail.module.ts:95–106`

**Constituent labels.** `CONFIRMED_ROOT_AUDIT_DEFECT_OTP_ISSUANCE_MAIL_DELIVERY_PRIVACY_SAFE_CORRELATION`<br>`CONFIRMED_ROOT_IDENTITY_DEFECT_PHONE_OTP_SUCCESS_WITHOUT_VERIFIED_USABLE_DELIVERY_CHANNEL`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_OTP_MAIL_JOB_DEADLINE_ATTEMPT_CANCELLATION_ENFORCEMENT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_OTP_MAIL_JOB_VERSIONED_SCHEMA_ISSUER_EXPIRY_VALIDATION`<br>`CONFIRMED_ROOT_USER_SECURITY_TRUTH_DEFECT_MAIL_OTP_TEMPLATE_TEN_MINUTES_AUTH_TTL_FIVE_MINUTES_DRIFT`

### `R-01B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-029<br>F-180 |
| Owners | Identity/Auth + Patient Mobile<br>Identity/Auth + Platform Redis |
| Derived graph | F-2410 |

**Observed constituent causes.** Mobile session/security UI converts session errors into empty/optimistic state rather than showing server-authoritative revocation/error status. Refresh/session validity can fail open when Redis-backed revocation state is unavailable.

**Business/authority boundary.** Client session settings must reflect verified server session/JTI state and explicit unavailable/retry outcomes; no optimistic erase or swallowed security error. Authentication/session refresh must fail closed or use explicitly verified local cryptographic state; refresh/revoke/rotation/expiry are server-authoritative and auditable.

**Frozen exact evidence.** `F-029: nabd_plus_patient_app/app/settings/security.tsx:39–116 ; nabdah-backend/src/modules/users/users.controller.ts:76–99`<br>`F-180: src/modules/auth/auth.service.ts:46–70,73–105 ; src/modules/auth/auth.controller.ts:241–247`

**Constituent labels.** `CONFIRMED_ROOT_MOBILE_SECURITY_TRUTH_DEFECT_OPTIMISTIC_PREFS_SWALLOWED_FAILURE_SESSIONS_ERROR_AS_EMPTY_ID_IS_JTI_CONTRACT_OK`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_REFRESH_SESSION_REDIS_FAIL_OPEN`

### `R-01C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-183 |
| Owners | Identity/Auth + Users |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Guest-to-account identity merge lacks an atomic ownership/duplicate-abuse boundary.

**Business/authority boundary.** Guest merge requires authenticated target account, explicit conflict policy, atomic transfer/reconciliation and audit; no client-selected identity authority.

**Frozen exact evidence.** `F-183: src/modules/auth/auth.service.ts:629–750`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_GUEST_IDENTITY_MERGE_ATOMICITY`

### `R-01D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-182 |
| Owners | Identity/Auth + Patient Profile + Notifications/Event Platform |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Patient registration creates the User then PatientProfile separately, emits an in-process event and requests OTP without an atomic registration/consent/profile/outbox/idempotency saga or compensation outcome.

**Business/authority boundary.** Patient registration is an idempotent server-owned identity saga: validated identity and current consent evidence, user/profile creation, audit/outbox and OTP challenge are committed or reconciled as one lifecycle. A partial profile, emitted event or OTP request cannot establish an activated account.

**Frozen exact evidence.** `F-182: src/modules/auth/auth.service.ts:349–405`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_PATIENT_REGISTRATION_USER_PROFILE_SAGA`

### `R-02A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 10 |
| Confirmed raw IDs | F-599<br>F-958<br>F-954<br>F-886<br>F-600<br>F-647<br>F-891<br>F-932<br>F-651<br>F-550 |
| Owners | Identity/Authorization + Provider Operations + Admin Governance<br>Identity/Authorization Platform<br>Provider Authorization + Care/Clinical Platform + Insurance/Pricing + Security |
| Derived graph | F-606<br>F-679<br>F-681<br>F-683<br>F-875<br>F-878<br>F-880<br>F-883<br>F-887<br>F-564 |

**Observed constituent causes.** Privileged provider/admin commands and reads rely on JWT or broad role context without a consistently verified role, organization/facility assignment, resource relationship, purpose, state and actor/reason audit boundary. Canonical identifier resolution lacks tenant/relationship scope. Provider doctor-engine endpoints have no controller guard/role/entity/purpose boundary and accept raw doctor, appointment, patient, pricing, network, media, diagnosis, medication and insurance fields for profile upsert/encounter finalization; the one appointment duplicate check does not establish authoritative relationships or downstream transaction state.

**Business/authority boundary.** Every privileged provider/admin read or mutation is deny-by-default and verifies active role, organization/facility assignment, resource relationship, purpose and command state; sensitive actions carry immutable actor/reason audit and bounded projections. Identifier resolution is typed canonical and tenant/relationship/role scoped before read or command authorization. Provider clinical/profile commands require verified provider role, facility and resource relationship, purpose/step-up where needed, typed bounded DTOs, canonical appointment/patient/price/insurance references, valid-state CAS/idempotency and immutable actor/reason/audit. Client payload never supplies clinical, coverage, price or encounter truth.

**Frozen exact evidence.** `F-599: src/modules/custom-services/custom-services.controller.ts:16–18 ; src/modules/custom-services/custom-services.service.ts:50–56`<br>`F-958: src/modules/compat/compat.module.ts:30–38,482–487,535–539,763–767,1037–1051`<br>`F-954: src/modules/compat/compat.module.ts:1027–1069`<br>`F-886: src/modules/provider-ops/provider-ops.module.ts:330–334,559–565`<br>`F-600: src/modules/custom-services/custom-services.service.ts:43–48`<br>`F-647: src/modules/admin-governance/admin-governance.module.ts:161–183,233–242`<br>`F-891: src/modules/provider-ops/provider-ops.module.ts:521–632`<br>`F-932: src/modules/compat/compat.module.ts:2–8,1111–1139`<br>`F-651: src/modules/admin-governance/admin-governance.module.ts:244–286`<br>`F-550: src/modules/care/doctor-integration.controller.ts:7–55`

**Constituent labels.** `CONFIRMED_ROOT_AUTHORIZATION_DEFECT_CUSTOM_SERVICES_ADMIN_LIST_NO_ROLE_ACTOR_PROVIDER_ORG_SCOPE`<br>`CONFIRMED_ROOT_CODE_DEFECT_CANONICAL_IDENTIFIER_TENANT_RESOLUTION`<br>`CONFIRMED_ROOT_CODE_DEFECT_PROVIDER_DASHBOARD_ROLE_FAIL_CLOSED`<br>`CONFIRMED_ROOT_INVOICE_AUTHORIZATION_DEFECT_PROVIDER_OPS_NO_EXPLICIT_PROVIDER_FACILITY_TENANCY_VISIBILITY_ACCESS_POLICY`<br>`CONFIRMED_ROOT_PHI_AUTHORIZATION_DEFECT_CUSTOM_SERVICES_ANY_PROVIDER_ROLE_DETAIL_NO_ASSIGNMENT_FACILITY_KIND_PURPOSE_SCOPE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_ENTITY_TRACE_PURPOSE_AUTHORIZATION`<br>`CONFIRMED_ROOT_PROVIDER_OPERATION_AUTHORIZATION_DEFECT_JWT_ONLY_CLINICAL_EMERGENCY_FINANCE_SETTINGS_MUTATIONS_NO_PROVIDER_ROLE_ASSIGNMENT_STATE_IDEMPOTENCY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_COMPAT_ROLE_TENANT_POLICY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_KILL_SWITCH_PRIVILEGED_ROLE_APPROVAL_AUDIT`<br>`CONFIRMED_ROOT_UNGUARDED_CLINICAL_PROVIDER_ENGINE_DEFECT_RAW_DOCTOR_APPOINTMENT_PATIENT_PRICING_INSURANCE_ENCOUNTER_UPSERT_FINALIZE`

### `R-03A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 12 |
| Confirmed raw IDs | F-543<br>F-896<br>F-895<br>F-713<br>F-673<br>F-671<br>F-676<br>F-674<br>F-675<br>F-338<br>F-549<br>F-672 |
| Owners | Booking Platform + Care/Home-care/Service Catalog<br>Scheduling/Reservations<br>Doctors + Booking Platform |
| Derived graph | F-545<br>F-678<br>F-714<br>F-1490 |

**Observed constituent causes.** Slot creation, lock, reschedule and release lack a unified provider/facility-timezone-aware atomic capacity reservation lifecycle with truthful expiry/reconciliation. Consultation slot capacity lacks atomic lock/reservation contract. Consultation slot calendar accepts timezone/calendar semantics outside the canonical atomic slot contract.

**Business/authority boundary.** A service slot is server-owned and must validate provider/facility/kind/interval/timezone/capacity; reserve, confirm, release, expire and reschedule via versioned idempotent transitions, then bind payment/insurance confirmation only after the applicable rule. Slot capacity is reserved atomically with provider/facility/timezone/capacity invariants and idempotent expiry/release reconciliation. All consultation schedule commands share provider/facility timezone, duration and interval validation with R-03A reservation rules.

**Frozen exact evidence.** `F-543: src/modules/care/appointments.service.ts:108–118,143–187`<br>`F-896: src/modules/doctors/doctors.module.ts:105–124`<br>`F-895: src/modules/doctors/doctors.module.ts:27–29,85–110`<br>`F-713: src/modules/service-catalog/service-catalog.module.ts:49–51,158–181`<br>`F-673: src/modules/slot-locks/slot-locks.module.ts:34–42`<br>`F-671: src/modules/slot-locks/slot-locks.module.ts:20–31`<br>`F-676: src/modules/slot-locks/slot-locks.module.ts:45–51`<br>`F-674: src/modules/slot-locks/slot-locks.module.ts:38–41`<br>`F-675: src/modules/slot-locks/slot-locks.module.ts:18–20`<br>`F-338: src/modules/unified-bookings/unified-bookings.module.ts:127–160`<br>`F-549: src/modules/care/slot.service.ts:26–79,85–106 ; src/modules/care/care.service.ts:115–165`<br>`F-672: src/modules/slot-locks/slot-locks.module.ts:14–18`

**Constituent labels.** `CONFIRMED_ROOT_APPOINTMENT_SLOT_ATOMICITY_DEFECT_CARE_OVERLAP_LOOKUP_THEN_CREATE_NO_ATOMIC_RESERVATION_CAPACITY_TRANSITION`<br>`CONFIRMED_ROOT_CODE_DEFECT_CONSULTATION_SLOT_ATOMIC_CAPACITY_LOCK`<br>`CONFIRMED_ROOT_CODE_DEFECT_CONSULTATION_SLOT_TIMEZONE_CALENDAR_VALIDATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_SERVICE_CATALOG_SLOT_TIMEZONE_INVALID_DATE_SEMANTICS`<br>`CONFIRMED_ROOT_CODE_DEFECT_SLOT_LOCK_CANONICAL_BOOKING_PROVIDER_PAYMENT_INSURANCE_CONFIRM_BINDING`<br>`CONFIRMED_ROOT_CODE_DEFECT_SLOT_LOCK_INTERVAL_ATOMIC_RESERVATION_EXCLUSION`<br>`CONFIRMED_ROOT_CODE_DEFECT_SLOT_LOCK_RELEASE_TRUTHFUL_STATE_CAS_AUDIT`<br>`CONFIRMED_ROOT_CODE_DEFECT_SLOT_LOCK_TERMINAL_BOOKING_RELEASE_EXPIRY_RECONCILIATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_SLOT_LOCK_TTL_CLEANUP_RACE_FAILURE_GOVERNANCE`<br>`CONFIRMED_ROOT_CODE_DEFECT_UNIFIED_RESCHEDULE_SLOT_CONCURRENCY`<br>`CONFIRMED_ROOT_SCHEDULING_TIMEZONE_VALIDATION_DEFECT_CARE_SLOT_UTC_DAY_WORKING_HOURS_DURATION_UNVALIDATED_NO_PROVIDER_FACILITY_TIMEZONE_CONTRACT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_SLOT_LOCK_PROVIDER_KIND_INTERVAL_CAPACITY_DTO_VALIDATION`

### `R-03B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 12 |
| Confirmed raw IDs | F-750<br>F-753<br>F-754<br>F-808<br>F-809<br>F-101<br>F-1492<br>F-907<br>F-596<br>F-795<br>F-699<br>F-542 |
| Owners | Booking Lifecycle<br>Booking Lifecycle + Finance<br>Doctors + Booking Platform<br>Hospital + Booking Platform<br>Booking Platform + Patient UX + Payments/Insurance<br>Booking Platform + Payments<br>Booking/Care + Patient UX |
| Derived graph | F-903<br>F-1487<br>F-1493<br>F-1490<br>F-545<br>F-803 |

**Observed constituent causes.** Booking progress/retry behavior can report false success or lacks canonical state/idempotency outcome contract. Cancellation penalty creation lacks canonical booking transition/payment authority and uniqueness/idempotency. Cancellation policy fails open on unknown state. Doctor appointment contract lacks a legal state transition matrix. Doctor availability/profile scope/version is not reconciled to the canonical booking eligibility state. Hospital appointment transitions lack a canonical compare-and-set state/audit/event lifecycle. Patient rebook lacks a canonical appointment state transition binding the next slot, quote, payment/insurance and prescription context. Direct cancellation path bypasses canonical versioned booking/payment/refund saga and can orphan state. Appointment detail displays a synthetic queue position/wait time rather than a server-derived operational queue state.

**Business/authority boundary.** Booking progress and retry use canonical transition state/version/idempotency with durable truthful outcome and reconciliation rather than client/local success. Cancellation triggers only from canonical authorized booking state transition; penalty is unique/idempotent and delegates any financial calculation/settlement to the authoritative policy/ledger. Cancellation evaluates only explicit canonical booking states and fails closed on unknown/missing policy/state, with downstream finance handled by canonical settlement. Consultation states permit only defined authorized transitions with version/CAS/audit and explicit pending/cancelled/completed truth. Availability is server-owned, provider/facility/specialty scoped and versioned; booking cannot confirm against stale or unrelated profile availability. Appointment state changes require legal transition matrix, current version, authorized actor, immutable audit and durable event; no direct terminal mutation. Rebooking begins with server authorization and a new/linked booking state; it binds slot and current quote, then applies cash/card or insurance decision/co-pay before confirmation. Cancellation is a server-owned state-machine command that coordinates booking, payment/refund and outbox/reconciliation; no direct destructive bypass. Patient appointment views show only measured queue/appointment state with source/time/freshness; unavailable queue data is explicit, never hard-coded completion/progress.

**Frozen exact evidence.** `F-750: src/modules/booking-flow/booking-flow.module.ts:103–169`<br>`F-753: src/modules/booking-flow/booking-flow.module.ts:183–200`<br>`F-754: src/modules/booking-flow/booking-flow.module.ts:183–200,232–240`<br>`F-808: src/modules/operations-safety/operations-safety.module.ts:102–114`<br>`F-809: src/modules/operations-safety/operations-safety.module.ts:102–114`<br>`F-101: src/modules/finance-engine/finance-engine.module.ts:687–706`<br>`F-1492: src/modules/doctors/doctors.schemas.ts:52–65`<br>`F-907: src/modules/doctors/doctors.module.ts:234–243,266`<br>`F-596: src/modules/hospital/services/hospital.service.ts:172–186`<br>`F-795: src/modules/patient-ux/patient-ux.module.ts:126–140`<br>`F-699: src/modules/consistency/consistency.module.ts:139–157`<br>`F-542: src/modules/care/appointments.service.ts:226–246`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_BOOKING_PROGRESS_EVENT_STATE_TRUTH`<br>`CONFIRMED_ROOT_CODE_DEFECT_BOOKING_RETRY_FALSE_SUCCESS`<br>`CONFIRMED_ROOT_CODE_DEFECT_BOOKING_RETRY_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_CANCELLATION_PENALTY_BOOKING_PAYMENT_AUTHORITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_CANCELLATION_PENALTY_UNIQUENESS_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_CANCELLATION_POLICY_UNKNOWN_STATE_FAIL_OPEN`<br>`CONFIRMED_ROOT_CODE_DEFECT_DOCTOR_APPOINTMENT_LEGAL_STATE_TRANSITION_MATRIX`<br>`CONFIRMED_ROOT_CODE_DEFECT_DOCTOR_AVAILABILITY_PROFILE_SCOPE_VERSION_BOOKING_RECONCILIATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOSPITAL_APPOINTMENT_CANONICAL_TRANSITION_CAS_AUDIT_EVENT`<br>`CONFIRMED_ROOT_CODE_DEFECT_PATIENT_REBOOK_CANONICAL_QUOTE_SLOT_PAYMENT_INSURANCE_PRESCRIPTION`<br>`CONFIRMED_ROOT_FINANCIAL_STATE_DEFECT_CONSISTENCY_ORPHAN_DIRECT_CANCELLATION_BYPASSES_CANONICAL_SAGA`<br>`CONFIRMED_ROOT_OPERATIONAL_TRUTH_DEFECT_CARE_APPOINTMENT_DETAIL_HARDCODED_QUEUE_POSITION_AHEAD_COUNT_WAIT_TIME`

### `R-03C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 10 |
| Confirmed raw IDs | F-749<br>F-973<br>F-897<br>F-337<br>F-972<br>F-971<br>F-964<br>F-960<br>F-965<br>F-1491 |
| Owners | Booking Operations + Provider Governance<br>Booking Operations + Care + Identity<br>Booking Operations + Insurance + Payments<br>Booking Operations + Workflow Platform<br>Booking Operations + Privacy |
| Derived graph | F-970<br>F-336<br>F-344 |

**Observed constituent causes.** Booking flow resolves provider ownership by heuristics rather than authoritative active assignment/capability relationship. Booking-ops commands permit weak domain-owner/facility/provider/license resolution, direct payment/insurance marking, weak DTO enum/payload boundaries and parallel orchestration that bypasses canonical booking authority. Legacy doctor booking can own quote/payment/insurance authority. Unified checkout orchestrates heterogeneous booking/order creation and best-effort rollback in-process, reports group success without durable saga/idempotency/compensation state, and directly clears cart lines after partial domain outcomes. Doctor appointment document/address/state/history fields lack typed command boundary.

**Business/authority boundary.** Booking flow resolves provider/facility ownership from canonical active assignment and service capability, never heuristics. Every booking operation verifies the active domain owner, facility/provider assignment and capability/license, accepts typed command payloads only, and delegates payment/insurance state to canonical R-05/R-04 contracts; parallel bypass routes are decommissioned or reconciled. Doctor booking command delegates quote to canonical price/offer, payment to PSP/ledger and insurance to authoritative decision/co-pay workflow; legacy bypass is removed/reconciled. Every booking operation uses canonical domain aggregate commands and a durable idempotent checkout saga with explicit pending/committed/compensating outcomes, outbox/reconciliation and no client/cart success ahead of authoritative booking/payment/insurance state. Pharmacy continues through broadcast→offer→patient selection; non-pharmacy cash requires canonical payment before confirmation. Booking commands accept typed schema-validated minimum documents/address/state transitions/history with canonical aggregate authority and audit.

**Frozen exact evidence.** `F-749: src/modules/booking-flow/booking-flow.module.ts:42–64`<br>`F-973: src/modules/booking-ops/booking-ops.module.ts:2–24,83–150,191–204`<br>`F-897: src/modules/doctors/doctors.module.ts:112–140`<br>`F-337: src/modules/unified-bookings/unified-bookings.module.ts:315–395`<br>`F-972: src/modules/booking-ops/booking-ops.module.ts:58–65,123–129`<br>`F-971: src/modules/booking-ops/booking-ops.module.ts:180–189`<br>`F-964: src/modules/booking-ops/booking-ops.module.ts:123–150`<br>`F-960: src/modules/booking-ops/booking-ops.module.ts:50–80`<br>`F-965: src/modules/booking-ops/booking-ops.module.ts:67–80,123–148`<br>`F-1491: src/modules/doctors/doctors.schemas.ts:70–73`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_BOOKING_FLOW_PROVIDER_OWNERSHIP_HEURISTICS`<br>`CONFIRMED_ROOT_CODE_DEFECT_BOOKING_OPS_CANONICAL_ORCHESTRATION_BYPASS_DECOMMISSION`<br>`CONFIRMED_ROOT_CODE_DEFECT_LEGACY_DOCTOR_BOOKING_QUOTE_PAYMENT_INSURANCE_AUTHORITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_MULTIDOMAIN_CHECKOUT_SAGA_TRUTH`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_BOOKING_OPS_ACTIVE_PROVIDER_LICENSE_FACILITY_IDENTITY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_BOOKING_OPS_COMMAND_DTO_ENUM_PAYLOAD_VALIDATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_BOOKING_OPS_DIRECT_PAYMENT_INSURANCE_MARK_BYPASS`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_BOOKING_OPS_DOMAIN_OWNER_FACILITY_ASSIGNMENT_RESOLVER`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_BOOKING_OPS_PROVIDER_PAYMENT_MARK_FACILITY_ASSIGNMENT_SCOPE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_DOCTOR_APPOINTMENT_DOCUMENT_ADDRESS_STATE_HISTORY_TYPED_BOUNDARY`

### `R-03D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 8 |
| Confirmed raw IDs | F-967<br>F-966<br>F-962<br>F-751<br>F-752<br>F-899<br>F-796<br>F-677 |
| Owners | Booking Operations + Clinical Privacy + Media<br>Booking Privacy/Projection<br>Booking Platform + Privacy/Security |
| Derived graph | F-968 |

**Observed constituent causes.** Booking-ops invoice/attachment reads expose broad actor/document data without purpose-safe projection, approved secure asset lifecycle or signed relationship-bound delivery authorization. Booking status/timeline reads lack provider-purpose minimum projection and bounded cursor/pagination contract. Doctor appointment inbox lacks role/facility minimum projection. Patient rebook flow carries unclassified data across booking context. Slot-lock mine endpoint lacks a bounded minimum projection and expiry filter for relationship-scoped reservation data.

**Business/authority boundary.** Booking read/projection returns minimum actor-authorized invoice and attachment fields; attachments reference approved private media assets, with verified booking/provider/purpose relationship, signed delivery, retention and audit. Booking status/timeline views enforce participant/provider purpose scope, minimum fields, redaction, stable bounded pagination and audit. Appointment inbox views enforce active role/facility/relationship scope and minimum redacted projection with audit. Rebooking transfers only allowlisted classified data through authorized canonical booking projection; clinical/insurance/payment fields are rederived server-side. Booking/slot read models expose only requester-authorized active reservation fields with expiry/pagination/projection policy.

**Frozen exact evidence.** `F-967: src/modules/booking-ops/booking-ops.module.ts:163–177`<br>`F-966: src/modules/booking-ops/booking-ops.module.ts:26–36,152–160`<br>`F-962: src/modules/booking-ops/booking-ops.module.ts:94–103`<br>`F-751: src/modules/booking-flow/booking-flow.module.ts:130–169`<br>`F-752: src/modules/booking-flow/booking-flow.module.ts:172–180`<br>`F-899: src/modules/doctors/doctors.module.ts:152–158`<br>`F-796: src/modules/patient-ux/patient-ux.module.ts:131–138`<br>`F-677: src/modules/slot-locks/slot-locks.module.ts:54`

**Constituent labels.** `CONFIRMED_ROOT_PRIVACY_DEFECT_BOOKING_OPS_ATTACHMENT_PURPOSE_ROLE_SIGNED_DELIVERY_AUTHORIZATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_BOOKING_OPS_ATTACHMENT_SECURE_STORAGE_CONTENT_LIFECYCLE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_BOOKING_OPS_INVOICE_ACTOR_PROJECTION_AUDIT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_BOOKING_STATUS_PROVIDER_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_BOOKING_TIMELINE_PROJECTION_AND_PAGINATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_DOCTOR_APPOINTMENT_INBOX_ROLE_FACILITY_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PATIENT_REBOOK_ALLOWLISTED_DATA_CLASSIFICATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_SLOT_LOCK_MINE_BOUNDED_MINIMUM_PROJECTION_EXPIRY_FILTER`

### `R-04A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-341<br>F-1488 |
| Owners | Insurance + Booking + Provider Operations<br>Doctors + Insurance + Booking |
| Derived graph | F-078<br>F-1280 |

**Observed constituent causes.** Unified consultation card/checkout contract has no typed insurance request, provider/insurance decision, co-pay payment and post-payment confirmation capability. Doctor appointment payment/insurance runtime type contract cannot safely represent canonical insurance decision/co-pay state.

**Business/authority boundary.** Insurance request/decision/co-pay state is versioned and server-authoritative: for consultation, lab, radiology and home-care the patient selects provider/slot, submits insurance without initial payment, provider records full/partial/reject decision, patient pays only confirmed co-pay, then booking confirms; rejection permits governed cash retry or cancellation. Insurance request/decision/co-pay state is versioned and server-authoritative; client/DTO enum must not permit auto-cash or invalid confirmation.

**Frozen exact evidence.** `F-341: src/modules/unified-bookings/unified-bookings.module.ts:182–205`<br>`F-1488: src/modules/doctors/doctors.schemas.ts:52–69`

**Constituent labels.** `CONFIRMED_ROOT_BUSINESS_CAPABILITY_GAP_UNIFIED_CONSULTATION_CARD_INSURANCE`<br>`CONFIRMED_ROOT_CODE_DEFECT_DOCTOR_APPOINTMENT_RUNTIME_TYPE_PAYMENT_INSURANCE_ENUMS`

### `R-04A1`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 14 |
| Confirmed raw IDs | F-2901<br>F-817<br>F-990<br>F-636<br>F-637<br>F-768<br>F-634<br>F-2908<br>F-499<br>F-632<br>F-174<br>F-565<br>F-1279<br>F-173 |
| Owners | Insurance + Care/Booking + Provider Operations<br>Insurance Orchestration + Admin Authority<br>Insurance Orchestration<br>Insurance Orchestration + Finance<br>Insurance Orchestration + Workflow Platform<br>Insurance Domain + Provider Operations + Booking/Pharmacy<br>Insurance Orchestration + Provider Jobs |
| Derived graph | F-078<br>F-1280 |

**Observed constituent causes.** Insurance policy, coverage verification and provider decision evidence have incompatible/non-persisted shapes or trust client/flag/snapshot state rather than a canonical versioned claim decision. Admin insurance override bypasses canonical decision, co-pay and settlement chain. Admin insurance decision path bypasses canonical decision orchestration. Insurance quote/request/appeal/decision flow trusts client commercial context or lacks canonical idempotency, durable appeal outbox and concurrency control over decision/co-pay state. Workflow insurance matching lacks canonical policy/provider decision contract. Provider insurance acceptance returns true when no provider matrix exists, treating an absent or incomplete eligibility record as universal acceptance instead of a verified current provider-network capability. Provider jobs treats raw insurance approval field as authoritative.

**Business/authority boundary.** Insurance request is owner/policy/service scoped; provider records a verifiable full/partial/reject decision with evidence/version/expiry/currency/co-pay. Only after that decision may co-pay payment and booking confirmation occur; rejection offers cash/cancel, never auto-cash. Insurance override follows the same canonical provider/policy full/partial/reject decision and co-pay/settlement workflow with approved exceptional authority, no direct bypass. Insurance decisions use the canonical versioned provider/policy decision workflow with explicit full/partial/reject and audit; admin cannot bypass it. Insurance quote/request/appeal/decision commands derive price and eligibility from authoritative policy/provider records, are idempotent/versioned, persist durable events and serialize decision/co-pay transitions with explicit full/partial/reject outcome. Insurance matching delegates to authoritative policy/provider eligibility and decision contract with explicit fail-closed outcome and audit. An insurance request is evaluated against a canonical current policy, eligible provider/network/service and recorded provider/insurance decision. Missing, stale or unresolved eligibility fails closed to a truthful pending/unavailable state; only a full/partial/reject decision produces an authoritative co-pay or cash/cancel choice. Insurance approval state is resolved from canonical policy/provider decision workflow; provider jobs only consume approved minimum derived state.

**Frozen exact evidence.** `F-2901: src/modules/insurance/insurance.module.ts:155–210`<br>`F-817: src/modules/admin-authority/admin-authority.module.ts:106–145`<br>`F-990: src/modules/compat/admin-spa.module.ts:1007–1051`<br>`F-636: src/modules/insurance-engine/insurance-engine.module.ts:292–329`<br>`F-637: src/modules/insurance-engine/insurance-engine.module.ts:365–421`<br>`F-768: src/modules/workflow-engine/workflow-engine.module.ts:366–391,432–440`<br>`F-634: src/modules/insurance-engine/insurance-engine.module.ts:266–289`<br>`F-2908: src/modules/insurance/insurance.module.ts:315–335`<br>`F-499: src/modules/legal/legal-enterprise.service.ts:286–306`<br>`F-632: src/modules/insurance-engine/insurance-engine.module.ts:176–201`<br>`F-174: src/modules/users/users.insurance.controller.ts:34–80 ; src/modules/users/user.insurance.controller.ts:13–46`<br>`F-565: src/modules/care/schemas/encounter-record.schema.ts:30–40`<br>`F-1279: src/modules/provider-jobs/provider-jobs.module.ts:228–245`<br>`F-173: src/modules/users/users.insurance.controller.ts:56–80 ; src/modules/users/users.service.ts:138–157`

**Constituent labels.** `CONFIRMED_ROOT_BUSINESS_CONTRACT_DEFECT_COVERAGE_UNVERIFIED_MATCHING`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_INSURANCE_OVERRIDE_DECISION_COPAY_SETTLEMENT_BYPASS`<br>`CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_ADMIN_DECISION_ORCHESTRATION_BYPASS`<br>`CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_APPEAL_OUTBOX_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_DECISION_COPAY_CONCURRENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_MATCHING_CONTRACT`<br>`CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_REQUEST_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_POLICY_VERIFICATION_FLAGS_TRUSTED`<br>`CONFIRMED_ROOT_CODE_DEFECT_PROVIDER_INSURANCE_MATRIX_FAIL_OPEN_VERIFICATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_QUOTE_TRUSTS_CLIENT_PRICE`<br>`CONFIRMED_ROOT_INSURANCE_CANONICAL_PROJECTION_MIGRATION_PRECEDENCE_DEFECT_THREE_INCOMPATIBLE_SHAPES`<br>`CONFIRMED_ROOT_INSURANCE_DECISION_EVIDENCE_DEFECT_CARE_ENCOUNTER_SNAPSHOT_NO_CANONICAL_PROVIDER_CLAIM_VERSION_NUMERIC_CURRENCY_BOUNDARY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_PROVIDER_JOB_RAW_INSURANCE_APPROVAL_FIELD_AUTHORITY`<br>`CONFIRMED_ROOT_USER_TRUTH_DEFECT_USERS_INSURANCE_SUCCESS_RESPONSE_NOT_PERSISTED_DUE_PROFILE_WHITELIST_EXCLUSION`

### `R-04A2`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 3 |
| Confirmed raw IDs | F-080<br>F-077<br>F-079 |
| Owners | Patient Mobile + Insurance |
| Derived graph | F-078 |

**Observed constituent causes.** Mobile insurance screens fabricate claim/benefit/coverage success, monetary limits or renewal state instead of rendering canonical policy/claim decision data.

**Business/authority boundary.** Client displays the server policy/claim/decision state and explicit unavailable/pending/rejected/partial paths; no local success, benefit amount or confirmation.

**Frozen exact evidence.** `F-080: nabd_plus_patient_app/app/insurance/benefits-summary.tsx:19–29,56–65,61–121`<br>`F-077: nabd_plus_patient_app/app/insurance/submit-claim.tsx:24–41,76–152`<br>`F-079: nabd_plus_patient_app/app/insurance/hub.tsx:21–70,92–130,158–188,294–415,419–469`

**Constituent labels.** `CONFIRMED_ROOT_MOBILE_INSURANCE_BENEFITS_TRUTH_DEFECT_HARDCODED_MONETARY_LIMIT_STALE_RENEWAL_EMPTY_ON_FAILURE`<br>`CONFIRMED_ROOT_MOBILE_INSURANCE_CLAIM_TRUTH_DEFECT_LOCAL_SUCCESS_NO_SERVER_CLAIM_ID_OWNER_POLICY_SERVICE_EVIDENCE_IDEMPOTENCY_LIFECYCLE`<br>`CONFIRMED_ROOT_MOBILE_INSURANCE_HUB_TRUTH_DEFECT_FABRICATED_COVERAGE_LIMITS_DEDUCTIBLE_VERIFICATION_IGNORED_PERSISTENCE_FAILURE`

### `R-04A3`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 3 |
| Confirmed raw IDs | F-2911<br>F-2900<br>F-633 |
| Owners | Insurance + Privacy/Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Insurance policy and claim reads expose full/raw data without owner-scoped minimum projection, pagination and retention controls.

**Business/authority boundary.** Insurance policy/claim data is limited to authorized subject/purpose with DTO projection, pagination, audit and retention; public/full document is never default.

**Frozen exact evidence.** `F-2911: src/modules/insurance/insurance.module.ts:363–365,493–496`<br>`F-2900: src/modules/insurance/insurance.module.ts:182–190,212–224`<br>`F-633: src/modules/insurance-engine/insurance-engine.module.ts:232–246`

**Constituent labels.** `CONFIRMED_ROOT_PRIVACY_DEFECT_CLAIMS_PROJECTION_PAGINATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_COVERAGE_RETURNS_FULL_POLICY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_INSURANCE_POLICY_DATA_GOVERNANCE`

### `R-04A4`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 7 |
| Confirmed raw IDs | F-639<br>F-2902<br>F-2912<br>F-640<br>F-2910<br>F-2909<br>F-2913 |
| Owners | Insurance Orchestration + Finance |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Insurance co-pay settlement and cancellation lack reconciled downstream lifecycle. Insurance coverage co-pay and claim flows do not fully enforce canonical financial invariants, server-authoritative amount, durable settlement lifecycle, idempotent patient/admin mutation and audit.

**Business/authority boundary.** Co-pay/cancellation transitions use authoritative claim/booking/payment states with durable downstream events, idempotent reconciliation and explicit terminal outcomes. Coverage/claim commands derive amounts and co-pay from authoritative policy/provider decision, bind settlement to claim/booking state with durable lifecycle, reject client amount truth and use idempotent audited versioned patient/admin transitions.

**Frozen exact evidence.** `F-639: src/modules/insurance-engine/insurance-engine.module.ts:424–443`<br>`F-2902: src/modules/insurance/insurance.module.ts:175–210`<br>`F-2912: src/modules/insurance/insurance.module.ts:389–448`<br>`F-640: src/modules/insurance-engine/insurance-engine.module.ts:445–452`<br>`F-2910: src/modules/insurance/insurance.module.ts:338–365`<br>`F-2909: src/modules/insurance/insurance.module.ts:338–360`<br>`F-2913: src/modules/insurance/insurance.module.ts:468–491`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_COPAY_SETTLEMENT_RECONCILIATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_COVERAGE_COPAY_FINANCIAL_INVARIANTS`<br>`CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_ADMIN_MUTATION_IDEMPOTENCY_AUDIT`<br>`CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_CANCELLATION_DOWNSTREAM_SYNC`<br>`CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_CLAIM_SETTLEMENT_LIFECYCLE`<br>`CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_CLAIM_TRUSTS_CLIENT_AMOUNT`<br>`CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_PATIENT_MUTATION_IDEMPOTENCY`

### `R-04B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 4 |
| Confirmed raw IDs | F-2899<br>F-2898<br>F-328<br>F-2897 |
| Owners | Insurance Platform + Catalog Governance<br>Insurance Catalog + Provider Governance + API Platform |
| Derived graph | F-074<br>F-1847<br>F-1848 |

**Observed constituent causes.** Public insurance network/catalog exposure lacks verified publication/governance filtering, minimum public rule projection and typed validated catalog mutation contract. Insurance companies endpoint declares broad `additionalProperties` for company and plan objects and delegates a full active-company list without a strict minimum public DTO, publication eligibility or bounded catalog projection contract.

**Business/authority boundary.** Public insurance catalog/network results are limited to verified current governed records with minimum safe public DTOs; catalog commands use typed validation, authorized/versioned publication lifecycle and reconciliation/audit. Public insurance catalog responses expose only approved, effective, localized and minimum necessary company/plan metadata through a versioned strict DTO. A public catalog entry is not proof of patient coverage, provider eligibility, price, co-pay or decision outcome.

**Frozen exact evidence.** `F-2899: src/modules/insurance/insurance.module.ts:63–68,117–131,389–448`<br>`F-2898: src/modules/insurance/insurance.module.ts:111–125,427–448`<br>`F-328: src/modules/insurance/insurance.controller.ts:58–90`<br>`F-2897: src/modules/insurance/insurance.module.ts:43–60`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_CATALOG_MUTATION_VALIDATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PUBLIC_INSURANCE_RULE_PROJECTION`<br>`CONFIRMED_ROOT_PUBLIC_CATALOG_PROJECTION_DEFECT_LIVE_INSURANCE_LIST_COMPANIES_SPREADS_FULL_ACTIVE_COMPANY_DOCUMENT_NO_STRICT_DTO`<br>`CONFIRMED_ROOT_PUBLIC_INSURANCE_NETWORK_CATALOG_GOVERNANCE_VERIFICATION_FILTER_DEFECT`

### `R-04C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 5 |
| Confirmed raw IDs | F-2904<br>F-635<br>F-2903<br>F-2907<br>F-2905 |
| Owners | Insurance Documents + Privacy + Compliance<br>Insurance Documents + Privacy |
| Derived graph | F-059<br>F-075 |

**Observed constituent causes.** Insurance OCR, policy upload and NPHIES interaction lack a consented safe document intake, provenance/review, private lifecycle and national-identifier endpoint scope contract. Insurance document handling lacks purpose-bound secure document governance.

**Business/authority boundary.** Insurance documents use approved safe assets with consent/purpose, scan/quarantine/provenance/reviewer lifecycle, private retention and redacted projection; NPHIES access is purpose/subject-scoped with national-ID minimization/audit. Insurance documents reference approved private assets with consent/purpose, scan/provenance/retention/minimum projection and audited access.

**Frozen exact evidence.** `F-2904: src/modules/insurance/insurance.module.ts:233–247`<br>`F-635: src/modules/insurance-engine/insurance-engine.module.ts:33–67,280–287`<br>`F-2903: src/modules/insurance/insurance.module.ts:227–251`<br>`F-2907: src/modules/insurance/insurance.module.ts:290–312,478–481`<br>`F-2905: src/modules/insurance/insurance.module.ts:254–283`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_INSURANCE_OCR_PROVENANCE_AND_REVIEW`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_INSURANCE_DOCUMENT_GOVERNANCE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_INSURANCE_OCR_INPUT_GOVERNANCE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_NPHIES_ENDPOINT_NATIONAL_ID_SCOPE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_POLICY_UPLOAD_GOVERNANCE`

### `R-04D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 10 |
| Confirmed raw IDs | F-1823<br>F-1827<br>F-1821<br>F-1831<br>F-1822<br>F-1826<br>F-1825<br>F-1832<br>F-1830<br>F-1824 |
| Owners | Insurance Catalog + Release/Data Governance + Media |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Insurance-logo publication lacks approved target/operator binding, signed/versioned schema-valid manifest, source licensing/identity and asset safety validation, safe origin path policy, versioned object rollback, atomic object/catalog linkage, result assertion and immutable review/audit/release idempotency.

**Business/authority boundary.** Insurance public assets are published only from approved target-bound signed/versioned manifests; source licence/identity and file MIME/dimensions are validated, object/catalog updates are versioned/reconcilable/rollbackable, public origin is allowlisted, and each operator/review/revision/result is immutable and auditable.

**Frozen exact evidence.** `F-1823: scripts/publish-insurance-logo-assets.ts:24–29`<br>`F-1827: scripts/publish-insurance-logo-assets.ts:43–49`<br>`F-1821: scripts/publish-insurance-logo-assets.ts:32–42`<br>`F-1831: scripts/publish-insurance-logo-assets.ts:22,44–46`<br>`F-1822: scripts/publish-insurance-logo-assets.ts:18–22,32–35`<br>`F-1826: scripts/publish-insurance-logo-assets.ts:42–46`<br>`F-1825: scripts/publish-insurance-logo-assets.ts:43–46`<br>`F-1832: scripts/publish-insurance-logo-assets.ts:43–46`<br>`F-1830: scripts/publish-insurance-logo-assets.ts:18,43–49`<br>`F-1824: scripts/publish-insurance-logo-assets.ts:39–46`

**Constituent labels.** `CONFIRMED_ROOT_ASSET_SAFETY_DEFECT_INSURANCE_LOGO_HASH_ONLY_NO_MIME_DIMENSION_SOURCE_IDENTITY_VALIDATION`<br>`CONFIRMED_ROOT_AUDIT_DEFECT_INSURANCE_LOGO_MUTABLE_LINK_NO_IMMUTABLE_OPERATOR_REVIEW_VERSION_HISTORY`<br>`CONFIRMED_ROOT_CHANGE_GOVERNANCE_DEFECT_INSURANCE_LOGO_APPLY_NO_TARGET_OPERATOR_APPROVAL_BINDING`<br>`CONFIRMED_ROOT_CONFIG_SECURITY_DEFECT_INSURANCE_LOGO_PUBLIC_BASE_URL_UNVALIDATED_ORIGIN_PATH`<br>`CONFIRMED_ROOT_DATA_CONTRACT_DEFECT_INSURANCE_LOGO_MANIFEST_ANY_NO_SCHEMA_SIGNATURE_UNIQUENESS_VERSION`<br>`CONFIRMED_ROOT_DATA_INTEGRITY_DEFECT_INSURANCE_LOGO_UPDATE_NO_UNIQUE_TARGET_STATE_RESULT_ASSERTION`<br>`CONFIRMED_ROOT_EVENT_STORAGE_RELIABILITY_DEFECT_INSURANCE_LOGO_S3_MONGO_LINK_NON_ATOMIC`<br>`CONFIRMED_ROOT_PROVENANCE_LEGAL_DEFECT_INSURANCE_LOGO_SOURCE_URL_LICENSING_REVIEW_NOT_VALIDATED`<br>`CONFIRMED_ROOT_RELEASE_RELIABILITY_DEFECT_INSURANCE_LOGO_MANIFEST_RELEASE_KEY_IDEMPOTENCY_REVISION_SEMANTICS`<br>`CONFIRMED_ROOT_STORAGE_INTEGRITY_DEFECT_INSURANCE_LOGO_DETERMINISTIC_OBJECT_OVERWRITE_NO_VERSION_ROLLBACK`

### `R-04E`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 8 |
| Confirmed raw IDs | F-1836<br>F-1835<br>F-1839<br>F-1837<br>F-1838<br>F-1840<br>F-1843<br>F-1845 |
| Owners | Insurance Catalog + Release/Data Governance |
| Derived graph | F-1847<br>F-1848 |

**Observed constituent causes.** Insurance catalog reconciliation accepts weak manifests and unauthorised targets, has no normalized-code preflight/conflict policy, sequential non-atomic upserts, weak version/operator provenance/idempotency and no post-import drift/orphan report.

**Business/authority boundary.** Insurance catalog reconciliation is a target/operator-approved, signed content-addressed manifest operation with normalized uniqueness/preflight/conflict policy, transactional or lock-protected idempotent writes/recovery, immutable provenance and post-import duplicate/orphan/missing/drift reconciliation evidence.

**Frozen exact evidence.** `F-1836: scripts/reconcile-insurance-catalog.ts:28–53`<br>`F-1835: scripts/reconcile-insurance-catalog.ts:18–35`<br>`F-1839: scripts/reconcile-insurance-catalog.ts:56–75`<br>`F-1837: scripts/reconcile-insurance-catalog.ts:56–75`<br>`F-1838: scripts/reconcile-insurance-catalog.ts:56–79`<br>`F-1840: scripts/reconcile-insurance-catalog.ts:60–72`<br>`F-1843: scripts/reconcile-insurance-catalog.ts:76–79`<br>`F-1845: scripts/reconcile-insurance-catalog.ts:28,56–75`

**Constituent labels.** `CONFIRMED_ROOT_CHANGE_GOVERNANCE_DEFECT_INSURANCE_CATALOG_APPLY_MONGO_URI_ONLY_NO_TARGET_OPERATOR_APPROVAL`<br>`CONFIRMED_ROOT_DATA_CONTRACT_DEFECT_INSURANCE_CATALOG_MANIFEST_ARRAY_ONLY_NO_RECORD_UNIQUE_DIGEST_VALIDATION`<br>`CONFIRMED_ROOT_DATA_INTEGRITY_DEFECT_INSURANCE_CATALOG_EXISTING_PROVENANCE_VERSION_STATUS_CONFLICT_SILENT`<br>`CONFIRMED_ROOT_DATA_INTEGRITY_DEFECT_INSURANCE_CATALOG_NORMALIZED_CODE_DUPLICATE_COLLAPSE_NO_PREFLIGHT`<br>`CONFIRMED_ROOT_DATA_RELIABILITY_DEFECT_INSURANCE_CATALOG_SEQUENTIAL_UPSERT_NO_TRANSACTION_LOCK_RECOVERY`<br>`CONFIRMED_ROOT_PROVENANCE_DEFECT_INSURANCE_CATALOG_FIXED_VERSION_BASENAME_NO_MANIFEST_DIGEST_OPERATOR`<br>`CONFIRMED_ROOT_RECONCILIATION_DEFECT_INSURANCE_CATALOG_NO_POSTIMPORT_DUPLICATE_ORPHAN_MISSING_DRIFT_REPORT`<br>`CONFIRMED_ROOT_RELEASE_RELIABILITY_DEFECT_INSURANCE_CATALOG_NO_MANIFEST_DIGEST_REVISION_IDEMPOTENCY`

### `R-05A1`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 7 |
| Confirmed raw IDs | F-758<br>F-100<br>F-105<br>F-106<br>F-108<br>F-963<br>F-799 |
| Owners | Payments + Booking Lifecycle<br>Payments/Finance + Platform<br>Payments/Finance + Platform Security<br>Payments + Booking Operations<br>Payments + Admin Authority |
| Derived graph | F-048<br>F-053<br>F-057<br>F-058<br>F-078<br>F-240<br>F-544<br>F-819<br>F-970<br>F-3562 |

**Observed constituent causes.** Booking status presents financial truth outside canonical payment/ledger authority. Financial failure semantics, server amount authority and payment command idempotency lack one fail-closed payment-intent boundary. Webhook verifies a signature then calls generic payment verification by gateway intent without durable unique provider-event replay record, canonical payload amount/currency/owner/state comparison, monotonic transition or atomic ledger/outbox reconciliation. Booking payment state can be marked outside the canonical PSP/ledger authority. Admin can directly mark payment state outside PSP/ledger truth.

**Business/authority boundary.** Booking status derives financial outcome only from canonical PSP-verified payment and ledger state with explicit pending/failed/settled semantics. Payment can settle only against a server-owned quote/intent with amount, currency, order/booking ownership and idempotency; unavailable or unverified states are not paid/success. Payment settlement accepts only a configured provider’s verified raw-body signature plus canonical provider event/intent identity, amount/currency/owner/quote match and monotonic transaction state. Webhook receipt uses a unique event/replay record, atomic idempotent state/ledger transition and durable outbox/reconciliation; duplicate, stale, mismatched or ambiguous events never create payment success. Provider activation and live receipts remain runtime/external evidence. Booking payment transitions require canonical payment intent/provider verification and immutable ledger state; booking-ops cannot directly mark success/failure. Admin tools cannot directly mark payment outcome; verified PSP/ledger transition is the sole authority with exceptional remediation through audited settlement workflow.

**Frozen exact evidence.** `F-758: src/modules/booking-flow/booking-flow.module.ts:154–169`<br>`F-100: src/modules/finance-engine/finance-engine.module.ts:117–130,727–740`<br>`F-105: src/modules/payments/paymob.service.ts:20–53 ; src/modules/payments/paymob.controller.ts:19–23`<br>`F-106: src/modules/payments/paymob.service.ts:20–53 ; src/modules/payments/payments.module.ts:160–217`<br>`F-108: src/modules/payments/payments.module.ts:351–373,392–405`<br>`F-963: src/modules/booking-ops/booking-ops.module.ts:106–120`<br>`F-799: src/modules/patient-ux/patient-ux.module.ts:243–267,286–290`

**Constituent labels.** `CONFIRMED_ROOT_BUSINESS_CONTRACT_DEFECT_BOOKING_STATUS_FINANCIAL_TRUTH`<br>`CONFIRMED_ROOT_CODE_DEFECT_FINANCIAL_FAILURE_FAIL_CLOSED_SEMANTICS`<br>`CONFIRMED_ROOT_CODE_DEFECT_PAYMENT_AMOUNT_AUTHORITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_PAYMENT_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_WEBHOOK_REPLAY_INTEGRITY`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_BOOKING_OPS_PAYMENT_STATE_LEDGER_PSP_AUTHORITY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_ADMIN_DIRECT_PAYMENT_STATE_LEDGER_PSP_BYPASS`

### `R-05A2`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-092<br>F-114 |
| Owners | Payments/Finance + Patient Mobile + Security/Privacy<br>Payments/Finance + Privacy/Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Patient Mobile wallet-card UI posts fixed test PANs and holder data, marks the default card only in local state, and shows a PCI assertion although the inspected backend card contract exposes only get/add/remove and no authoritative default-instrument transition. Wallet saved-card metadata has no provider-token, PCI minimization, access or retention contract.

**Business/authority boundary.** The client handles only PSP-tokenized, minimum card metadata. Add/default/remove are server-authoritative owner-scoped instrument commands with PSP/provider token provenance, PCI-minimized DTOs, idempotent transitions, retention/access audit and truthful failure state; no raw PAN, hard-coded test card, local default or payment success inference is allowed. Only provider-issued tokenized instruments may be referenced; no PAN-like metadata or local test card is payment authority.

**Frozen exact evidence.** `F-092: nabd_plus_patient_app/app/wallet/cards.tsx:31–117,327–376`<br>`F-114: src/schemas/wallet.schema.ts:21–22 ; src/modules/wallet/wallet.module.ts:12–24`

**Constituent labels.** `CONFIRMED_ROOT_MOBILE_WALLET_INSTRUMENT_FINANCIAL_TRUTH_DEFECT_HARDCODED_TEST_CARD_LOCAL_DEFAULT_TRANSFER_NO_BENEFICIARY_IDEMPOTENCY`<br>`CONFIRMED_ROOT_PAYMENT_INSTRUMENT_BOUNDARY_DEFECT_WALLET_SAVED_CARD_METADATA_NO_PROVIDER_TOKEN_PCI_MINIMIZATION_ACCESS_RETENTION_AUDIT_CONTRACT`

### `R-05B1`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 16 |
| Confirmed raw IDs | F-983<br>F-793<br>F-792<br>F-802<br>F-107<br>F-641<br>F-482<br>F-484<br>F-479<br>F-483<br>F-063<br>F-064<br>F-794<br>F-481<br>F-791<br>F-480 |
| Owners | Finance/Refund Operations<br>Payments/Finance + Returns + Patient Mobile<br>Payments/Finance + Returns + Privacy<br>Finance/Refund Operations + Privacy |
| Derived graph | F-076<br>F-485<br>F-544<br>F-548<br>F-803 |

**Observed constituent causes.** Admin refund policy can bypass canonical refund authority. Patient refund transition lacks canonical PSP/ledger/insurance durable settlement saga. Refund/return commands and UI state lack one server-authoritative, idempotent settlement lifecycle; amount/eligibility/request ID/attachment/output can be client-derived or fabricated. Provider return list performs unconstrained cross-model order-ID fan-out and returns an unbounded raw queue without canonical provider-scope/pagination contract. Return eligibility/result does not persist or reproduce the governing return-policy version and effective time. Admin refund queue lacks minimum projection, cursor bounds and audit. Return reads expose raw request objects across patient/admin/provider contexts instead of role/purpose-specific minimum projections. Return approval/refund execution has insufficient finance-specific authorization, separation-of-duties and immutable decision/audit guarantees.

**Business/authority boundary.** Admin refund actions use canonical policy, settlement ledger, reason/approval/audit and idempotent transition; no shortcut bypass. Refunds are canonical idempotent settlement sagas bound to PSP verification, insurance/ledger reversals, durable outbox and reconciliation. Refund/return is only created and settled from an eligible server-owned order/booking/payment state; amount/currency/policy and reversal are authoritative and auditable. Refund/return is created and settled only from an eligible server-owned order, booking and payment state. Amount, currency, return-policy version, scope and reversal are canonical and auditable; admin/provider/patient queues expose only purpose-authorized minimum projections with bounded cursor/pagination. Attachment lifecycle remains a separate safe-asset root. Refund queues expose minimum purpose-authorized settlement fields with bounded cursor/pagination and immutable access/action audit.

**Frozen exact evidence.** `F-983: src/modules/compat/admin-spa.module.ts:562–605`<br>`F-793: src/modules/patient-ux/patient-ux.module.ts:93–123`<br>`F-792: src/modules/patient-ux/patient-ux.module.ts:75–79`<br>`F-802: src/modules/patient-ux/patient-ux.module.ts:293–310`<br>`F-107: src/modules/payments/payments.module.ts:280–300`<br>`F-641: src/modules/insurance-engine/insurance-engine.module.ts:544–563`<br>`F-482: src/modules/returns/returns.service.ts:123–147`<br>`F-484: src/modules/returns/returns.service.ts:31–36,44–70`<br>`F-479: src/modules/returns/returns.service.ts:156–185`<br>`F-483: src/modules/returns/returns.service.ts:98–103`<br>`F-063: nabd_plus_patient_app/app/returns/detail.tsx:53–74,93–112,152–164`<br>`F-064: nabd_plus_patient_app/app/returns/new-request.tsx:19–48,63–101,172–286`<br>`F-794: src/modules/patient-ux/patient-ux.module.ts:86–91`<br>`F-481: src/modules/returns/returns.service.ts:44–71,105–120,136–143,156–185`<br>`F-791: src/modules/patient-ux/patient-ux.module.ts:69–79`<br>`F-480: src/modules/returns/returns.controller.ts:37–45 ; src/modules/returns/returns.service.ts:156–185`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_FINANCE_REFUND_POLICY_ADMIN_BYPASS`<br>`CONFIRMED_ROOT_CODE_DEFECT_PATIENT_REFUND_PSP_LEDGER_INSURANCE_DURABLE_SAGA`<br>`CONFIRMED_ROOT_CODE_DEFECT_PATIENT_REFUND_UNIQUE_REQUEST_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_REFUND_COLLECTION_SINGLE_SCHEMA_OWNER_MIGRATION_COMPATIBILITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_REFUND_INTEGRITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_REFUND_TRUSTS_CLIENT_FINANCIAL_DATA`<br>`CONFIRMED_ROOT_CODE_DEFECT_RETURN_PAGINATION_PROVIDER_QUERY_SCOPE`<br>`CONFIRMED_ROOT_CODE_DEFECT_RETURN_POLICY_TIME_VERSION_REPRODUCIBILITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_RETURN_REFUND_SAGA_DURABILITY_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_SERVICE_SPECIFIC_REFUNDABLE_AMOUNT_AUTHORITY`<br>`CONFIRMED_ROOT_MOBILE_RETURN_DETAIL_TRUTH_DEFECT_FABRICATED_REFUND_RECORD_ON_ANY_FAILURE`<br>`CONFIRMED_ROOT_MOBILE_RETURN_REQUEST_SERVER_AUTHORITY_DEFECT_LOCAL_REFUND_POLICY_ID_ATTACHMENT_SUCCESS`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_REFUND_QUEUE_MINIMUM_PROJECTION_CURSOR_AUDIT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_RETURN_ROLE_BASED_PROJECTIONS`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_PATIENT_REFUND_CANONICAL_SETTLEMENT_AMOUNT_CURRENCY_CAP`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_RETURN_REFUND_FINANCE_AUTHORIZATION_AUDIT`

### `R-05B2`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 5 |
| Confirmed raw IDs | F-489<br>F-488<br>F-492<br>F-487<br>F-112 |
| Owners | Finance/Payouts + Provider/Admin<br>Finance/Payouts + Provider/Admin + Privacy |
| Derived graph | F-733 |

**Observed constituent causes.** Withdrawal/payout commands lack a coherent schema/state/reservation/idempotency boundary and cannot rely on controller success alone. Payout request and list responses expose raw withdrawal documents containing bank-identifying fields instead of a redacted minimum-necessary projection. Payout lifecycle surface lacks explicit role/separation-of-duties enforcement evidence for execute/reject authority beyond generic JWT authentication. Payout routes rely on authentication but do not establish an explicit provider role/organization entitlement contract for withdrawal operations.

**Business/authority boundary.** Provider payout/withdrawal requires verified owner/bank context, reserved immutable ledger amount, versioned approve/reject/settle/reverse transitions and actor/reason audit. Provider payout/withdrawal requires a verified provider organization and bank context, a reserved immutable ledger amount, explicit versioned approve/reject/settle/reverse transitions, separation of duties and immutable actor/reason audit. Payout request/list responses expose only a purpose-authorized, redacted projection; controller success is never settlement proof.

**Frozen exact evidence.** `F-489: src/modules/payouts/provider-payouts.controller.ts:45–56`<br>`F-488: src/modules/payouts/provider-payouts.controller.ts:80–97,111–114`<br>`F-492: src/modules/payouts/provider-payouts.controller.ts:45–120`<br>`F-487: src/modules/payouts/provider-payouts.controller.ts:9–18,45–120`<br>`F-112: src/modules/admin-web-core/schemas/withdrawal-request.schema.ts:6–27 ; src/modules/admin-web-core/controllers/finance.controller.ts:71–147`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_PAYOUT_IDEMPOTENCY_INDEX_PROVISIONING`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PROVIDER_PAYOUT_BANK_DATA_PROJECTION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_ADMIN_PAYOUT_EXECUTE_REJECT_ROLE_GUARD`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_PROVIDER_PAYOUT_ROLE_ORGANIZATION_SCOPE`<br>`CONFIRMED_ROOT_WITHDRAWAL_FINANCIAL_STATE_MACHINE_SCHEMA_CONTROLLER_VALIDATION_RESERVATION_AUDIT_DEFECT`

### `R-05C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 17 |
| Confirmed raw IDs | F-143<br>F-104<br>F-984<br>F-102<br>F-985<br>F-270<br>F-268<br>F-259<br>F-258<br>F-262<br>F-265<br>F-267<br>F-266<br>F-113<br>F-271<br>F-261<br>F-260 |
| Owners | Finance/Commercial + Loyalty/Referral + Wallet<br>Commercial/Loyalty Platform<br>Commercial/Loyalty Platform + Privacy<br>Finance/Commercial + Wallet Platform |
| Derived graph | F-144<br>F-263<br>F-264<br>F-272 |

**Observed constituent causes.** Loyalty/referral/wallet commercial value changes are not governed by one immutable, atomic event-ledger and attribution lifecycle; balance, reward, expiry, stock and conversion can diverge or replay. Coupon/loyalty logic lacks authoritative provider context and atomic fraud-safe reward/coupon/ledger contract. Coupon policy publication and usage lack atomic commercial ledger/allocation contract. Loyalty reward claim/challenge/tier benefits lack atomic one-time points-stock-claim allocation and server-enforced canonical tier eligibility. Referral flow has schema/collection drift, non-atomic invite attribution, collision-prone/nonunique code assignment and broad related-user/reward dashboard disclosure. Wallet schema stores mutable floating balance/amount without currency, immutable transaction direction/balance invariants, unique business reference/event, atomic repository operation or verified funding/settlement gate; top-up claim can precede ledger credit.

**Business/authority boundary.** Points, rewards, referral conversion and wallet credit/debit are commercial entitlements: each requires a verified qualifying event, bounded policy, unique command/event, atomic ledger transaction, reversal/expiry and reconciliation audit. Coupon and loyalty commands use authoritative provider/eligibility context, bounded policy, unique atomic reward/coupon allocation and canonical commercial ledger/audit/reconciliation. Coupon publication/use is versioned, eligible, atomic and recorded in canonical commercial ledger with audit. Loyalty rewards use canonical commercial ledger policy, atomic idempotent points/stock/claim allocation, one-time challenge completion and server-enforced versioned tier benefit eligibility; UI display is never authority. Referrals use one versioned canonical schema, cryptographically strong unique codes, atomic idempotent inviter/invitee attribution, canonical commercial ledger conversion and minimum redacted reward/dashboard projection with audit. Wallet credit/debit is an immutable double-entry monetary ledger, never a mutable float balance: fixed-precision minor units plus ISO currency, unique owner/reference/event constraints, server-owned qualified funding/settlement proof, atomic idempotent reservation/posting/reversal and reconciliation/audit are mandatory. A top-up claim precedes no credit, and saved payment instruments remain PSP-tokenized under their separate PCI/privacy root.

**Frozen exact evidence.** `F-143: src/modules/nabd-extensions/nabd-extensions.service.ts:125–164`<br>`F-104: src/modules/finance-engine/finance-engine.module.ts:294–333,376–423,438–454`<br>`F-984: src/modules/compat/admin-spa.module.ts:607–651`<br>`F-102: src/modules/finance-engine/finance-engine.module.ts:266–275`<br>`F-985: src/modules/compat/admin-spa.module.ts:653–732`<br>`F-270: src/modules/loyalty/loyalty.service.ts:16–24,62–68`<br>`F-268: src/modules/loyalty/loyalty.service.ts:202–225`<br>`F-259: src/modules/referral/referral.service.ts:90–129`<br>`F-258: src/modules/referral/referral.service.ts:32–34,47–55,115–128 ; src/schemas/referral.schema.ts:7–48`<br>`F-262: src/modules/referral/referral.service.ts:132–148`<br>`F-265: src/modules/loyalty/loyalty.service.ts:76–124`<br>`F-267: src/modules/loyalty/loyalty.service.ts:132–157`<br>`F-266: src/modules/loyalty/loyalty.service.ts:297–332`<br>`F-113: src/schemas/wallet.schema.ts:7–55 ; src/modules/wallet/repositories/wallet.repository.ts:2–13 ; src/modules/wallet/repositories/wallettransaction.repository.ts:2–13 ; src/modules/nabd-extensions/repositories/wallet.repository.ts:2–13 ; src/modules/nabd-extensions/repositories/wallettransaction.repository.ts:2–13`<br>`F-271: src/modules/loyalty/loyalty.service.ts:297–332 ; src/schemas/loyalty.schemas.ts:18–43,58–87`<br>`F-261: src/modules/referral/referral.service.ts:58–87`<br>`F-260: src/modules/referral/referral.service.ts:35–55`

**Constituent labels.** `CONFIRMED_ROOT_CLIENT_FINANCIAL_AUTHORITY_DEFECT_NABD_EXTENSIONS_AUTHENTICATED_RAW_WALLET_CREDIT_DEBIT_NONATOMIC_LEDGER_PATH`<br>`CONFIRMED_ROOT_CODE_DEFECT_COUPON_LOYALTY_FRAUD_ATOMICITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_COUPON_POLICY_PUBLICATION_ATOMIC_USAGE`<br>`CONFIRMED_ROOT_CODE_DEFECT_COUPON_PROVIDER_CONTEXT_AUTHORITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_LOYALTY_LEDGER_ATOMICITY`<br>`CONFIRMED_ROOT_COMMERCIAL_TRUTH_DEFECT_LOYALTY_DISPLAYED_TIER_BENEFITS_NO_SERVER_ENFORCEMENT`<br>`CONFIRMED_ROOT_CONCURRENCY_DEFECT_LOYALTY_CHALLENGE_PROGRESS_COMPLETION_ONE_TIME_AWARD`<br>`CONFIRMED_ROOT_CONCURRENCY_DEFECT_REFERRAL_APPLY_NON_ATOMIC_INVITE_USER_ATTRIBUTION`<br>`CONFIRMED_ROOT_DATA_CONTRACT_DEFECT_REFERRAL_ACTIVE_PERSISTENCE_SCHEMA_COLLECTION_DRIFT`<br>`CONFIRMED_ROOT_FINANCIAL_EVENT_RELIABILITY_DEFECT_REFERRAL_CONVERSION_STATUS_BEFORE_LOYALTY_OUTBOX_SETTLEMENT`<br>`CONFIRMED_ROOT_FINANCIAL_LEDGER_DEFECT_LOYALTY_AWARD_NO_UNIQUE_EVENT_ATOMIC_BALANCE_TRANSACTION`<br>`CONFIRMED_ROOT_FINANCIAL_LEDGER_DEFECT_LOYALTY_EXPIRY_SWEEP_NON_ATOMIC_BALANCE_AUDIT`<br>`CONFIRMED_ROOT_FINANCIAL_LEDGER_DEFECT_LOYALTY_REWARD_CLAIM_NON_ATOMIC_POINTS_STOCK_CLAIM`<br>`CONFIRMED_ROOT_FINANCIAL_LEDGER_DEFECT_WALLET_FLOAT_AMOUNTS_NO_CURRENCY_REFERENCE_UNIQUENESS_ATOMICITY_IMMUTABLE_OWNER_INVARIANTS_TOPUP_CLAIM_PRECEDES_CREDIT`<br>`CONFIRMED_ROOT_FINANCIAL_SECURITY_DEFECT_LOYALTY_WEAK_VALUE_BOUNDS_REWARD_ENUM_STOCK_COUPON_TOKEN_POLICY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_REFERRAL_DASHBOARD_RELATED_USER_NAME_STATUS_REWARD_DISCLOSURE_POLICY`<br>`CONFIRMED_ROOT_SECURITY_DATA_INTEGRITY_DEFECT_REFERRAL_CODE_NONCRYPTO_COLLISION_NONUNIQUE_ASSIGNMENT`

### `R-05D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 17 |
| Confirmed raw IDs | F-1514<br>F-237<br>F-243<br>F-644<br>F-1511<br>F-099<br>F-982<br>F-238<br>F-645<br>F-885<br>F-745<br>F-739<br>F-961<br>F-597<br>F-876<br>F-1516<br>F-103 |
| Owners | Finance/Reporting + Configuration Governance + Privacy<br>Finance/Reporting + Billing Platform<br>Finance/Settlement<br>Finance/Settlement + Admin Authority<br>Finance/Accounting + Reporting<br>Insurance + Finance/Reporting<br>Finance/Reporting + Privacy<br>Finance/Reporting + Analytics<br>Finance/Settlement + Insurance<br>Provider Operations + Finance + Labs |
| Derived graph | F-1515<br>F-1517<br>F-240<br>F-1512<br>F-1513<br>F-497<br>F-649<br>F-654<br>F-879<br>F-884<br>F-890<br>F-955 |

**Observed constituent causes.** Commission resolution silently defaults unknown service types to 10 percent instead of failing closed against canonical effective-dated service policy. E-invoice issue path checks for an existing booking invoice then creates a new invoice without atomic booking/payment uniqueness, idempotency key or duplicate-race reconciliation. E-invoice lifecycle derives/saves fiscal numbers and booking totals without canonical settlement event linkage, reversal/credit-note/refund transitions or durable reconciliation/audit lifecycle. Finance accrual can be calculated outside canonical financial authority/idempotency. Finance commission configuration is initialized/read by separate non-atomic operations without a controlled single-record bootstrap, version/CAS or approved-policy provenance. Financial saga/admin resource paths lack canonical exact-once ledger/reconciliation and typed resource-bound privileged authority. Commercial settlement/invoice/reporting can use non-authoritative amount, currency, period or ledger sources and lacks reconciliation boundary. Insurance admin financial aggregate cannot reproduce settlement scope by tenant/time/currency and risks noncanonical commercial reporting. Provider invoice PDF derives total/commission/VAT from raw order fields and includes patient identity rather than using an issued canonical settlement invoice with purpose-safe projection. Analytics revenue/overview metrics lack canonical settled/refund/insurance/currency/period ledger scope and confidence/provenance. Booking invoice/tax/coverage output lacks canonical ledger and settlement authority. Clinical completion, notification and financial settlement are persisted separately without a durable atomic event boundary. Authenticated commission lookup permits arbitrary provider override lookup without explicit requester/provider/facility tenancy or purpose scope.

**Business/authority boundary.** Commission configuration is a versioned approved commercial policy: one atomic initialized canonical record with typed allowlisted changes, effective dates, maker-checker/actor-reason audit and durable change evidence. All provider/service resolution is fail-closed for unknown scope and uses tenant/purpose-authorized minimum DTOs; derived rates feed canonical settlement/issued invoices only. E-invoices derive only from a canonical settled/reconciled payment and immutable commercial ledger snapshot. Issuance is versioned/idempotent with a booking/payment uniqueness constraint, fiscal number lifecycle, reversal/refund/credit-note linkage, delivery/audit provenance and reconciliation; a PDF or generated QR is not settlement or regulatory compliance proof. Accruals derive from canonical immutable financial events with idempotent posting, explicit period/currency and audit/reconciliation. Financial operations use canonical immutable exact-once ledger and reconciliation lifecycle; privileged finance access is typed resource/tenant/state-scoped with audit and cannot mutate via generic identifiers. Financial reports and invoices derive only from canonical immutable settlement/ledger entries with currency, period, refund/reversal and provenance. Financial aggregate/report derives only from canonical scoped settlement ledger with tenant, period, currency, refund/reversal and reconciliation provenance. Invoices derive solely from canonical immutable settlement/ledger entries with versioned tax/currency/commission/refund provenance; access is tenant/purpose-authorized and documents contain only minimum lawful recipient data. Financial analytics derives only from canonical settled ledger and insurance/refund events with explicit currency/period scope, reproducible aggregation and source confidence/provenance. Invoices/taxes/coverage contributions derive from canonical versioned booking/insurance/payment ledger entries with reproducible currency and audit; no booking-ops local truth is authoritative. A laboratory clinical state transition may settle only through a canonical versioned command and durable outbox/reconciliation; notification is not settlement success.

**Frozen exact evidence.** `F-1514: src/modules/legal/legal.module.ts:147–153,199–203`<br>`F-237: src/modules/billing/billing.module.ts:68–77,90–120`<br>`F-243: src/modules/billing/billing.module.ts:27–43,90–120,123–129`<br>`F-644: src/modules/insurance-engine/insurance-engine.module.ts:129–149`<br>`F-1511: src/modules/legal/legal.module.ts:16–28,41–46`<br>`F-099: src/modules/finance-engine/finance-engine.module.ts:101–104,404–423,549–615,617–637,829–850`<br>`F-982: src/modules/compat/admin-spa.module.ts:527–560`<br>`F-238: src/modules/billing/billing.module.ts:90–103`<br>`F-645: src/modules/insurance-engine/insurance-engine.module.ts:342–356,160–167`<br>`F-885: src/modules/provider-ops/provider-ops.module.ts:329–347`<br>`F-745: src/modules/analytics/analytics.module.ts:70–116`<br>`F-739: src/modules/analytics/analytics.module.ts:28–57`<br>`F-961: src/modules/booking-ops/booking-ops.module.ts:83–103`<br>`F-597: src/modules/hospital/services/hospital.service.ts:189–198`<br>`F-876: src/modules/provider-ops/provider-ops.module.ts:198–224`<br>`F-1516: src/modules/legal/legal.module.ts:199–203`<br>`F-103: src/modules/finance-engine/finance-engine.module.ts:941–970,973–1000`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_COMMISSION_UNKNOWN_SERVICE_FAIL_OPEN`<br>`CONFIRMED_ROOT_CODE_DEFECT_EINVOICE_BOOKING_UNIQUENESS_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_EINVOICE_FISCAL_LIFECYCLE_RECONCILIATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_FINANCE_ACCRUAL_AUTHORITY_AND_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_FINANCE_CONFIG_APPROVED_ATOMIC_INITIALIZATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_FINANCIAL_SAGA_LEDGER_EXACT_ONCE_RECONCILIATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_PLATFORM_FINANCIAL_REPORTING_LEDGER_RECONCILIATION`<br>`CONFIRMED_ROOT_COMMERCIAL_TRUTH_DEFECT_EINVOICE_SETTLED_PAYMENT_AMOUNT_AUTHORITY`<br>`CONFIRMED_ROOT_INSURANCE_ADMIN_FINANCIAL_AGGREGATE_REPRODUCIBILITY_TENANT_TIME_CURRENCY_SCOPE_DEFECT`<br>`CONFIRMED_ROOT_INVOICE_INTEGRITY_PRIVACY_DEFECT_PROVIDER_OPS_RAW_ORDER_TOTAL_COMMISSION_VAT_NOT_CANONICAL_ISSUED_INVOICE_AND_PATIENT_ID_EXPOSURE`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_ANALYTICS_OVERVIEW_PERIOD_CURRENCY_SETTLEMENT_CONFIDENCE_PROVENANCE`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_ANALYTICS_SETTLED_REVENUE_REFUND_CURRENCY_INSURANCE_PERIOD_SCOPE`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_BOOKING_OPS_CANONICAL_INVOICE_TAX_COVERAGE_LEDGER_AUTHORITY`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_HOSPITAL_WALLET_CANONICAL_LEDGER_PERIOD_CURRENCY_REFUND_RECONCILIATION`<br>`CONFIRMED_ROOT_PROVIDER_CLINICAL_FINANCIAL_EVENT_SAGA_DEFECT_LAB_QC_UPDATE_NOTIFY_SETTLEMENT_SEPARATE_WRITES_NO_DURABLE_OUTBOX`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_FINANCE_COMMISSION_OVERRIDE_READER_SCOPE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_FINANCIAL_ADMIN_TYPED_RESOURCE_BOUNDARY`

### `R-05E`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-228 |
| Owners | AI Platform + Finance/Entitlements |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** AI quota usage is recorded best-effort without atomic reservation or durable usage ledger, permitting overuse or inconsistent commercial entitlement accounting.

**Business/authority boundary.** AI feature usage consumes a server-owned bounded entitlement only after an atomic reservation/commit or compensating release; customer-visible quota state is durable and auditable.

**Frozen exact evidence.** `F-228: src/modules/ai/ai-gateway.service.ts:220–234`

**Constituent labels.** `CONFIRMED_ROOT_FINANCIAL_USAGE_INTEGRITY_DEFECT_AI_QUOTA_USAGE_BEST_EFFORT_NO_ATOMIC_RESERVATION_DURABLE_LEDGER`

### `R-05F`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-269 |
| Owners | Loyalty/Finance + Privacy/Security + API Platform |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Loyalty controller serves a global leaderboard without requester identity scope or bounded validated limit, while other loyalty paths fall back to guest; the source does not establish an anonymous/minimum leaderboard projection or that raw user identifiers cannot escape downstream.

**Business/authority boundary.** Loyalty leaderboards use a server-authoritative eligibility period, finite limit and minimum pseudonymous/public projection. Authentication or a global rank endpoint alone does not authorize raw user identity, financial balance, challenge state or referral attribution exposure.

**Frozen exact evidence.** `F-269: src/modules/loyalty/loyalty.controller.ts:21–67`

**Constituent labels.** `CONFIRMED_ROOT_LEADERBOARD_IDENTITY_PROJECTION_DEFECT_LOYALTY_GLOBAL_RAW_USER_IDS_EXPOSED_JWT_GUEST_FALLBACK_NOT_SOURCE_PROVEN_REACHABLE`

### `R-06A1`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 3 |
| Confirmed raw IDs | F-1056<br>F-1051<br>F-1054 |
| Owners | Medication Catalog Governance + Clinical Safety + Localization |
| Derived graph | F-1057<br>F-1053<br>F-1055 |

**Observed constituent causes.** Locale contract accepts an unvalidated internal DB-language value and silently returns raw output for unsupported values instead of a stable negotiated API result. Heuristic Arabic-to-English pattern replacement is used for dosage form, strength, package and category facts when authoritative translation is absent, risking clinical/commercial semantic drift. Requested non-Arabic locale can silently fall back to English heuristic output without explicit resolved-locale/fallback/provenance disclosure.

**Business/authority boundary.** Medication catalog localization is sourced from approved versioned per-locale clinical/commercial catalog fields and coded vocabulary. Dosage form, strength, units and category facts are never heuristic translation truth. The resolved locale/fallback and translation provenance are explicit in a stable DTO; unsupported locales are rejected or negotiated by policy. Publication completeness is a separate product decision.

**Frozen exact evidence.** `F-1056: src/modules/medicines/med-i18n.ts:10–19,162–179`<br>`F-1051: src/modules/medicines/med-i18n.ts:49–108,162–179`<br>`F-1054: src/modules/medicines/med-i18n.ts:156–179`

**Constituent labels.** `CONFIRMED_ROOT_API_CONTRACT_DEFECT_MEDICINES_LOCALE_UNVALIDATED_UNSUPPORTED_SILENT_RAW_OUTPUT`<br>`CONFIRMED_ROOT_CLINICAL_TRUTH_DEFECT_MEDICINES_HEURISTIC_TRANSLATION_OF_DOSAGE_CATEGORY_STRENGTH`<br>`CONFIRMED_ROOT_USER_TRUTH_DEFECT_MEDICINES_REQUESTED_LOCALE_HIDDEN_ENGLISH_FALLBACK`

### `R-06A2`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-3778 |
| Owners | Medication Catalog Governance + Clinical Safety |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Public medicine recommendation endpoint exposes related medicines without a governed clinical/commercial recommendation purpose, eligibility, contraindication/interaction safety boundary, provenance or minimum disclaimer contract.

**Business/authority boundary.** Medication recommendations are server-governed discovery—not treatment advice: source records are verified current catalog facts, recommendation purpose/algorithm/version/provenance and eligibility are explicit, sensitive clinical claims/contraindications are fail-closed or clinician-reviewed, and output is minimum safe DTO with no patient-specific clinical inference.

**Frozen exact evidence.** `F-3778: src/modules/seo-search/seo-search.module.ts:177–225`

**Constituent labels.** `CONFIRMED_ROOT_CLINICAL_SAFETY_DEFECT_MEDICINE_RECOMMENDATION_GOVERNANCE`

### `R-06C1`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 15 |
| Confirmed raw IDs | F-782<br>F-785<br>F-783<br>F-820<br>F-781<br>F-786<br>F-777<br>F-779<br>F-780<br>F-776<br>F-109<br>F-160<br>F-086<br>F-024<br>F-789 |
| Owners | Pharmacy Cart/Offer/Order Saga + Clinical/Insurance Dependencies<br>Pharmacy Marketplace + Admin Authority<br>Pharmacy + Commerce/Booking + Payments<br>Pharmacy Workflow + Health Reminders<br>Pharmacy Workflow + Patient Mobile + Clinical/Media Safety<br>Patient Web + Pharmacy Workflow + Payments/Insurance |
| Derived graph | F-025<br>F-048<br>F-053<br>F-057<br>F-058<br>F-085<br>F-2442<br>F-2553<br>F-055 |

**Observed constituent causes.** Pharmacy cart lacks explicit capability gates for payment/insurance/prescription paths, prescription/manual medicine review gate and safe minimum cart metadata projection. Admin pharmacy reassignment bypasses offer eligibility/selection contract. Cart, quote, offer selection and order creation lack one server-authoritative, versioned commercial command saga; legacy cart fields/summary/mutations may override canonical policy. Health reminder refill reserves a non-expiring lock then creates/tags a pharmacy order and reminder state in separate operations without a single idempotent canonical order/offer saga, compensation or recovery reconciliation. Patient Mobile drug-not-found treats a shortage lookup as an actual pharmacy request: it sends generic_name to a lookup endpoint that reads drugName and returns flags, sets success even on an error, renders only a local image flag, and never creates an owner-scoped request, asset or status lifecycle. Patient Web medicine catalog only lists/link-drills items and cart only reads totals; neither exposes contract-backed cart mutation nor the pharmacy broadcast, provider-offer, one-offer selection, quote/payment/COD/insurance-decision continuation journey.

**Business/authority boundary.** Pharmacy cart requests are non-authoritative intents; checkout is permitted only after explicit service/payment/insurance/prescription/manual-review eligibility, authoritative pharmacy offer/price/stock confirmation and minimum redacted metadata projection. Pharmacy reassignment preserves authoritative offer eligibility, selected provider, price/stock and patient decision/consent, with explicit approved exception and audit. Pharmacy flow is request broadcast → eligible pharmacy offers → patient selection → server quote/stock validation → explicit cash/card/COD or insurance decision/co-pay; client fields never set price/availability/payment truth. Every refill request becomes a server-authoritative pharmacy intent within the canonical cart/quote/offer/order lifecycle: a bounded expiring idempotent reservation, atomic outbox/reconciliation and explicit fulfillment-pending state link reminder to order; no refill implies dispense, price, stock or payment truth. A manual pharmacy need is a server-authoritative patient request with validated medicine/Rx context, quantity, safe-asset provenance where applicable, owner-scoped request ID and explicit pending/offer/decline/timeout outcome. It must enter the same eligible-pharmacy broadcast → offer → patient selection → authoritative quote/payment or insurance-decision/co-pay pathway; a lookup, alert or local success state is not submission. Patient Web pharmacy uses only backend-authoritative catalog/cart APIs and presents the full contract-backed journey: add/remove cart command; submit broadcast request; receive bounded provider offers; select exactly one offer; display server quote/availability/substitution; then Cash/Card payment or explicit COD policy; insurance waits for provider decision and co-pay before confirmation. UI never owns clinical, price, stock, coverage, payment or fulfillment truth.

**Frozen exact evidence.** `F-782: src/modules/cart/cart.module.ts:167–174,195–202`<br>`F-785: src/modules/cart/cart.module.ts:120–124,190–197`<br>`F-783: src/modules/cart/cart.module.ts:176–197`<br>`F-820: src/modules/admin-authority/admin-authority.module.ts:73–83`<br>`F-781: src/modules/cart/cart.module.ts:190–202`<br>`F-786: src/modules/cart/cart.module.ts:216–222`<br>`F-777: src/modules/cart/cart.module.ts:62–75`<br>`F-779: src/modules/cart/cart.module.ts:206–226`<br>`F-780: src/modules/cart/cart.module.ts:127–137,220–222`<br>`F-776: src/modules/cart/cart.module.ts:77–102`<br>`F-109: src/modules/pharmacy_ops/pharmacy_ops.service.ts:149–171 ; src/modules/pharmacy_ops/pharmacy_ops.controller.ts:62–67`<br>`F-160: src/modules/health/health.service.ts:476–557 ; src/schemas/health.schema.ts:48–53`<br>`F-086: nabd_plus_patient_app/app/pharmacy/drug-not-found.tsx:15–50,52–64,88–120,122–143`<br>`F-024: nabd-patient-web/app/[locale]/medicine-catalog/page.tsx:19–29,32–44 ; nabd-patient-web/app/[locale]/cart/page.tsx:14–33`<br>`F-789: src/modules/cart/cart.module.ts:23–36,62–75`

**Constituent labels.** `CONFIRMED_ROOT_BUSINESS_CAPABILITY_GAP_CART_CARD_INSURANCE_PRESCRIPTION`<br>`CONFIRMED_ROOT_BUSINESS_CONTRACT_DEFECT_MANUAL_MEDICINE_REVIEW_GATE`<br>`CONFIRMED_ROOT_BUSINESS_CONTRACT_DEFECT_PHARMACY_PRESCRIPTION_AND_MANUAL_ITEM_GATE`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_PHARMACY_REASSIGN_OFFER_ELIGIBILITY_BYPASS`<br>`CONFIRMED_ROOT_CODE_DEFECT_CART_CHECKOUT_ORDER_CART_SAGA`<br>`CONFIRMED_ROOT_CODE_DEFECT_CART_LEGACY_CONTRACT_POLICY_BYPASS`<br>`CONFIRMED_ROOT_CODE_DEFECT_CART_NONAUTHORITATIVE_SUMMARY_PRICING`<br>`CONFIRMED_ROOT_CODE_DEFECT_LEGACY_CART_MUTATION_IDEMPOTENCY_DRIFT`<br>`CONFIRMED_ROOT_CODE_DEFECT_LEGACY_CART_MUTATION_VALIDATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_LEGACY_CART_TRUSTS_CLIENT_COMMERCIAL_FIELDS`<br>`CONFIRMED_ROOT_CODE_DEFECT_PHARMACY_QUOTE_AUTHORITY`<br>`CONFIRMED_ROOT_CROSS_MODULE_SAGA_DEFECT_HEALTH_REFILL_LOCK_NO_EXPIRY_RECOVERY_ORDER_TAG_REMINDER_LINK_NO_ATOMIC_COMPENSATION`<br>`CONFIRMED_ROOT_MOBILE_PHARMACY_DRUG_NOT_FOUND_REQUEST_TRUTH_DEFECT_FABRICATED_UPLOAD_SUCCESS_NO_OWNER_SCOPED_REQUEST_ID_LIFECYCLE`<br>`CONFIRMED_ROOT_PATIENT_WEB_PHARMACY_COMMERCE_CONTINUATION_DEFECT_NO_CONTRACT_BACKED_CART_MUTATION_OFFER_PAYMENT_CHECKOUT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_CART_RAW_METADATA_PROJECTION`

### `R-06C2`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 4 |
| Confirmed raw IDs | F-948<br>F-110<br>F-927<br>F-953 |
| Owners | Pharmacy + Inventory/Provider Operations<br>Pharmacy Inventory/Catalog |
| Derived graph | F-992 |

**Observed constituent causes.** Pharmacy inventory, shortage, broadcast and parallel order allocation are not protected by a canonical tenant-scoped atomic reservation/reconciliation boundary. Provider drug index lacks provider/facility scope contract.

**Business/authority boundary.** Only eligible pharmacy inventory may support an offer; selection/order allocation must reserve scoped stock atomically, reconcile expiry/failure and retain auditable shortage/substitution truth. Medication indexes are provider/facility/role scoped, use authoritative catalog/stock boundaries and return minimum permitted fields.

**Frozen exact evidence.** `F-948: src/modules/compat/compat.module.ts:650–714`<br>`F-110: src/modules/pharmacy_ops/pharmacy_ops.service.ts:83–105,118–147,174–232 ; src/modules/pharmacy_ops/pharmacy_ops.controller.ts:50–75`<br>`F-927: src/modules/legacy/legacy.module.ts:14–21,55–78`<br>`F-953: src/modules/compat/compat.module.ts:923–1024`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_PHARMACY_INVENTORY_TENANCY_SHORTAGE_DURABILITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_PHARMACY_MUTATION_CONCURRENCY`<br>`CONFIRMED_ROOT_DATA_INTEGRITY_DEFECT_PHARMACY_PARALLEL_ORDERS_ALLOCATIONS_BROADCASTS_PERSISTENCE_SURFACES`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_PROVIDER_DRUG_INDEX_SCOPE_CONTRACT`

### `R-06D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-943<br>F-1495 |
| Owners | Pharmacy/Clinical Safety<br>Medication/Clinical Safety |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Drug interaction response can give false clinical assurance. Prescription medicine dose/duration lacks validated clinical provenance.

**Business/authority boundary.** Medication interaction support uses authoritative versioned source/rule provenance, bounded indication and explicit unavailable/uncertain outcome; it never fabricates safety assurance. Medication prescriptions require authorized prescriber, typed dose/duration/unit validation, versioned medication/protocol provenance and explicit unavailable/uncertain clinical decision state.

**Frozen exact evidence.** `F-943: src/modules/compat/compat.module.ts:446–475`<br>`F-1495: src/modules/doctors/doctors.schemas.ts:96–99`

**Constituent labels.** `CONFIRMED_ROOT_CLINICAL_SAFETY_DEFECT_DRUG_INTERACTION_FALSE_ASSURANCE`<br>`CONFIRMED_ROOT_CLINICAL_SAFETY_DEFECT_PRESCRIPTION_MEDICINE_DOSE_DURATION_VALIDATED_PROVENANCE`

### `R-06E`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 4 |
| Confirmed raw IDs | F-230<br>F-233<br>F-234<br>F-041 |
| Owners | Prescription/Clinical Safety + Pharmacy Workflow<br>Patient Mobile + Prescription/Clinical Safety + Pharmacy Workflow |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Prescription intake/assignment/transition lacks quarantined typed provenance, eligible pharmacy assignment with CAS/idempotency, and atomic state/event outbox. Patient Mobile prescription screen renders local prescription/OCR/purchased fields, routes “order” only to pharmacy without prescription/order binding, and uses unrestricted device share of prescription details; it has no backend error/status/provenance/consent lifecycle.

**Business/authority boundary.** Prescriptions enter through authorized typed quarantined intake with source/provenance/scan status; pharmacy assignment requires verified eligible scope and versioned CAS/idempotency; state transition is canonical with atomic durable outbox/reconciliation. Patient mobile prescription views use a verified server-authoritative prescription DTO with clinician/encounter/source/provenance, scan/OCR confidence and review status, expiry and patient scope. Pharmacy ordering invokes a typed canonical order command bound to an eligible active prescription and follows the pharmacy broadcast→offer→selection/payment or insurance-decision flow. PHI sharing is a separate explicit consented, minimum-data, auditable capability; display badge, local share sheet, route navigation or OCR accuracy text never proves prescription, order, purchase or clinical truth.

**Frozen exact evidence.** `F-230: src/modules/prescriptions/prescriptions.service.ts:154–203`<br>`F-233: src/modules/prescriptions/prescriptions.service.ts:230–242`<br>`F-234: src/modules/prescriptions/prescriptions.service.ts:205–227,244–263`<br>`F-041: nabd_plus_patient_app/app/health/prescriptions.tsx:16–35,47–97`

**Constituent labels.** `CONFIRMED_ROOT_CLINICAL_PRIVACY_DEFECT_PATIENT_PRESCRIPTION_UPLOAD_PROVENANCE_QUARANTINE_TYPED_INTAKE`<br>`CONFIRMED_ROOT_CLINICAL_WORKFLOW_DEFECT_PRESCRIPTION_CLIENT_PHARMACY_ASSIGNMENT_NO_ELIGIBILITY_CAS_IDEMPOTENCY`<br>`CONFIRMED_ROOT_EVENT_RELIABILITY_DEFECT_PRESCRIPTION_TRANSITION_SAVE_EVENT_NON_ATOMIC_NO_OUTBOX`<br>`CONFIRMED_ROOT_MOBILE_PRESCRIPTION_PHI_ERROR_ORDER_BINDING_OCR_PROVENANCE_DEFECT`

### `R-07A1`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-207<br>F-205 |
| Owners | Medical Profile + Clinical Privacy |
| Derived graph | F-037 |

**Observed constituent causes.** Medical profile accepts untyped broad list mutations and read-modify-save updates without bounded schema, minimum necessary fields or CAS/idempotency.

**Business/authority boundary.** Medical profile changes are owner/purpose authorized typed commands with bounded values, version/CAS/idempotency, audit and minimized projection.

**Frozen exact evidence.** `F-207: src/modules/medical-profile/medical-profile.service.ts:40–57`<br>`F-205: src/schemas/medical-profile.schema.ts:31–50 ; src/modules/medical-profile/medical-profile.service.ts:23–29,40–47`

**Constituent labels.** `CONFIRMED_ROOT_CONCURRENCY_TRUTH_DEFECT_MEDICAL_PROFILE_LIST_READ_MODIFY_SAVE_ARBITRARY_ITEM_MISSING_REMOVE_SUCCESS_NO_CAS_IDEMPOTENCY`<br>`CONFIRMED_ROOT_PHI_DATA_CONTRACT_DEFECT_MEDICAL_PROFILE_RAW_UNTYPED_EMBEDDED_LISTS_UPDATE_BODY_NO_BOUND_FORMAT_MINIMIZATION`

### `R-07A2`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-208<br>F-072 |
| Owners | Clinical Platform + Identity/Privacy + Patient Mobile |
| Derived graph | F-145 |

**Observed constituent causes.** Health passport/QR credential lacks recipient audience, one-time/TTL/revocation/use audit and client consent truth.

**Business/authority boundary.** A health passport is a consented, recipient-scoped, short-lived/revocable artifact with verified issuance/use audit; QR does not disclose PHI by bearer JWT alone.

**Frozen exact evidence.** `F-208: src/modules/medical-profile/medical-profile.controller.ts:14–18 ; src/schemas/medical-profile.schema.ts:52–56`<br>`F-072: nabd_plus_patient_app/app/reports/passport.tsx:37–54,72–123,126–273`

**Constituent labels.** `CONFIRMED_ROOT_CREDENTIAL_PHI_DISCLOSURE_DEFECT_MEDICAL_HEALTH_PASSPORT_JWT_NO_RECIPIENT_AUDIENCE_ONE_TIME_REVOCATION_ISSUANCE_USE_AUDIT`<br>`CONFIRMED_ROOT_MOBILE_HEALTH_PASSPORT_PHI_QR_TRUTH_DEFECT_NO_CONSENT_AUDIENCE_TTL_REVOCATION_AUDIT`

### `R-07A3`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 5 |
| Confirmed raw IDs | F-304<br>F-300<br>F-940<br>F-301<br>F-302 |
| Owners | Clinical Records + Workflow Platform<br>Medical Reports + Clinical Privacy<br>Clinical Records + Privacy |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Medical report create persists report state and emits an in-process event separately, without idempotency key, encounter transition CAS, atomic outbox or reconciliation. Medical reports lack encounter/provider/patient authority and least-data report/attachment projection/lifecycle. Medical report reads return broad report records with patient/admin distinction only, without role/purpose-specific minimum PHI projection, sensitive-read audit or bounded search policy.

**Business/authority boundary.** Medical reports bind a verified encounter/provider/patient authority and least-data versioned report/attachment projection. Every write uses typed encounter-authorized version/CAS/idempotency, immutable provenance and durable outbox/reconciliation. Report access and mutation require verified encounter/provider/patient relationship and purpose; output is minimized/audited and report attachments use approved safe assets. Medical reports bind a verified encounter/provider/patient authority and least-data versioned report/attachment projection. Every read is purpose/role-scoped, minimum necessary and audit-provenanced; sharing uses a separate consented capability.

**Frozen exact evidence.** `F-304: src/modules/medical-reports/medical-reports.service.ts:32–60`<br>`F-300: src/modules/medical-reports/medical-reports.service.ts:32–57`<br>`F-940: src/modules/compat/compat.module.ts:341–368`<br>`F-301: src/modules/medical-reports/medical-reports.service.ts:36–56`<br>`F-302: src/modules/medical-reports/medical-reports.service.ts:24–30`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_MEDICAL_REPORT_ENCOUNTER_IDEMPOTENCY_OUTBOX`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_MEDICAL_REPORT_ENCOUNTER_PROVIDER_PATIENT_AUTHORITY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_MEDICAL_REPORT_LEAST_DATA_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_MEDICAL_REPORT_PHI_ATTACHMENT_CONTENT_LIFECYCLE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_MEDICAL_REPORT_ROLE_PROJECTION_READ_AUDIT`

### `R-07A4`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-161<br>F-936 |
| Owners | Clinical Data Platform + Patient Mobile/Devices<br>Clinical Platform + Device/Privacy |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** SleepReading accepts raw unbounded score and duration, defaults its source to device without a verifiable device/measurement provenance, and has no explicit source-time validity contract. Wearable clinical data has no trustworthy source/provenance contract.

**Business/authority boundary.** Clinical readings use typed, bounded values, unit/time-zone and source-time validation, with device/clinician/self-report provenance sufficient for their displayed purpose. A source label or client field alone is not diagnostic, adherence or treatment truth. Wearable data is labeled by source/device/time/quality/consent and cannot become clinical truth or recommendation without validation and audit.

**Frozen exact evidence.** `F-161: src/schemas/health.schema.ts:58–68`<br>`F-936: src/modules/compat/compat.module.ts:122–172`

**Constituent labels.** `CONFIRMED_ROOT_CLINICAL_INPUT_DEFECT_HEALTH_SLEEP_RAW_UNBOUNDED_SCORE_DURATION_SOURCE_DATE_PERSISTENCE`<br>`CONFIRMED_ROOT_CODE_DEFECT_WEARABLE_CLINICAL_DATA_PROVENANCE`

### `R-07A5`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-938<br>F-901 |
| Owners | Clinical Records + Privacy |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Maternity/vaccine records lack authoritative subject ownership and clinical provenance. Clinical note lacks assigned clinician/schema version/audit provenance.

**Business/authority boundary.** Longitudinal clinical records bind an authorized subject and authoritative clinical source, retain provenance/version/audit and expose minimum purpose-scoped projections. Clinical notes bind an assigned authorized clinician, versioned schema/provenance, minimum purpose projection and immutable audit.

**Frozen exact evidence.** `F-938: src/modules/compat/compat.module.ts:198–234`<br>`F-901: src/modules/doctors/doctors.module.ts:198–212,264`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_MATERNITY_VACCINE_RECORD_OWNERSHIP_PROVENANCE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_CLINICAL_NOTE_ASSIGNED_CLINICIAN_SCHEMA_VERSION_AUDIT`

### `R-07A6`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-874 |
| Owners | Clinical Data Governance + Provider Operations |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Provider-authored prescription templates and saved diagnoses accept raw nested content and unescaped regex search without typed clinical vocabulary/version, bounds, provenance or safe projection contract.

**Business/authority boundary.** Provider-authored clinical templates and diagnoses are typed/versioned, bounded and clinician-scoped; content has clinical provenance and allowed vocabulary, search is escaped/resource-bounded, and read/write DTOs are minimum necessary with audit.

**Frozen exact evidence.** `F-874: src/modules/provider-ops/provider-ops.module.ts:83–111`

**Constituent labels.** `CONFIRMED_ROOT_PROVIDER_CLINICAL_INPUT_DEFECT_TEMPLATE_DIAGNOSIS_RAW_NESTED_CONTENT_UNESCAPED_REGEX_SEARCH`

### `R-07A7`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-551<br>F-552 |
| Owners | Clinical Referrals + Diagnostic Integration + Privacy |
| Derived graph | F-553 |

**Observed constituent causes.** Diagnostic callback accepts raw appointment ID/file URLs with no signed sender/service identity, referral/appointment state linkage, safe asset provenance, replay/idempotency or durable notification outcome. Doctor referral/prescription issuance trusts raw doctor, patient and appointment identifiers after ownership lookup without verified clinical role/credential/encounter linkage, typed request bounds, idempotency, audit or truthful alert/outbox claim.

**Business/authority boundary.** Clinical referral issuance verifies the active clinician role/credential, appointment and patient encounter relationship, typed bounded requested services/clinical input, version/CAS idempotency and immutable clinician/actor/reason audit. Diagnostic return uses an authenticated authorized sender/capability bound to the referral and encounter, approved safe asset references with provenance, idempotent status transition/outbox/reconciliation and purpose-scoped PHI notification; no callback or URL is delivery or clinical-result truth by itself.

**Frozen exact evidence.** `F-551: src/modules/care/doctor-referrals.controller.ts:94–114`<br>`F-552: src/modules/care/doctor-referrals.controller.ts:66–91`

**Constituent labels.** `CONFIRMED_ROOT_AUTHENTICATED_UNVERIFIED_DIAGNOSTIC_CALLBACK_DEFECT_JWT_ONLY_RAW_URL_APPOINTMENT_NO_SIGNED_SENDER_LINKAGE_IDEMPOTENCY`<br>`CONFIRMED_ROOT_DOCTOR_REFERRAL_ISSUANCE_AUTHORIZATION_TRUTH_DEFECT_NO_ROLE_CREDENTIAL_APPOINTMENT_PATIENT_LINKAGE_TYPED_REPLAY_ALERT_CLAIM`

### `R-07B1`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 3 |
| Confirmed raw IDs | F-212<br>F-215<br>F-211 |
| Owners | Media Platform + Security/Privacy |
| Derived graph | F-084<br>F-968<br>F-970 |

**Observed constituent causes.** Media upload creates/trusts an asset before content validation, completion, scan, hash, idempotency and durable cleanup/reconciliation are established.

**Business/authority boundary.** Every asset has a server-issued scoped intent; upload completes only after size/type/magic/scan/hash validation, then a durable asset record/outbox; failed/replayed uploads are reconciled and retained/deleted by policy.

**Frozen exact evidence.** `F-212: src/modules/media/media.controller.ts:53–71 ; src/modules/media/media.schema.ts:8–18`<br>`F-215: src/modules/media/media.controller.ts:39–50,65–70,163–171`<br>`F-211: src/modules/media/media.controller.ts:19–40,53–65 ; src/modules/media/media.service.ts:39–51`

**Constituent labels.** `CONFIRMED_ROOT_MEDIA_LIFECYCLE_DEFECT_PRESIGNED_ASSET_RECORD_BEFORE_UPLOAD_COMPLETION_HASH_SCAN_RECONCILIATION`<br>`CONFIRMED_ROOT_MEDIA_RELIABILITY_DEFECT_NO_IDEMPOTENCY_REPLAY_DURABLE_CLEANUP_OUTBOX_COMPENSATION`<br>`CONFIRMED_ROOT_MEDIA_SAFETY_DEFECT_CLIENT_FILENAME_MIME_TRUST_NO_MAGIC_BYTE_SCAN_QUARANTINE_PURPOSE_POLICY`

### `R-07B2`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 3 |
| Confirmed raw IDs | F-601<br>F-486<br>F-188 |
| Owners | Support + Returns + Custom Services + Media Platform |
| Derived graph | F-232<br>F-605<br>F-566 |

**Observed constituent causes.** Support/return/custom-service attachment paths accept raw PII/clinical media without a typed safe-asset reference, ownership/purpose and idempotent lifecycle.

**Business/authority boundary.** Attachment-bearing domain commands reference approved scoped media assets only; patient/provider/operation purpose is checked, content is minimized/audited and lifecycle follows retention policy.

**Frozen exact evidence.** `F-601: src/modules/custom-services/custom-services.service.ts:15–34`<br>`F-486: src/modules/returns/returns.service.ts:73–120,156–163`<br>`F-188: src/modules/support/support.service.ts:17–54 ; src/schemas/support.schema.ts:21–38`

**Constituent labels.** `CONFIRMED_ROOT_PHI_CLINICAL_MEDIA_INTAKE_DEFECT_CUSTOM_SERVICES_RAW_PATIENT_DOCTOR_PRESCRIPTION_ATTACHMENT_NO_TYPED_SAFE_ASSET_LIFECYCLE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_RETURN_DOCUMENT_CONTENT_GOVERNANCE`<br>`CONFIRMED_ROOT_SUPPORT_DATA_CONTRACT_DEFECT_RAW_TICKET_ATTACHMENT_THREAD_PII_NO_SAFE_MEDIA_BOUND_IDEMPOTENT_APPEND`

### `R-07B3`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 3 |
| Confirmed raw IDs | F-621<br>F-620<br>F-619 |
| Owners | Provider Onboarding + Legal/Privacy + Media Platform |
| Derived graph | F-626 |

**Observed constituent causes.** Provider contract PDF flow fetches arbitrary external URL/inline PII base64 and hashes nonfinal bytes, lacking safe private artifact/version/provenance lifecycle.

**Business/authority boundary.** Provider contract artifact uses approved source/size/type/network policy, private object reference, final-byte digest, version/evidence/retention and signed acceptance/review lifecycle.

**Frozen exact evidence.** `F-621: src/modules/provider-onboarding/contract-pdf.service.ts:211–221`<br>`F-620: src/modules/provider-onboarding/contract-pdf.service.ts:155–166,211–217`<br>`F-619: src/modules/provider-onboarding/contract-pdf.service.ts:79–121`

**Constituent labels.** `CONFIRMED_ROOT_DOCUMENT_INTEGRITY_DEFECT_CONTRACT_HASH_PRE_FINAL_BYTES_SALTED_TRUNCATED_NOT_FULL_FINALIZED_PDF_DIGEST`<br>`CONFIRMED_ROOT_PROVIDER_PII_DOCUMENT_BOUNDARY_DEFECT_CONTRACT_INLINE_BASE64_STORAGE_RESPONSE_NO_PRIVATE_OBJECT_REFERENCE_NO_STORE_RETENTION_MINIMAL_PROJECTION`<br>`CONFIRMED_ROOT_SSRF_MEDIA_BOUNDARY_DEFECT_PROVIDER_CONTRACT_SIGNATURE_ARBITRARY_HTTP_STORAGE_EXTERNAL_URL_FETCH_NO_ALLOWLIST_TIMEOUT_SIZE_CONTENT_GUARD`

### `R-07B4`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-213 |
| Owners | Clinical Media + Chat/Realtime + Privacy/Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Chat-media download/upload authorization checks only thread participation plus coarse family or consultation state and emits a presigned asset URL, without a consent/purpose decision, read/download audit, minimum projection or scoped recipient lifecycle.

**Business/authority boundary.** Chat media access requires verified current participant relationship plus explicit purpose/consent where applicable, minimum metadata projection, short-lived audience-bound access, immutable read/download audit, revocation and retention controls. Thread membership or asset ownership alone does not establish durable consent to PHI disclosure.

**Frozen exact evidence.** `F-213: src/modules/media/media.controller.ts:73–155`

**Constituent labels.** `CONFIRMED_ROOT_PHI_MEDIA_AUTHORIZATION_DEFECT_THREAD_PARTICIPANT_NO_CONSENT_ACCESS_AUDIT_MINIMUM_PROJECTION_CONTRACT`

### `R-07C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 14 |
| Confirmed raw IDs | F-431<br>F-417<br>F-422<br>F-429<br>F-163<br>F-424<br>F-420<br>F-432<br>F-418<br>F-423<br>F-419<br>F-430<br>F-159<br>F-433 |
| Owners | Patient Health Profile + Privacy<br>Patient Health Profile + Privacy + Wellbeing<br>Clinical Data Platform + Privacy<br>Patient Health Profile + Workflow Platform |
| Derived graph | F-427 |

**Observed constituent causes.** Nutrition profile/log commands lack idempotency/replay/audit, expose broad allergy/restriction/measurement data and unbounded history, use inefficient unbounded daily reads and present user-entered macro/exercise values without self-reported provenance. Mental-health log/contact mutations create raw records without idempotency/replay key, activity/audit event, versioned lifecycle or deduplication. Maternity embedded event-log mutations use read-modify-save without idempotency, version/CAS or atomic replay-safe event contract. Emergency-contact primary designation clears existing primary flags and appends/rewrites embedded contacts in separate non-CAS writes without cardinality, idempotency, privacy/audit or concurrency protection. Maternity profile GET performs a hidden current-week persistence write, violating side-effect-free read semantics. Meditation dashboard loads all historical sessions into process memory and computes aggregates alongside multiple dashboard queries without bounded aggregation/window consistency contract. Mood history returns sensitive notes/tags/full records without minimum projection, pagination/cursor, bounded window or explicit availability/retention behavior. Maternity operations return the complete persisted reproductive/infant profile rather than a minimum-necessary purpose-scoped projection. Mental-health create/contact methods return persisted full documents, exposing fields beyond purpose-specific minimum DTO and audit/projection policy. Health controller omits RequireIdempotency on active refill, refill snooze/cancel, sleep create and emergency-contact create/delete mutations, permitting replay and duplicate patient-state or downstream order effects.

**Business/authority boundary.** Nutrition data uses authorized typed idempotent profile/log commands with audit; data is minimum purpose-scoped projection, history is time-zone declared and bounded, summaries use bounded aggregate computation, and user-entered nutrition/exercise values are explicitly self-reported rather than clinical truth. Sensitive wellbeing data uses patient-owned typed bounded idempotent commands with replay/actor activity audit; mood, notes, tags and crisis contacts are purpose/consent-scoped minimum projections with pagination/cursor and retention policy. Aggregates use bounded database-side or precomputed windows with explicit self-reported provenance and never infer diagnosis, risk, availability or clinical action. Sensitive health tracking is a purpose-scoped clinical read model: write commands have stable event IDs, idempotency/CAS and audit provenance; reads are side-effect free and return a minimum-necessary versioned projection with explicit self-reported/estimate provenance. It is not diagnostic, medical-advice or reproductive-care authority. Sensitive patient profile commands use typed bounded minimum data, owner/consent scope, stable command ID and version/CAS atomic transitions; emergency contacts enforce one-primary/cardinality rules with immutable audit and purpose-limited projection. Every patient health state-changing endpoint requires a server-enforced idempotency/replay contract and typed scoped command. Reminder refill/snooze/cancel, sleep and emergency-contact changes use command identity, version/CAS, authoritative outcome/audit and bounded retry semantics; refill delegates to the separate canonical pharmacy-order saga and never proves dispense, stock, price, payment or clinical outcome.

**Frozen exact evidence.** `F-431: src/modules/nutrition/nutrition.service.ts:29–35,134–142,155–163,181–188`<br>`F-417: src/modules/mental-health/mental-health.controller.ts:20–25,40–44,58–62,78–82 ; src/modules/mental-health/mental-health.service.ts:105–111,145–164,180–197,213–231`<br>`F-422: src/modules/maternity/maternity.service.ts:92–154`<br>`F-429: src/modules/nutrition/nutrition.controller.ts:27–30,33–37,53–58,66–70 ; src/modules/nutrition/nutrition.service.ts:75–109,114–131,146–152,167–179`<br>`F-163: src/modules/health/health.service.ts:687–730 ; src/schemas/health.schema.ts:24–29`<br>`F-424: src/modules/maternity/maternity.service.ts:46–50`<br>`F-420: src/modules/mental-health/mental-health.service.ts:172–177,242–250`<br>`F-432: src/modules/nutrition/nutrition.service.ts:242–281`<br>`F-418: src/modules/mental-health/mental-health.controller.ts:27–32 ; src/modules/mental-health/mental-health.service.ts:114–122`<br>`F-423: src/modules/maternity/maternity.service.ts:51–53,92–116,118–126,129–154`<br>`F-419: src/modules/mental-health/mental-health.service.ts:105–111,157–164,190–197,207–210,224–231`<br>`F-430: src/modules/nutrition/nutrition.service.ts:69–73,103–110,114–131,146–153,167–179`<br>`F-159: src/modules/health/health.controller.ts:50–93, 111–123`<br>`F-433: src/modules/nutrition/nutrition.service.ts:114–130,167–177,204–219`

**Constituent labels.** `CONFIRMED_ROOT_AVAILABILITY_DATA_CONTRACT_DEFECT_NUTRITION_UNBOUNDED_HISTORY_NO_PROJECTION_TIMEZONE_UNDECLARED`<br>`CONFIRMED_ROOT_CONCURRENCY_AUDIT_DEFECT_MENTAL_HEALTH_LOG_CONTACT_MUTATION_NO_IDEMPOTENCY_REPLAY_ACTIVITY_AUDIT`<br>`CONFIRMED_ROOT_CONCURRENCY_DEFECT_MATERNITY_EMBEDDED_LOG_MUTATION_NO_IDEMPOTENCY_VERSION_ATOMIC_CONTRACT`<br>`CONFIRMED_ROOT_CONCURRENCY_DEFECT_NUTRITION_PROFILE_LOG_RAW_CREATE_NO_IDEMPOTENCY_REPLAY_DEDUPE_AUDIT_COMMAND`<br>`CONFIRMED_ROOT_CONCURRENCY_PRIVACY_DEFECT_EMERGENCY_CONTACT_PRIMARY_TWO_WRITE_NO_CAS_CARDINALITY_IDEMPOTENCY`<br>`CONFIRMED_ROOT_HTTP_SEMANTICS_DEFECT_MATERNITY_GET_PROFILE_HIDDEN_CURRENT_WEEK_PERSISTENCE_WRITE`<br>`CONFIRMED_ROOT_PERFORMANCE_CONSISTENCY_DEFECT_MENTAL_HEALTH_MEDITATION_STATS_UNBOUNDED_ALL_RECORDS_DASHBOARD_MULTI_QUERY`<br>`CONFIRMED_ROOT_PERFORMANCE_CONSISTENCY_DEFECT_NUTRITION_WEEKLY_SEVEN_DAILY_SUMMARIES_TWENTY_EIGHT_READS`<br>`CONFIRMED_ROOT_PRIVACY_AVAILABILITY_DEFECT_MENTAL_HEALTH_SENSITIVE_MOOD_NOTES_TAGS_HISTORY_NO_PAGINATION_MINIMAL_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_MATERNITY_PATIENT_OPERATION_FULL_PERSISTED_REPRODUCTIVE_INFANT_PROFILE_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_MENTAL_HEALTH_CREATE_CONTACT_FULL_PERSISTED_DOCUMENT_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_NUTRITION_FULL_PROFILE_LOG_ALLERGY_RESTRICTION_MEASUREMENT_PROJECTION`<br>`CONFIRMED_ROOT_REQUEST_REPLAY_DEFECT_HEALTH_ACTIVE_MUTATIONS_REFILL_SNOOZE_CANCEL_SLEEP_EMERGENCY_CONTACT_BYPASS_REQUIRE_IDEMPOTENCY`<br>`CONFIRMED_ROOT_USER_TRUTH_DEFECT_NUTRITION_CLIENT_ENTERED_MACROS_EXERCISE_TOTALS_NO_SELF_REPORTED_PROVENANCE_LABEL`

### `R-08A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-050<br>F-503 |
| Owners | Family Platform + Identity/Privacy |
| Derived graph | F-046<br>F-051 |

**Observed constituent causes.** Family invite/join membership lifecycle permits fabricated or non-atomic consent transitions and lacks cryptographic single-use redemption/replay-safe membership truth.

**Business/authority boundary.** Family invitations are server-issued, recipient-bound, expiring and single-use; join/accept/reject is an atomic idempotent membership transition with audit and no fabricated client success.

**Frozen exact evidence.** `F-050: nabd_plus_patient_app/app/family/join.tsx:29–70,175–225`<br>`F-503: src/modules/family/family.service.ts:39–41,81–87,119–147`

**Constituent labels.** `CONFIRMED_ROOT_MOBILE_FAMILY_JOIN_CONSENT_TRANSITION_DEFECT_LOOKUP_MUTATES_MEMBERSHIP_FABRICATED_UI_NONOPERATIVE_ACCEPT_REJECT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_FAMILY_INVITE_CRYPTOGRAPHIC_SINGLE_USE_REDEMPTION`

### `R-08B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 9 |
| Confirmed raw IDs | F-547<br>F-506<br>F-507<br>F-044<br>F-047<br>F-510<br>F-505<br>F-509<br>F-504 |
| Owners | Family Platform + Care + Clinical Privacy |
| Derived graph | F-012<br>F-043<br>F-045<br>F-508<br>F-511 |

**Observed constituent causes.** Family delegated-health actions lack a single authoritative capability/consent contract for target membership, scope, expiry/revocation, audit, state/idempotency and bounded emergency/calendar/booking delegation.

**Business/authority boundary.** Every delegated family action verifies an active recipient/target capability with explicit scope, purpose, expiry/revocation and audit; consent/membership state transitions are idempotent, and health, calendar, emergency-contact and booking references are minimized and server-authoritative.

**Frozen exact evidence.** `F-547: src/modules/care/appointments.dto.ts:17–60 ; src/modules/care/appointments.service.ts:71–78`<br>`F-506: src/modules/family/family.service.ts:195–235`<br>`F-507: src/modules/family/family.service.ts:381–430`<br>`F-044: nabd_plus_patient_app/app/family/permissions.tsx:101–199,260–370`<br>`F-047: nabd_plus_patient_app/app/family/permission-request.tsx:1–10,16–64`<br>`F-510: src/modules/family/family.service.ts:314–360`<br>`F-505: src/modules/family/family.service.ts:184–245`<br>`F-509: src/modules/family/family.service.ts:293–309`<br>`F-504: src/modules/family/family.service.ts:167–177`

**Constituent labels.** `CONFIRMED_ROOT_API_DELEGATED_BOOKING_CONTRACT_DEFECT_CARE_SERVICE_SUPPORTS_FOR_MEMBER_ID_DTO_OMITS_VALIDATED_DOCUMENTED_FIELD`<br>`CONFIRMED_ROOT_CODE_DEFECT_FAMILY_DELEGATED_RECORD_DEGRADED_FAILURE_SEMANTICS`<br>`CONFIRMED_ROOT_CODE_DEFECT_FAMILY_PERMISSION_REQUEST_TARGET_STATE_IDEMPOTENCY_SAGA`<br>`CONFIRMED_ROOT_MOBILE_FAMILY_PERMISSION_MUTATION_TRUTH_DEFECT_PATCH_TO_APPROVAL_FALLBACK_FAILURE_NAVIGATION`<br>`CONFIRMED_ROOT_MOBILE_FAMILY_PERMISSION_REQUEST_CONSENT_CONTRACT_DEFECT_TS_NOCHECK_MISSING_API_FALLBACK_DEFAULT_GRANT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_FAMILY_CALENDAR_SCOPE_BOUNDS_REFERENCE_AUTHORITY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_FAMILY_DELEGATED_HEALTH_CONSENT_EXPIRY_REVOCATION_AUDIT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_FAMILY_EMERGENCY_CONTACT_CONSENT_MINIMIZATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_FAMILY_MEMBER_HEALTH_TARGET_MEMBERSHIP_AUTHORIZATION`

### `R-09A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 16 |
| Confirmed raw IDs | F-842<br>F-832<br>F-834<br>F-836<br>F-840<br>F-2554<br>F-608<br>F-609<br>F-700<br>F-610<br>F-843<br>F-835<br>F-607<br>F-841<br>F-2559<br>F-546 |
| Owners | Platform Events + Security/Privacy<br>Event Platform + Reliability<br>Booking/Care + Event Platform + Notifications |
| Derived graph | F-2551<br>F-2552<br>F-2553<br>F-2555<br>F-2558<br>F-2560 |

**Observed constituent causes.** The common event platform lacks a complete typed, redacted, versioned event registry and a durable idempotent delivery/replay/dead-letter/retention/observable-command contract. Reconciliation-born event lacks idempotency and durable failure lifecycle. Appointment waitlist join emits an in-process event and returns success without persisting an owner-scoped waitlist intent, capacity/consent state, idempotency key, delivery record or reconciliation lifecycle.

**Business/authority boundary.** Every cross-domain event uses a registered typed/versioned envelope with sensitivity classification, correlation/idempotency and a durable outbox/consumer ledger; replay, expiry, redaction, retention and operator actions are bounded and auditable. Reconciliation events use a unique idempotency key, durable outbox/retry/dead-letter/reconciliation outcome and do not claim delivery on failure. A waitlist request is a durable owner-scoped command with date/provider/capacity/consent validation, idempotency and auditable pending/removed/offer/delivery outcomes. Event emission is downstream of committed intent and cannot itself prove patient enrollment, availability or notification delivery.

**Frozen exact evidence.** `F-842: src/modules/event-reliability/event-reliability.module.ts:131–139`<br>`F-832: src/modules/event-reliability/event-reliability.module.ts:49–60`<br>`F-834: src/modules/event-reliability/event-reliability.module.ts:49–60`<br>`F-836: src/modules/event-reliability/event-reliability.module.ts:76–96`<br>`F-840: src/modules/event-reliability/event-reliability.module.ts:120–128`<br>`F-2554: src/common/events.ts:3–45`<br>`F-608: src/modules/events/event-bus.service.ts:62–69`<br>`F-609: src/modules/events/event-bus.service.ts:36–60`<br>`F-700: src/modules/consistency/consistency.module.ts:126–137`<br>`F-610: src/modules/events/event-bus.service.ts:72–83`<br>`F-843: src/modules/event-reliability/event-reliability.module.ts:17–38,76–97`<br>`F-835: src/modules/event-reliability/event-reliability.module.ts:76–97`<br>`F-607: src/modules/events/event-bus.service.ts:7–21,36–51`<br>`F-841: src/modules/event-reliability/event-reliability.module.ts:124–128`<br>`F-2559: src/common/events.ts:1–48`<br>`F-546: src/modules/care/appointments.service.ts:430–443`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_EVENT_ADMIN_COMMAND_IDEMPOTENCY_AUDIT`<br>`CONFIRMED_ROOT_CODE_DEFECT_EVENT_DELIVERY_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_EVENT_DELIVERY_LOG_FAILURE_SIGNAL`<br>`CONFIRMED_ROOT_CODE_DEFECT_EVENT_RELIABILITY_METRIC_TRUTH`<br>`CONFIRMED_ROOT_CODE_DEFECT_EVENT_REPLAY_SAFETY`<br>`CONFIRMED_ROOT_EVENT_REGISTRY_DEFECT_COMMON_EVENTS_INCOMPLETE_WORKFLOW_SERVICE_LIFECYCLE_RAW_STRINGS`<br>`CONFIRMED_ROOT_EVENT_RELIABILITY_DEFECT_EVENTBUS_IN_PROCESS_FANOUT_SWALLOWED_NO_DELIVERY_OUTBOX`<br>`CONFIRMED_ROOT_EVENT_RELIABILITY_DEFECT_EVENTBUS_OPTIONAL_IDEMPOTENCY_KEY_NO_REPLAY_CONTRACT`<br>`CONFIRMED_ROOT_EVENT_RELIABILITY_DEFECT_RECONCILE_BIRTH_EVENT_NO_IDEMPOTENCY_DURABLE_FAILURE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_EVENT_LIST_RAW_PAYLOAD_NO_PURPOSE_PROJECTION_CURSOR`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_EVENT_RETENTION_GOVERNANCE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_EVENT_STATUS_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_EVENT_DEFECT_EVENTBUS_RAW_UNBOUNDED_PAYLOAD_NO_TYPED_REDACTED_REGISTRY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_EVENT_REPLAY_ERROR_REDACTION`<br>`CONFIRMED_ROOT_TEST_GAP_EVENT_REGISTRY_SOURCE_PRODUCER_CONSUMER_COMPLETENESS`<br>`CONFIRMED_ROOT_WAITLIST_TRUTH_DEFECT_CARE_VOLATILE_EVENT_SUCCESS_NO_DURABLE_INTENT_CAPACITY_CONSENT_DELIVERY_OUTCOME`

### `R-09B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 25 |
| Confirmed raw IDs | F-863<br>F-1121<br>F-870<br>F-865<br>F-860<br>F-861<br>F-905<br>F-867<br>F-864<br>F-453<br>F-461<br>F-462<br>F-454<br>F-031<br>F-156<br>F-153<br>F-168<br>F-1120<br>F-460<br>F-858<br>F-989<br>F-869<br>F-862<br>F-868<br>F-859 |
| Owners | Notifications + Admin Operations + Patient Mobile<br>Notification Platform + Privacy<br>Notification Platform + Security Configuration<br>Notifications/Event Platform + Privacy/Security |
| Derived graph | F-032<br>F-154<br>F-167<br>F-871<br>F-906<br>F-1496<br>F-1497<br>F-1498<br>F-463 |

**Observed constituent causes.** Notification preferences, campaign/reminder commands and delivery/read outcomes lack a unified approved-audience/template/link, atomic claim/idempotency, provider receipt/failure and privacy-safe analytics contract. Mail queue treats every non-ok result as the same thrown error, without transient/permanent classification, bounded retry/backoff/deadline or truthful terminal delivery outcome. SMS configuration recognizes multiple provider environment variables but implements only one provider request path, with no validated provider capability/credential/configuration matrix or fail-closed selected-provider contract. Automatic provider fallback after an ambiguous primary failure has no delivery identity, receipt reconciliation or duplicate-delivery prevention contract. Mail transport has no explicit bounded timeout/retry/failure/outcome contract to support truthful delivery state. SMS send uses an unbounded axios request and boolean response without timeout, retry/backoff/deadline, provider receipt ID, permanent/transient taxonomy or ambiguous-delivery reconciliation. Push engagement accepts arbitrary client data and inserts received/opened/clicked records without notification/recipient correlation, deduplication, sensitive-data minimization, retention or delivery/receipt verification. Mail queue failure throws a raw provider error that can retain recipient/delivery data without redacted telemetry, bounded DLQ payload or privacy-safe failure correlation. Mail service logs and emits recipient, subject and raw provider errors into telemetry/event payloads without redaction/minimum-necessary policy.

**Business/authority boundary.** Notification commands use consent/preference/suppression-aware authoritative audience snapshots, approved localized templates and scoped links; campaigns/reminders are idempotent leased jobs with durable attempts/receipts/read outcomes, bounded analytics and actor/reason audit. Notification delivery uses redacted minimum-necessary telemetry and DLQ payloads, immutable delivery command identity, provider receipt/failure provenance, bounded retention and durable reconciliation; a failed provider result is never disclosure-safe by default. SMS delivery is an approved configuration and durable notification command: one explicit provider capability/configuration contract, redacted request/receipt/failure provenance, timeout/retry/backoff/deadline and ambiguous-outcome reconciliation. A provider HTTP response or fallback is never authentication/OTP success; the server-owned OTP challenge separately verifies eligible delivery channel, expiry, attempts and cancellation. Notification delivery is an approved-audience/template command with redacted telemetry, immutable command/idempotency key, provider request/receipt/failure provenance, bounded timeout/retry/ambiguous-outcome policy and durable reconciliation. Provider fallback may not imply successful or unique delivery; OTP lifecycle remains owned by the authentication challenge contract. Notification engagement is an idempotent, privacy-minimized event correlated to a canonical notification and authorized recipient/device. It must use a bounded typed payload, deduplication/replay controls, retention/audit policy and truthful delivery/read semantics; a client event or queue action never proves receipt, engagement or clinical/financial outcome.

**Frozen exact evidence.** `F-863: src/modules/admin-notification-center/admin-notification-center.module.ts:215–220,401–407`<br>`F-1121: src/modules/notifications/processors/mail.processor.ts:13–17`<br>`F-870: src/modules/admin-notification-center/admin-notification-center.module.ts:174–182,332–364`<br>`F-865: src/modules/admin-notification-center/admin-notification-center.module.ts:244–280`<br>`F-860: src/modules/admin-notification-center/admin-notification-center.module.ts:136–155`<br>`F-861: src/modules/admin-notification-center/admin-notification-center.module.ts:184–191`<br>`F-905: src/modules/doctors/doctors.module.ts:224–231`<br>`F-867: src/modules/admin-notification-center/admin-notification-center.module.ts:259–275`<br>`F-864: src/modules/admin-notification-center/admin-notification-center.module.ts:231–242`<br>`F-453: src/modules/sms/sms.service.ts:39–55`<br>`F-461: src/modules/mail/mail.module.ts:72–92`<br>`F-462: src/modules/mail/mail.module.ts:43–92`<br>`F-454: src/modules/sms/sms.service.ts:44–60`<br>`F-031: nabd_plus_patient_app/app/settings/notifications-settings.tsx:21–32,47–64,98–145,204–278 ; nabdah-backend/src/modules/users/users.controller.ts:50–59`<br>`F-156: src/modules/notifications/notifications.service.ts:57–119, 190–239, 262–278`<br>`F-153: src/modules/notifications/notifications.controller.ts:46–58 ; src/modules/notifications/notifications.service.ts:30–59 ; src/schemas/notification.schema.ts:9–24`<br>`F-168: src/modules/push/push.module.ts:302–312,619–687`<br>`F-1120: src/modules/notifications/processors/mail.processor.ts:13–17`<br>`F-460: src/modules/mail/mail.module.ts:77–90`<br>`F-858: src/modules/admin-notification-center/admin-notification-center.module.ts:93–119`<br>`F-989: src/modules/compat/admin-spa.module.ts:920–989`<br>`F-869: src/modules/admin-notification-center/admin-notification-center.module.ts:299–304,319–324`<br>`F-862: src/modules/admin-notification-center/admin-notification-center.module.ts:192–212`<br>`F-868: src/modules/admin-notification-center/admin-notification-center.module.ts:283–329`<br>`F-859: src/modules/admin-notification-center/admin-notification-center.module.ts:38,67–90,194–198`

**Constituent labels.** `CONFIRMED_ROOT_AUDIT_DEFECT_NOTIFICATION_CAMPAIGN_CANCEL_REASON_ACTOR_VERSION_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_MAIL_DELIVERY_TRANSIENT_PERMANENT_FAILURE_RETRY_DEADLINE_TAXONOMY`<br>`CONFIRMED_ROOT_CODE_DEFECT_NOTIFICATION_ANALYTICS_RECIPIENT_EVENT_COHORT_SOURCE_TRUTH`<br>`CONFIRMED_ROOT_CODE_DEFECT_NOTIFICATION_APPOINTMENT_REMINDER_ATOMIC_CLAIM_DELIVERY_OUTCOME`<br>`CONFIRMED_ROOT_CODE_DEFECT_NOTIFICATION_CAMPAIGN_CREATE_IDEMPOTENCY_UNIQUE_BUSINESS_KEY`<br>`CONFIRMED_ROOT_CODE_DEFECT_NOTIFICATION_CAMPAIGN_SEND_ATOMIC_CLAIM_LEASE`<br>`CONFIRMED_ROOT_CODE_DEFECT_NOTIFICATION_READ_MATCHED_OUTCOME_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_NOTIFICATION_REMINDER_PROVIDER_BINDING_BATCH_PROJECTION`<br>`CONFIRMED_ROOT_CODE_DEFECT_NOTIFICATION_SCHEDULER_DUE_CAMPAIGN_ATOMIC_CLAIM`<br>`CONFIRMED_ROOT_CONFIG_DEFECT_SMS_PROVIDER_CAPABILITY_CONFIGURATION_IMPLEMENTATION_DRIFT`<br>`CONFIRMED_ROOT_EVENT_RELIABILITY_DEFECT_MAIL_PROVIDER_AMBIGUOUS_FAILURE_FALLBACK_DUPLICATE_DELIVERY`<br>`CONFIRMED_ROOT_EVENT_RELIABILITY_DEFECT_MAIL_TRANSPORT_TIMEOUT_RETRY_FAILURE_DELIVERY_OUTCOME_CONTRACT`<br>`CONFIRMED_ROOT_EVENT_RELIABILITY_DEFECT_SMS_TRANSPORT_TIMEOUT_RETRY_DELIVERY_OUTCOME_CONTRACT`<br>`CONFIRMED_ROOT_MOBILE_NOTIFICATION_TRUTH_DEFECT_FLAT_UI_KEYS_DO_NOT_MATCH_BACKEND_NORMALIZED_SETTINGS_OPTIMISTIC_SWALLOWED_FAILURE_CLIENT_ONLY_EMERGENCY_LOCK`<br>`CONFIRMED_ROOT_NOTIFICATION_DELIVERY_TRUTH_DEFECT_OPTIMISTIC_NOOP_CHANNEL_STATUS_NO_DURABLE_ATTEMPT_RECEIPT_FAILURE_LEASE`<br>`CONFIRMED_ROOT_NOTIFICATION_GOVERNANCE_DEFECT_ADMIN_RAW_AUDIENCE_CONTENT_ACTION_NO_TYPED_APPROVED_ACTOR_AUDIT_COMMAND`<br>`CONFIRMED_ROOT_PHI_EVENT_CONTRACT_DEFECT_PUSH_ENGAGEMENT_ARBITRARY_DATA_SOURCE_ANY_EVENTS_NO_DEDUP_SENSITIVITY_MINIMIZATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_MAIL_JOB_PROVIDER_ERROR_RECIPIENT_REDACTED_LOG_DLQ`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_MAIL_RECIPIENT_SUBJECT_PROVIDER_ERROR_RAW_LOG_EVENT_TELEMETRY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_NOTIFICATION_AUDIENCE_CONSENT_PREFERENCE_SUPPRESSION_SCOPE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_NOTIFICATION_AUDIENCE_DELIVERY_GOVERNANCE`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_NOTIFICATION_LOCALIZED_TEMPLATE_CHANNEL_GOVERNANCE`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_NOTIFICATION_QUEUE_DELIVERY_OUTCOME_SEMANTICS`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_NOTIFICATION_RETARGET_CANONICAL_CART_ORDER_PAYMENT_CONSENT_CLAIM`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_NOTIFICATION_DEEP_LINK_ROUTE_PARAM_ALLOWLIST_CAPABILITY`

### `R-09C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 8 |
| Confirmed raw IDs | F-3033<br>F-3029<br>F-3036<br>F-3027<br>F-3030<br>F-3032<br>F-3031<br>F-3026 |
| Owners | Event Platform + Admin Privacy/Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Administrative event/trace reads lack typed normalized event/entity filters, finite time/limit/cursor/order/timeout bounds, cross-domain purpose scope, redacted before/after metadata and sensitive-read audit trail.

**Business/authority boundary.** Event administration uses allowlisted typed normalized filters, stable bounded cursor/time/query contract, actor/purpose/domain scope, minimum redacted metadata and immutable sensitive-read audit; it is a read surface, not event production authority.

**Frozen exact evidence.** `F-3033: src/modules/events/events.controllers.ts:12–29`<br>`F-3029: src/modules/events/events.controllers.ts:12–24`<br>`F-3036: src/modules/events/events.controllers.ts:14–23`<br>`F-3027: src/modules/events/events.controllers.ts:19–23`<br>`F-3030: src/modules/events/events.controllers.ts:26–29`<br>`F-3032: src/modules/events/events.controllers.ts:12–29`<br>`F-3031: src/modules/events/events.controllers.ts:6–9,14–23`<br>`F-3026: src/modules/events/events.controllers.ts:12–23`

**Constituent labels.** `CONFIRMED_ROOT_AUDIT_DEFECT_ADMIN_EVENTS_SENSITIVE_READ_AUDIT_TRAIL`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_EVENTS_CURSOR_STABLE_ORDER_QUERY_TIMEOUT_CONTRACT`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_EVENTS_FILTER_NORMALIZATION_FIELD_PRESENCE_CONTRACT`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_EVENTS_STRICT_FINITE_NUMERIC_TIME_LIMIT_VALIDATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_EVENT_TRACE_TYPED_ENTITY_CURSOR_TIME_BOUND_CONTRACT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_EVENTS_BEFORE_AFTER_META_REDACTED_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_EVENTS_PURPOSE_SCOPE_CROSS_DOMAIN_AUTHORIZATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_ADMIN_EVENTS_TYPED_FILTER_EVENT_ENTITY_ALLOWLIST`

### `R-09D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 4 |
| Confirmed raw IDs | F-837<br>F-838<br>F-839<br>F-833 |
| Owners | Event Platform + Privacy/Reliability |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Dead-letter processing lacks redacted/retained payload governance, atomic claim lease/concurrency, truthful listener acknowledgement and bounded classified retry policy.

**Business/authority boundary.** Dead-letter events retain minimum classified/redacted payloads under retention/access policy; processing uses atomic lease/claim, durable truthful acknowledge outcome, bounded classified retries/dead-letter escalation and immutable audit/reconciliation.

**Frozen exact evidence.** `F-837: src/modules/event-reliability/event-reliability.module.ts:99–118`<br>`F-838: src/modules/event-reliability/event-reliability.module.ts:103–117`<br>`F-839: src/modules/event-reliability/event-reliability.module.ts:110–117`<br>`F-833: src/modules/event-reliability/event-reliability.module.ts:17–27,62–74`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_DLQ_CLAIM_LEASE_CONCURRENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_DLQ_LISTENER_ACK_TRUTH`<br>`CONFIRMED_ROOT_CODE_DEFECT_DLQ_RETRY_POLICY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_DLQ_PAYLOAD_GOVERNANCE`

### `R-10A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 6 |
| Confirmed raw IDs | F-450<br>F-975<br>F-446<br>F-445<br>F-448<br>F-447 |
| Owners | Emergency/Ambulance Operations |
| Derived graph | F-444 |

**Observed constituent causes.** Emergency dispatch and ambulance fleet handling can report success after failed dispatch, use unbounded/stale matching, permit mixed state mutation and accept unvalidated location/fleet changes without durable history/version/audit.

**Business/authority boundary.** Emergency requests and fleet transitions are server-authoritative versioned commands with validated fresh location/availability, bounded dispatch scoring, atomic assignment/handover history, explicit failure/retry and immutable audit; no client or swallowed failure confirms dispatch.

**Frozen exact evidence.** `F-450: src/modules/emergency/ambulance-fleet.controller.ts:24–58`<br>`F-975: src/modules/compat/admin-spa.module.ts:111–183`<br>`F-446: src/modules/emergency/emergency.service.ts:63–107`<br>`F-445: src/modules/emergency/emergency.service.ts:141–148`<br>`F-448: src/modules/emergency/emergency.service.ts:264–298,301–314`<br>`F-447: src/modules/emergency/emergency.service.ts:150–183,194–209,244–249`

**Constituent labels.** `CONFIRMED_ROOT_AMBULANCE_FLEET_MUTATION_VALIDATION_VERSION_IDEMPOTENCY_AUDIT_DEFECT`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_BROADCAST_EMERGENCY_TRANSITION_DURABILITY`<br>`CONFIRMED_ROOT_EMERGENCY_DISPATCH_RELIABILITY_DEFECT_UNBOUNDED_PER_VEHICLE_SCORING_NO_FRESHNESS_AUDIT`<br>`CONFIRMED_ROOT_EMERGENCY_DISPATCH_TRUTH_DEFECT_TRIGGER_SWALLOWS_AUTODISPATCH_FAILURE_AFTER_SUCCESS`<br>`CONFIRMED_ROOT_EMERGENCY_GPS_TRUTH_DEFECT_NO_COORDINATE_RANGE_FRESHNESS_RATE_LIMIT_ETA_ESTIMATE_SEMANTICS`<br>`CONFIRMED_ROOT_EMERGENCY_STATE_MACHINE_DEFECT_MIXED_DIRECT_MUTATIONS_INCOMPLETE_HISTORY_NO_VERSION_ATOMICITY`

### `R-10B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 19 |
| Confirmed raw IDs | F-725<br>F-515<br>F-514<br>F-719<br>F-718<br>F-512<br>F-513<br>F-727<br>F-726<br>F-722<br>F-721<br>F-340<br>F-023<br>F-518<br>F-517<br>F-519<br>F-720<br>F-723<br>F-728 |
| Owners | Home-care Fulfillment + Clinical Privacy<br>Home-care/Nursing Operations + Care<br>Home-care + Booking + Payments |
| Derived graph | F-018<br>F-054<br>F-082<br>F-083<br>F-947 |

**Observed constituent causes.** Home-care compatibility flow lacks truthful provider UI/backend route-payload contract, minimum catalog/provider projection, consented clinical/GPS visit report schema/audit, authorized care-plan/encounter authorship and versioned nursing clinical protocol provenance. Care-plan creation and retrieval rely only on broad role checks and patient ID, without a verified assigned encounter/organization/consent subject scope. Home-care/nursing booking, provider assignment and tracking lack one authoritative idempotent state/claim/availability/slot/address/quote contract and can expose completion/tracking without fulfillment truth. Home-care request accepts input/payment context without a canonical server-owned booking/quote/insurance authority. Supply request creates untyped mutable item records without a canonical assigned visit/booking fulfillment contract, bounded item policy, idempotency or inventory/reconciliation linkage. Visit-report submission overwrites raw report content and completes the booking without an idempotent command/state/version, assigned-visit proof or immutable clinical audit.

**Business/authority boundary.** Home-care fulfillment uses one canonical provider UI/API contract with truthful error/context states; catalog/provider data is minimum bounded projection; visit reports and care plans require authorized author, subject relationship, consent, schema/version/protocol provenance and immutable audit. GPS measurement validity remains a separate R-11B dependency. Home-care fulfillment uses a canonical assigned booking/encounter context. Care plans, visit reports and supplies require a verified subject-provider/organization relationship, consented minimum clinical schema, versioned state/command ID and immutable author/time audit. Supplies are typed, bounded and linked to the assigned visit/fulfillment state. GPS measurement validity is a separate runtime/external verification gate. Home-care commands use server-authoritative service/address/time/quote/insurance/payment dependencies, idempotent intent plus slot/capacity reservation, atomic eligible-provider claim and versioned state transitions; tracking and completion derive only from durable fulfillment state. Home-care booking must bind patient/address/service/slot/provider decision and server quote; cash/card or insurance/co-pay follows the canonical booking rule, never client payment fields.

**Frozen exact evidence.** `F-725: src/modules/home-care-compat/home-care-compat.module.ts:182–206`<br>`F-515: src/modules/home-care/home-care.service.ts:174–190`<br>`F-514: src/modules/home-care/home-care.service.ts:116–171`<br>`F-719: src/modules/home-care-compat/home-care-compat.module.ts:74–95`<br>`F-718: src/modules/home-care-compat/home-care-compat.module.ts:74–95`<br>`F-512: src/modules/home-care/home-care.service.ts:50–85`<br>`F-513: src/modules/home-care/home-care.service.ts:65–81`<br>`F-727: src/modules/home-care-compat/home-care-compat.module.ts:215–224`<br>`F-726: src/modules/home-care-compat/home-care-compat.module.ts:209–212`<br>`F-722: src/modules/home-care-compat/home-care-compat.module.ts:116–148`<br>`F-721: src/modules/home-care-compat/home-care-compat.module.ts:103–113,116–156`<br>`F-340: src/modules/unified-bookings/unified-bookings.module.ts:258–297`<br>`F-023: NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx:80–103,128–164,226–232,266–286,293–318 ; nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:98–113,141–149,209–212`<br>`F-518: src/modules/home-care/home-care.service.ts:192–200 ; src/modules/home-care/controllers/home-care-tracking.controller.ts:91–105`<br>`F-517: src/modules/home-care/home-care.service.ts:154–171`<br>`F-519: src/modules/home-care/controllers/home-care-tracking.controller.ts:99–105`<br>`F-720: src/modules/home-care-compat/home-care-compat.module.ts:32–57`<br>`F-723: src/modules/home-care-compat/home-care-compat.module.ts:158–180`<br>`F-728: src/modules/home-care-compat/home-care-compat.module.ts:228–272`

**Constituent labels.** `CONFIRMED_ROOT_CLINICAL_SAFETY_DEFECT_HOMECARE_CAREPLAN_ENCOUNTER_AUTHOR_AUTHORITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_CAREPLAN_PATIENT_SCOPE_AUTHORIZATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOMECARE_ASSIGNMENT_AUTHORIZATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOMECARE_BOOKING_IDEMPOTENCY_SLOT_CAPACITY_RESERVATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOMECARE_BOOKING_QUOTE_ADDRESS_TIME_PAYMENT_INSURANCE_AUTHORITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOMECARE_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOMECARE_INPUT_AND_PAYMENT_AUTHORITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOMECARE_INVENTORY_CATALOG_STOCK_RESERVATION_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOMECARE_PROVIDER_AVAILABILITY_MATCHED_OUTCOME`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOMECARE_STATE_COMMAND_VERSION_IDEMPOTENCY_AUTHORITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOMECARE_UNASSIGNED_PROVIDER_ATOMIC_CLAIM_ELIGIBILITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_NURSING_BROADCAST_FALSE_ASSIGNMENT_SUCCESS`<br>`CONFIRMED_ROOT_CODE_DEFECT_PROVIDER_NURSING_UI_BACKEND_ROUTE_PAYLOAD_ERROR_TRUTH_CONTEXT_DRIFT`<br>`CONFIRMED_ROOT_CODE_DEFECT_SUPPLY_REQUEST_CONTRACT`<br>`CONFIRMED_ROOT_CODE_DEFECT_VISIT_REPORT_STATE_AND_REPLAY`<br>`CONFIRMED_ROOT_HOME_CARE_FULFILLMENT_TRUTH_DEFECT_TRACKING_SUCCESS_WITHOUT_WORKFLOW_DISPATCH_STATE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_HOMECARE_CATALOG_PROVIDER_PROFILE_PROJECTION_PAGINATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_HOMECARE_CLINICAL_GPS_VISIT_REPORT_CONSENT_SCHEMA_AUDIT`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_NURSING_CLINICAL_REFERENCE_PROTOCOL_VERSION_GOVERNANCE`

### `R-11A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 7 |
| Confirmed raw IDs | F-981<br>F-986<br>F-534<br>F-541<br>F-539<br>F-536<br>F-533 |
| Owners | Driver/Delivery Operations + Privacy |
| Derived graph | F-535<br>F-540 |

**Observed constituent causes.** Driver location, shift, delivery assignment/reassignment and delivery quote policies lack verified relationship/eligibility, atomic claim, telemetry validation and versioned durable fulfillment truth.

**Business/authority boundary.** Driver/delivery operations require active authorized shift and order relationship, validated fresh/consented telemetry, atomic assignment/reassignment with capacity/geography checks, versioned quote policy and durable pickup/delivery transitions with audit.

**Frozen exact evidence.** `F-981: src/modules/compat/admin-spa.module.ts:497–525`<br>`F-986: src/modules/compat/admin-spa.module.ts:734–825`<br>`F-534: src/modules/drivers/drivers.service.ts:105–120`<br>`F-541: src/modules/drivers/drivers.service.ts:84–120`<br>`F-539: src/modules/drivers/drivers.service.ts:28–39`<br>`F-536: src/modules/drivers/drivers.service.ts:56–82`<br>`F-533: src/modules/drivers/drivers.controller.ts:35–38`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_ADMIN_ORDER_REASSIGNMENT_DISPATCH_RECONCILIATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_DELIVERY_POLICY_QUOTE_VERSIONING`<br>`CONFIRMED_ROOT_DELIVERY_ASSIGNMENT_ATOMICITY_DEFECT_DRIVERS_COMPETING_ACCEPT_READ_CREATE_SAVE_DELIVERY_ORDER_NO_CAS_TRANSACTION_UNIQUE_CLAIM`<br>`CONFIRMED_ROOT_DELIVERY_ELIGIBILITY_DEFECT_AVAILABLE_ACCEPT_NO_ONLINE_SHIFT_CAPABILITY_GEOGRAPHY_CAPACITY_AUTHORIZATION`<br>`CONFIRMED_ROOT_DRIVER_SHIFT_CONCURRENCY_DEFECT_CLOSE_MANY_THEN_CREATE_NO_ONE_ACTIVE_ATOMIC_IDEMPOTENCY_LOCATION_INVARIANT`<br>`CONFIRMED_ROOT_DRIVER_TELEMETRY_VALIDATION_PRIVACY_DEFECT_RAW_LOCATION_HEADING_SPEED_NO_BOUNDS_FRESHNESS_CADENCE_ATTESTATION_CONSENT`<br>`CONFIRMED_ROOT_LIVE_LOCATION_AUTHORIZATION_DEFECT_DRIVERS_AUTHENTICATED_ANY_CALLER_EXACT_DRIVER_COORDINATES_NO_ORDER_PARTICIPANT_ADMIN_RELATIONSHIP`

### `R-11B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 4 |
| Confirmed raw IDs | F-537<br>F-666<br>F-665<br>F-724 |
| Owners | Drivers/Delivery + Media Platform<br>Facility Operations + Home-care + Privacy |
| Derived graph | F-540<br>F-081<br>F-880 |

**Observed constituent causes.** Delivery proof signature/photo is raw media without validated scoped proof asset/ownership/retention contract. Facility/home-care attendance GPS check-in/out lacks a unified shift/actor/CAS/geofence/range/accuracy/freshness/rate contract.

**Business/authority boundary.** Delivery proof is attached through R-07B1 safe media to an authorized active delivery, with purpose, integrity, audit and retention; it is not raw signature/photo input. Attendance location evidence is accepted only for an authorized active shift/visit with bounded geofence/range/accuracy/freshness/rate validation, versioned check-in/out state, audit and consent/retention controls.

**Frozen exact evidence.** `F-537: src/modules/drivers/drivers.service.ts:136–145`<br>`F-666: src/modules/facility-ops/facility-ops.module.ts:194–204,314–317`<br>`F-665: src/modules/facility-ops/facility-ops.module.ts:182–191,309–312`<br>`F-724: src/modules/home-care-compat/home-care-compat.module.ts:162–167`

**Constituent labels.** `CONFIRMED_ROOT_DELIVERY_PROOF_MEDIA_BOUNDARY_DEFECT_RAW_SIGNATURE_PHOTO_NO_TYPE_SIZE_STORAGE_OWNERSHIP_RETENTION_CONTRACT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_FACILITY_ATTENDANCE_CHECKOUT_ACTOR_SHIFT_STATE_CAS`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_FACILITY_ATTENDANCE_GPS_RANGE_GEOFENCE_SHIFT_UNIQUENESS`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_HOMECARE_GPS_RANGE_ACCURACY_FRESHNESS_RATE_GEOFENCE`

### `R-12A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 10 |
| Confirmed raw IDs | F-119<br>F-711<br>F-707<br>F-712<br>F-120<br>F-121<br>F-710<br>F-708<br>F-706<br>F-716 |
| Owners | Medication Catalog Governance<br>Service Catalog + Provider Governance<br>Medication Catalog Governance + Workflow Platform |
| Derived graph | F-612<br>F-715<br>F-717<br>F-937<br>F-949<br>F-2834 |

**Observed constituent causes.** Medication catalog has duplicate admin route/lifecycle and accepts raw mutation bodies without strict typed command/idempotency. Service catalog commands lack a single typed allowlisted owner/version/approval/schedule/publication lifecycle with immutable-field and projection controls. Medicine catalog, shortage, image and change-request workflows mutate related storage/state/audit/cache effects in separate operations without one durable idempotent command/outbox/reconciliation lifecycle.

**Business/authority boundary.** Medication catalog administration has one canonical versioned route/command lifecycle with typed allowlisted validation, idempotency/CAS, authorized actor/audit and authoritative catalog provenance. Catalog entries use typed entity/owner/field rules, explicit capability/approval/reason/version/idempotency, bounded schedule semantics, immutable patch/delete protections and least-data admin/public projections; publication follows a durable reconciled lifecycle. Catalog governance uses typed source/provenance, version/CAS/idempotent approval commands, safe asset references, atomic state plus durable outbox/reconciliation, and publication/index/cache projection only after verified lifecycle completion.

**Frozen exact evidence.** `F-119: src/modules/medicines/medicines.controller.ts:246–250,305–308 ; src/modules/medicines/medicines.service.ts:843–860,1389–1418`<br>`F-711: src/modules/service-catalog/service-catalog.module.ts:130–136,199–202`<br>`F-707: src/modules/service-catalog/service-catalog.module.ts:81–90`<br>`F-712: src/modules/service-catalog/service-catalog.module.ts:138–155`<br>`F-120: src/modules/medicines/medicines.controller.ts:50–78,158–212,223–250,294–347 ; src/modules/medicines/medicines.service.ts:756–768,826–837,1117–1166,1300–1357`<br>`F-121: src/modules/medicines/medicines.service.ts:868–1000,1003–1105,1300–1357,1464–1513`<br>`F-710: src/modules/service-catalog/service-catalog.module.ts:119–127`<br>`F-708: src/modules/service-catalog/service-catalog.module.ts:93–116`<br>`F-706: src/modules/service-catalog/service-catalog.module.ts:77–90`<br>`F-716: src/modules/service-catalog/service-catalog.module.ts:185–202`

**Constituent labels.** `CONFIRMED_ROOT_API_GOVERNANCE_DEFECT_MEDICINES_DUPLICATE_ADMIN_CATALOG_ROUTE_DIFFERENT_LIFECYCLE`<br>`CONFIRMED_ROOT_AUDIT_DEFECT_SERVICE_CATALOG_APPROVAL_STATE_REASON_VERSION_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_SERVICE_CATALOG_OWNERSHIP_PUBLICATION_CREATE_SAGA`<br>`CONFIRMED_ROOT_CODE_DEFECT_SERVICE_CATALOG_SCHEDULE_READ_PURITY_SCHEMA_TIME_BOUNDS`<br>`CONFIRMED_ROOT_DATA_CONTRACT_DEFECT_MEDICINES_RAW_MUTATION_BODY_NO_STRICT_COMMAND_IDEMPOTENCY`<br>`CONFIRMED_ROOT_EVENT_STORAGE_RELIABILITY_DEFECT_MEDICINES_CATALOG_SHORTAGE_IMAGE_NON_ATOMIC_WORKFLOW`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_SERVICE_CATALOG_ADMIN_SEARCH_PROJECTION_CURSOR_SCOPE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_SERVICE_CATALOG_PATCH_DELETE_ATOMIC_IMMUTABLE_FIELDS`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_SERVICE_CATALOG_PROVIDER_CREATE_FIELD_ALLOWLIST`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_SERVICE_CATALOG_RUNTIME_TYPE_ENTITY_ENUM_VALIDATION`

### `R-12B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 11 |
| Confirmed raw IDs | F-123<br>F-555<br>F-122<br>F-894<br>F-3775<br>F-252<br>F-741<br>F-625<br>F-3776<br>F-893<br>F-3774 |
| Owners | Public Discovery + Privacy<br>Public Discovery/Search + Privacy<br>Medication Catalog Governance + Public Discovery/Clinical Safety<br>Catalog/Public Discovery |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Public medication analytics attributes activity to unverified JWT identity. Public and cross-domain discovery searches lack consistent bounded/escaped query, sensitivity, verified-publication, minimum projection and retention contracts. Public medication lookup uses barcode/fuzzy fallback and regex search without bounded escaped query plan, verified-publication/clinical safety gate or minimum public result contract. Public doctor specialty listing lacks governed publication/filter/query plan.

**Business/authority boundary.** Public medication discovery is anonymous by default; any user attribution requires verified authenticated identity, purpose/consent, minimum event fields and privacy-safe analytics. Discovery/search inputs are typed, escaped and resource-bounded; results are from verified/publication-authorized entities only, return minimum public DTOs, protect sensitive terms and apply pagination/cursor/retention/audit policy. Discovery/search inputs are typed, escaped and resource-bounded; results are from verified/publication-authorized entities only, return minimum public DTOs, protect sensitive/clinical terms and apply pagination/cursor/retention/audit policy. Public discovery lists only published verified specialty records via typed bounded filter/query plans and minimum projection.

**Frozen exact evidence.** `F-123: src/modules/medicines/medicines.controller.ts:34–42 ; src/modules/medicines/medicines.service.ts:169–179,682–688`<br>`F-555: src/modules/articles/articles.module.ts:23–32`<br>`F-122: src/modules/medicines/medicines.service.ts:140–166,554–615`<br>`F-894: src/modules/doctors/doctors.module.ts:74–82`<br>`F-3775: src/modules/seo-search/seo-search.module.ts:365–380`<br>`F-252: src/modules/home/home.service.ts:91–138,216–268`<br>`F-741: src/modules/analytics/analytics.module.ts:18–25`<br>`F-625: src/modules/provider-onboarding/provider-onboarding.module.ts:391–428`<br>`F-3776: src/modules/seo-search/seo-search.module.ts:125–133`<br>`F-893: src/modules/doctors/doctors.module.ts:56–65,246–254`<br>`F-3774: src/modules/seo-search/seo-search.module.ts:121–134`

**Constituent labels.** `CONFIRMED_ROOT_ANALYTICS_SECURITY_DEFECT_MEDICINES_PUBLIC_UNVERIFIED_JWT_IDENTITY_ATTRIBUTION`<br>`CONFIRMED_ROOT_AVAILABILITY_DEFECT_PUBLIC_ARTICLE_UNESCAPED_UNBOUNDED_MONGO_REGEX_SEARCH`<br>`CONFIRMED_ROOT_CLINICAL_CATALOG_DEFECT_MEDICINES_BARCODE_FUZZY_FALLBACK_UNBOUNDED_PUBLIC_REGEX`<br>`CONFIRMED_ROOT_CODE_DEFECT_DOCTORS_SPECIALTY_PUBLICATION_FILTER_QUERY_PLAN`<br>`CONFIRMED_ROOT_CODE_DEFECT_PUBLIC_SEARCH_QUERY_LIMIT_VALIDATION`<br>`CONFIRMED_ROOT_CROSS_DOMAIN_SEARCH_GOVERNANCE_DEFECT_HOME_UNBOUNDED_QUERY_HETEROGENEOUS_PUBLICATION_FILTERS_FAMILY_IDENTIFIER_PROJECTION_NO_CENTRAL_SENSITIVITY_CONTRACT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ANALYTICS_SEARCH_TERM_SENSITIVE_THRESHOLD_RETENTION_POLICY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PROVIDER_PUBLIC_SEARCH_ESCAPE_BOUNDS_MINIMUM_VERIFIED_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PUBLIC_SEARCH_PUBLICATION_DISCLOSURE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_DOCTORS_PUBLIC_SEARCH_REGEX_BOUNDS_PROJECTION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_PUBLIC_SEARCH_REGEX_RESOURCE_GUARD`

### `R-12C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 18 |
| Confirmed raw IDs | F-557<br>F-556<br>F-563<br>F-980<br>F-3772<br>F-3764<br>F-3768<br>F-3766<br>F-611<br>F-3765<br>F-218<br>F-221<br>F-3763<br>F-3771<br>F-561<br>F-613<br>F-2542<br>F-560 |
| Owners | Content Governance + SEO/Public Discovery<br>SEO/Public Discovery + Catalog Governance<br>Catalog/CMS Governance + Media |
| Derived graph | F-2548<br>F-3773 |

**Observed constituent causes.** Article creation/update accepts raw body, media and SEO fields without sanitization, bounds, safe-asset/localization validation or versioned review evidence. Article admin update accepts arbitrary persistence fields without typed allowlist, draft/review/version/actor workflow or immutable change audit. SEO/public catalog routes lack typed canonical identity, public DTO/indexability/publication gates, truthful commercial metadata, safe XML and durable catalog-publication projection semantics. CMS media catalog publication lacks governed canonical publication lifecycle. Sitemap generation does not use canonical publication/indexability revision provenance for lastmod and can publish stale or misleading modification metadata.

**Business/authority boundary.** CMS/publication uses typed allowlisted locale/content/media/SEO DTOs, safe-asset references, versioned review/moderation/completeness gates, immutable actor/reason audit and durable public projection/index reconciliation. SEO/publication emits only type-allowlisted canonical entities with collision-safe identity, verified publication/indexability lifecycle, minimum public fields, truthful price/availability/LLM metadata, escaped XML and durable reconciled projection updates. CMS/catalog media publication uses reviewed/versioned readiness, safe asset references and durable reconciled public projection.

**Frozen exact evidence.** `F-557: src/modules/articles/articles.module.ts:52–70,73–80`<br>`F-556: src/modules/articles/articles.module.ts:73–80,105–117`<br>`F-563: src/modules/articles/articles.module.ts:78–88,95–103`<br>`F-980: src/modules/compat/admin-spa.module.ts:432–495`<br>`F-3772: src/modules/seo-search/seo-search.module.ts:326–345`<br>`F-3764: src/modules/seo-search/seo-search.module.ts:47–50,89–95`<br>`F-3768: src/modules/seo-search/seo-search.module.ts:109–119`<br>`F-3766: src/modules/seo-search/seo-search.module.ts:68–77`<br>`F-611: src/modules/events/catalog-publication.service.ts:77–143`<br>`F-3765: src/modules/seo-search/seo-search.module.ts:23–44,81–105`<br>`F-218: src/modules/seo/seo.service.ts:83–125`<br>`F-221: src/modules/seo/seo.service.ts:289–397`<br>`F-3763: src/modules/seo-search/seo-search.module.ts:23–51,304–307`<br>`F-3771: src/modules/seo-search/seo-search.module.ts:109–119,352–362`<br>`F-561: src/modules/articles/seo.controller.ts:14–43`<br>`F-613: src/modules/events/catalog-publication.service.ts:51–60,77–87`<br>`F-2542: src/common/slug.util.ts:35–40`<br>`F-560: src/modules/articles/seo.controller.ts:32–36`

**Constituent labels.** `CONFIRMED_ROOT_CMS_CONTENT_SAFETY_DEFECT_RAW_ARTICLE_BODY_MEDIA_SEO_NO_SANITIZE_BOUND_LOCALIZATION_VALIDATION`<br>`CONFIRMED_ROOT_CMS_GOVERNANCE_DEFECT_ADMIN_ARTICLE_ARBITRARY_BODY_FIELD_MUTATION_NO_TYPED_WORKFLOW`<br>`CONFIRMED_ROOT_CMS_PUBLICATION_DEFECT_STATUS_FLIP_NO_REVIEW_VERSION_COMPLETENESS_MODERATION_SEO_READINESS_GATE`<br>`CONFIRMED_ROOT_CODE_DEFECT_CMS_MEDIA_CATALOG_PUBLICATION_GOVERNANCE`<br>`CONFIRMED_ROOT_CODE_DEFECT_LLMS_DISCOVERY_METADATA_TRUTHFULNESS`<br>`CONFIRMED_ROOT_CODE_DEFECT_SEO_CATEGORY_PUBLICATION_AUTHORITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_SITEMAP_LASTMOD_PROVENANCE`<br>`CONFIRMED_ROOT_COMMERCIAL_TRUTH_DEFECT_SEO_PRODUCT_OFFER_AVAILABILITY_PRICE`<br>`CONFIRMED_ROOT_EVENT_RELIABILITY_DEFECT_CATALOG_PUBLICATION_PROJECTION_CACHE_EVENT_NON_ATOMIC`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_SEO_INDEXABILITY_LIFECYCLE_GATE`<br>`CONFIRMED_ROOT_PUBLIC_DATA_PROJECTION_DEFECT_SEO_META_RETURNS_FULL_RESOLVED_ENTITY_NO_PER_TYPE_PUBLIC_DTO`<br>`CONFIRMED_ROOT_PUBLIC_TRUTH_DEFECT_SEO_LLMSTXT_HARD_CODED_COMMERCIAL_COVERAGE_PAYMENT_CLAIMS_SWALLOWED_SOURCE_FAILURE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_SEO_PUBLIC_ENTITY_TYPE_ALLOWLIST`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_SEO_XML_ESCAPING`<br>`CONFIRMED_ROOT_SEO_CANONICAL_IDENTITY_DEFECT_PUBLIC_RESOLVER_MULTIPLE_SLUG_ID_NAME_KEYS_NO_TYPED_UNIQUE_COLLISION_PRECEDENCE_LOCALE_CANONICAL_CONTRACT`<br>`CONFIRMED_ROOT_SEO_DATA_INTEGRITY_DEFECT_CATALOG_CANONICAL_PATH_NO_PER_TYPE_SLUG_UNIQUENESS_POLICY`<br>`CONFIRMED_ROOT_SEO_DATA_INTEGRITY_DEFECT_SLUG_SIX_CHAR_ID_PREFIX_NO_COLLISION_RESERVATION_DETECTION`<br>`CONFIRMED_ROOT_TYPED_SEO_IDENTITY_DEFECT_HOME_CARE_RESOLVER_CROSS_TYPE_LABSERVICES_FALLBACK_RETURNS_FALSE_HOME_CARE_TARGET`

### `R-12D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 3 |
| Confirmed raw IDs | F-993<br>F-988<br>F-176 |
| Owners | Commercial Catalog Governance + Release<br>Commercial Catalog Governance<br>Patient Experience + Medication Catalog Governance |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Catalog import lacks quarantine, rollback and audit governance. Promotion publication/pricing lacks governed commercial catalog lifecycle. Wishlist accepts arbitrary item payload/identity and mutates user preference without canonical catalog validation, deleted/public eligibility reconciliation, atomic unique set semantics or minimum preference projection.

**Business/authority boundary.** Catalog imports are quarantined, validated, versioned and auditable with rollback/reconciliation before public publication. Promotions use authorized/versioned effective-window, canonical price/availability and audited publication/reconciliation. Patient wishlist is a bounded idempotent preference set that references canonical verified catalog identity only. Add/remove operations validate item existence/public eligibility, use atomic unique set semantics and minimum user projection; stale/deleted items are reconciled. Wishlist is never price, stock, availability, prescription eligibility or purchase authority.

**Frozen exact evidence.** `F-993: src/modules/compat/admin-spa.module.ts:1095–1140`<br>`F-988: src/modules/compat/admin-spa.module.ts:827–887`<br>`F-176: src/modules/users/users.service.ts:26–43`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_CATALOG_IMPORT_QUARANTINE_ROLLBACK_AUDIT`<br>`CONFIRMED_ROOT_CODE_DEFECT_PROMOTION_PUBLICATION_PRICE_GOVERNANCE`<br>`CONFIRMED_ROOT_DATA_INTEGRITY_DEFECT_USERS_WISHLIST_ARBITRARY_ITEM_NO_CATALOG_AVAILABILITY_ATOMIC_SET_SEMANTICS`

### `R-12E`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-069 |
| Owners | Search/Catalog + Patient Mobile + Privacy/Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Patient Mobile global search stores recent raw queries in AsyncStorage, sends uncancelled debounced requests to a broad search route, and routes heterogeneous results with unvalidated type/ID/schema context; there is no visible retention, purge, sensitivity classification, response ordering or safe handoff contract.

**Business/authority boundary.** Search queries and results use a typed, bounded, purpose-scoped server contract with validated result identity/type and authorization-safe projection. Client retention is opt-in and sensitivity-classified with bounded TTL/clear control; stale requests/responses are cancelled or ignored. Search and deep links never expose or retain PHI/family/private catalog context without current authorization.

**Frozen exact evidence.** `F-069: nabd_plus_patient_app/app/search/index.tsx:12–18,31–63,71–103,160–215`

**Constituent labels.** `CONFIRMED_ROOT_MOBILE_SEARCH_PRIVACY_QUERY_ROUTING_DEFECT_SENSITIVE_RETENTION_NO_ABORT_SCHEMA_CONTEXT_CONTRACT`

### `R-12F`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-251 |
| Owners | Commercial Catalog + Pricing + Patient Experience |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Home offers selects only status active campaigns and derives discounted percentage from unchecked price values, without effective window, approval/eligibility, currency/positive amount or nonzero original-price validation.

**Business/authority boundary.** A public promotion is a current, approved, effective-dated commercial catalog projection with validated positive canonical amounts/currency and provider/service eligibility. Display discount is derived safely from server policy and never establishes a checkout quote, coverage or payment amount.

**Frozen exact evidence.** `F-251: src/modules/home/home.service.ts:16–46`

**Constituent labels.** `CONFIRMED_ROOT_PROMOTION_PRICE_TRUTH_DEFECT_HOME_ACTIVE_STATUS_NO_EFFECTIVE_WINDOW_NONZERO_CURRENCY_RANGE_VALIDATION_DISCOUNT_DIVIDE_BY_ZERO_RISK`

### `R-12G`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-709 |
| Owners | Service Catalog + Provider Governance + Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Service catalog capability checks broad provider roles and ownership rows but does not establish active facility/service readiness, approved capability, professional/facility relation or state-specific authorization before exposing or changing catalog service data.

**Business/authority boundary.** Provider service catalog commands and read capability require verified actor role, provider/facility relationship, approved service capability and current operational state. A role string, ownership map or catalog row is not proof that a provider may offer, price, schedule or fulfill a clinical service.

**Frozen exact evidence.** `F-709: src/modules/service-catalog/service-catalog.module.ts:63–75`

**Constituent labels.** `CONFIRMED_ROOT_SECURITY_DEFECT_SERVICE_CATALOG_ACTIVE_PROVIDER_FACILITY_CAPABILITY_AUTHORIZATION`

### `R-12H`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-2549 |
| Owners | Catalog/Search/SEO + API Quality |
| Derived graph | F-217<br>F-2540 |

**Observed constituent causes.** Slug utility truncates/transliterates arbitrary Unicode names and reverses only a six-character hex ID prefix, but no collision, normalization, bounds or resolver test matrix proves canonical uniqueness across catalog entities.

**Business/authority boundary.** Public slug identity uses a canonical normalized uniqueness/reservation and resolver policy across entity types/locales, with deterministic full identity verification and collision/Unicode/length test coverage. A human-readable slug prefix is not authoritative resource identity.

**Frozen exact evidence.** `F-2549: src/common/slug.util.ts:21–46`

**Constituent labels.** `CONFIRMED_ROOT_TEST_GAP_ACTIVE_SLUG_COLLISION_UNICODE_BOUNDARY_RESOLVER_MATRIX`

### `R-12I`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-222 |
| Owners | SEO/Search + Event/Integration Platform + SRE |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** SEO IndexNow ping swallows remote failure and returns ok whenever a fetch function exists, with no idempotency key, durable submission status, retry/dead-letter or authoritative provider acknowledgement.

**Business/authority boundary.** External search-index publication is an idempotent durable command with approved public entity/version, bounded retry/reconciliation and truthful queued/succeeded/failed outcome. Fire-and-forget transport success is not indexing, publication or product availability truth.

**Frozen exact evidence.** `F-222: src/modules/seo/seo.service.ts:399–433`

**Constituent labels.** `CONFIRMED_ROOT_RELEASE_OBSERVABILITY_DEFECT_SEO_INDEXNOW_SWALLOWED_NETWORK_FAILURE_RETURNS_SUCCESS_NO_DURABLE_LIFECYCLE`

### `R-13A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 9 |
| Confirmed raw IDs | F-278<br>F-274<br>F-175<br>F-036<br>F-033<br>F-320<br>F-273<br>F-170<br>F-172 |
| Owners | Patient Data Rights + Identity/Privacy<br>Patient Mobile + Patient Data Rights + Identity/Privacy<br>Privacy/Data Rights + Legal |
| Derived graph | F-030<br>F-276 |

**Observed constituent causes.** Patient privacy/security settings, addresses, deletion and export flows lack a unified typed, versioned, idempotent lifecycle with default invariants, associated-data retention/hold, purpose scope and auditable delivery. Patient Mobile data-management screen displays export/portability/deletion and data-protection claims but uses no-op callbacks for the actions, hardcodes FHIR/HL7 and 24-hour delivery claims, and lacks a backend request/status/confirmation/error/hold lifecycle. Admin user deletion lacks legal-hold, transactional manifest and reconciliation controls.

**Business/authority boundary.** Patient data commands use validated field-level typed changes, reauthentication/version/idempotency as needed, authoritative address/default invariants, full associated-data retention/deletion/legal-hold manifests and scoped cancellable audited exports. Patient mobile data-rights surfaces invoke only a backend-authoritative, authenticated and purpose-scoped request lifecycle: export/portability and deletion actions require reauthentication where applicable, explicit informed confirmation, versioned request status, legal-hold/retention manifest, cancellation/partial/unavailable outcomes and auditable secure delivery. UI text, local callback, storage display or compliance claim never proves export, portability, deletion, regulatory compatibility or delivery. Data deletion honors legal holds and executes authorized versioned manifest/reconciliation with minimum audit evidence and explicit unavailable/partial outcome.

**Frozen exact evidence.** `F-278: src/modules/export/export.controller.ts:13–16,19–47`<br>`F-274: src/modules/export/export.service.ts:13–37`<br>`F-175: src/modules/users/data-retention.service.ts:15–40`<br>`F-036: nabd_plus_patient_app/app/profile/addresses.tsx:19–54,90–157`<br>`F-033: nabd_plus_patient_app/app/settings/data.tsx:18–63,84–150`<br>`F-320: src/modules/admin/admin.controller.ts:490–523`<br>`F-273: src/modules/export/export.service.ts:9–13,40–63`<br>`F-170: src/modules/users/users.service.ts:138–169,273–283`<br>`F-172: src/modules/users/users.addresses.controller.ts:11–57`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_EXPORT_REQUEST_DOWNLOAD_AUDIT_LIFECYCLE`<br>`CONFIRMED_ROOT_CODE_DEFECT_EXPORT_STREAMING_CAP_CANCEL_OPERATIONAL_SAFETY`<br>`CONFIRMED_ROOT_DATA_RETENTION_DELETION_DEFECT_USER_ONLY_CRON_DESPITE_ASSOCIATED_PII_CLAIM`<br>`CONFIRMED_ROOT_MOBILE_ADDRESS_LIFECYCLE_TRUTH_DEFECT_FAILURE_AS_EMPTY_UNHANDLED_ADD_ADDRESS_BOOKING_CART_SELECTION_BLOCKED`<br>`CONFIRMED_ROOT_MOBILE_DATA_MANAGEMENT_TRUTH_DEFECT_EMPTY_EXPORT_PORTABILITY_DELETION_CALLBACKS_LEGAL_COMPATIBILITY_CLAIMS`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_USER_DELETION_LEGAL_HOLD_TRANSACTION_MANIFEST_RECONCILIATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_EXPORT_ROW_SCOPE_PURPOSE_AUTHORIZATION`<br>`CONFIRMED_ROOT_PRIVACY_SECURITY_DEFECT_USERS_ARBITRARY_PRIVACY_SECURITY_SETTINGS_BROAD_SENSITIVE_PROFILE_RAW_BODY_NO_REAUTH_VERSION_AUDIT`<br>`CONFIRMED_ROOT_USER_ADDRESS_CRUD_ATOMICITY_VALIDATION_IDEMPOTENCY_DEFAULT_INVARIANT_DEFECT_RAW_BODY_WHOLE_ARRAY_MISSING_ROW_TRUTH`

### `R-13D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 15 |
| Confirmed raw IDs | F-2494<br>F-1527<br>F-1524<br>F-1525<br>F-527<br>F-2499<br>F-2498<br>F-1289<br>F-2486<br>F-2487<br>F-1519<br>F-1522<br>F-1301<br>F-2497<br>F-2505 |
| Owners | Observability + Privacy/Security + Backend Platform<br>Observability + Privacy<br>Operations/Observability + Security/Privacy |
| Derived graph | F-1309<br>F-1313<br>F-1520<br>F-1526<br>F-2485<br>F-2491<br>F-2493<br>F-3759 |

**Observed constituent causes.** Global Sentry filter assigns user ID, email and name to process-scoped Sentry context and classifies only direct HttpException instances, so wrapped domain errors can acquire incorrect 500 taxonomy while user/route telemetry minimization and reset boundaries are not established. Telemetry can leak query route labels/sensitive endpoint categories, create uncontrolled cardinality or hide timeout/backpressure/partial pipeline and HTTP-status semantic states. Operational telemetry, Sentry/context, logs and cache responses lack a consistent sensitive-field classification, redaction/clearance, cardinality/retention and safe public DTO/key policy. Cache bypass checks only Authorization header, so cookie/session-authenticated or other identity-context requests can enter a shared public cache without explicit opt-in/variance policy. Interceptor caches every unauthenticated GET from raw original URL without explicit public-route/response DTO allowlist or namespace-poisoning policy.

**Business/authority boundary.** Telemetry must apply a request-scoped, privacy-minimized and resettable identity/context projection; error classification must preserve the canonical sanitized status/category for wrapped domain failures. Reporting a captured exception never establishes availability or delivery truth. Telemetry uses normalized route templates and allowlisted low-cardinality labels, sensitive category/redaction policy, bounded nonblocking budgets/backpressure, explicit partial/drop/reconciliation state and canonical HTTP outcome taxonomy. Observability and caches collect/emit only allowlisted classified fields, clear request/user context deterministically, redact secrets/PHI/identifiers, bound metric labels and retention, and use explicit public DTO/cache namespace policies with auditable failure handling. Observability and caches use only explicit public-route eligibility and allowlisted public DTOs/namespaces; identity, session, cookie, purpose and location variance are fail-closed, classified/redacted and auditable.

**Frozen exact evidence.** `F-2494: src/common/sentry.filter.ts:21–29`<br>`F-1527: src/modules/ops/metrics.interceptor.ts:37–52`<br>`F-1524: src/modules/ops/metrics.interceptor.ts:33–45`<br>`F-1525: src/modules/ops/metrics.interceptor.ts:38–44`<br>`F-527: src/modules/ops/ops.module.ts:6–12`<br>`F-2499: src/common/redis-cache.interceptor.ts:30–35`<br>`F-2498: src/common/redis-cache.interceptor.ts:23–24`<br>`F-1289: src/main.ts:1–6,86–87`<br>`F-2486: src/common/sentry.filter.ts:21–29`<br>`F-2487: src/common/sentry.filter.ts:12–18`<br>`F-1519: src/modules/ops/metrics.interceptor.ts:15–21,26–29`<br>`F-1522: src/modules/ops/metrics.interceptor.ts:28–41`<br>`F-1301: src/main.ts:33–40`<br>`F-2497: src/common/redis-cache.interceptor.ts:18–20`<br>`F-2505: src/common/redis-cache.interceptor.ts:10–35`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_SENTRY_WRAPPED_DOMAIN_EXCEPTION_STATUS_TAXONOMY`<br>`CONFIRMED_ROOT_CODE_DEFECT_TELEMETRY_HTTP_STATUS_TAXONOMY_EDGE_SEMANTICS`<br>`CONFIRMED_ROOT_CODE_DEFECT_TELEMETRY_NONBLOCKING_TIMEOUT_BUDGET_BACKPRESSURE`<br>`CONFIRMED_ROOT_CODE_DEFECT_TELEMETRY_PIPELINE_PARTIAL_RESULT_RECONCILIATION`<br>`CONFIRMED_ROOT_GLOBAL_METRICS_TELEMETRY_PRIVACY_SAMPLING_FAILURE_POLICY_DEFECT_OPS_APP_INTERCEPTOR`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_REDIS_CACHE_PUBLIC_DTO_STATUS_PII_SCHEMA_ALLOWLIST`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_REDIS_CACHE_SANITIZED_CANONICAL_LOCATION_VARIANCE_KEY_NAMESPACE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_SENTRY_DSN_OBSERVABILITY_PII_SCRUBBED_USER_CONTEXT_POLICY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_SENTRY_EXCEPTION_CONTEXT_TOKEN_SECRET_PII_MEDICAL_REDACTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_SENTRY_REQUEST_SCOPED_USER_CONTEXT_CLEARANCE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_TELEMETRY_QUERY_STRING_ROUTE_LABEL_LEAK_CARDINALITY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_TELEMETRY_SENSITIVE_ENDPOINT_CATEGORY_REDACTION_POLICY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_MEMORY_MONGO_URI_STRUCTURED_REDACTED_LOGGING`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_REDIS_CACHE_COOKIE_SESSION_AUTH_AWARE_PUBLIC_OPTIN`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_REDIS_CACHE_EXPLICIT_PUBLIC_ROUTE_RESPONSE_NAMESPACE_POISONING_POLICY`

### `R-13E`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 6 |
| Confirmed raw IDs | F-941<br>F-192<br>F-942<br>F-1296<br>F-189<br>F-191 |
| Owners | Support + Client Platform + Privacy<br>Support Platform + Privacy |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Support/client/audit intake accepts raw or weakly classified settings, messages, attachments or request bodies without a typed, bounded, retention-classified and privacy-safe command/audit contract. Support routes create tickets using user_id while the ticket-list alias queries patient_id, producing divergent user views and no canonical owner/alias contract. Feedback endpoint reports success without persistence, dispatch, traceable unavailable outcome or privacy-classified durable command.

**Business/authority boundary.** Support/client inputs are typed, size/content-class bounded and classified before persistence; safe asset references replace raw attachments, retention/purpose/audit applies, and request-body capture is explicitly scoped/redacted. Support intake uses a canonical typed owner identity and single route/DTO contract; tickets, replies, settings and feedback are bounded classified commands with idempotency, retention/purpose/audit and truthful persisted outcome.

**Frozen exact evidence.** `F-941: src/modules/compat/compat.module.ts:370–417`<br>`F-192: src/modules/support/support.service.ts:91–97 ; src/schemas/support.schema.ts:43–56`<br>`F-942: src/modules/compat/compat.module.ts:419–444`<br>`F-1296: src/main.ts:89–95`<br>`F-189: src/modules/support/support.controller.ts:11–16,23–26 ; src/modules/support/support.service.ts:18–36,73–76`<br>`F-191: src/modules/support/support.service.ts:99–102`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_SUPPORT_MESSAGE_SAGA_IDEMPOTENCY_PRIVACY`<br>`CONFIRMED_ROOT_PRIVACY_DATA_CONTRACT_DEFECT_SUPPORT_SETTINGS_VALUE_PUSH_TOKEN_VALIDATION_TICKET_THREAD_ATTACHMENT_RETENTION_CLASSIFICATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_CLIENT_AUDIT_INGEST_GOVERNANCE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_RAW_BODY_CONTENT_TYPE_LIFECYCLE_REDACTION_BOUNDARY`<br>`CONFIRMED_ROOT_SUPPORT_DATA_INTEGRITY_DEFECT_DUPLICATE_CREATE_ALIAS_USER_ID_CREATE_PATIENT_ID_LIST_DIVERGENCE`<br>`CONFIRMED_ROOT_USER_TRUTH_DEFECT_SUPPORT_FEEDBACK_SUCCESS_WITHOUT_PERSISTENCE_DISPATCH_TRACEABLE_UNAVAILABLE`

### `R-14A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-035<br>F-038 |
| Owners | Patient Mobile + Identity/Auth<br>Patient Mobile + Booking Platform |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Mobile guest profile CTA routes sign-in/create actions through logout/welcome behavior instead of an authenticated entry contract. Mobile health screen fabricates appointment ID/modality or hides scheduling failure as empty state.

**Business/authority boundary.** A blocked/guest capability must route to the correct auth entry and preserve intended context; logout is available only for an authenticated session. Mobile must render the authoritative booking result or explicit unavailable/error state; it never invents appointment identity, modality or completion.

**Frozen exact evidence.** `F-035: nabd_plus_patient_app/app/profile/index.tsx:30–35,39–47,61–97,115`<br>`F-038: nabd_plus_patient_app/app/(tabs)/health.tsx:99–127,206–250,338–373`

**Constituent labels.** `CONFIRMED_ROOT_MOBILE_GUEST_AUTH_CTA_CONTRACT_DEFECT_SIGNIN_CREATE_HANDLER_LOGOUT_WELCOME`<br>`CONFIRMED_ROOT_MOBILE_HEALTH_HOME_CLINICAL_SCHEDULING_TRUTH_DEFECT_FAILURE_AS_EMPTY_FABRICATED_APPOINTMENT_ID_MODALITY`

### `R-14B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-068 |
| Owners | Patient Mobile + Service Discovery/Catalog + Domain owners |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Patient Mobile service hub publishes a static catalogue of service descriptions and direct routes without an actor/context-specific availability, eligibility, dependency, blocked-state or route-context contract.

**Business/authority boundary.** The service hub must consume a server-authoritative capability/discovery projection for the current actor, locale, geography, entitlement, clinical/safety and operational availability. It may navigate only to a compatible route/context and otherwise show an explicit blocked, unavailable or eligibility state. Static routes and marketing descriptions never establish that a service, provider, coverage, quote, emergency response or AI capability is available.

**Frozen exact evidence.** `F-068: nabd_plus_patient_app/app/services/index.tsx:18–67,69–106`

**Constituent labels.** `CONFIRMED_ROOT_MOBILE_SERVICES_HUB_CAPABILITY_TRUTH_DEFECT_STATIC_UNVERIFIED_DEEPLINKS_NO_AVAILABILITY_CONTEXT_BLOCKED_CONTRACT`

### `R-14C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-056 |
| Owners | Patient Mobile + Journey/Read-model Platform + Booking/Pharmacy/Insurance/Diagnostics/Home-care owners |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Patient Mobile unified orders joins heterogeneous endpoint responses locally, collapses differing lifecycle statuses into generic buckets and drives disparate detail routes from untyped IDs while swallowing individual source failures into a count; it has no canonical activity projection, item schema, freshness/error or resource-route authorization contract.

**Business/authority boundary.** A patient activity/order centre is an explicit server-authoritative projection contract. Every item must carry validated resource kind, owner-scoped canonical ID, current state/version, permitted next actions, timestamp/freshness and item-specific deep-link context. Partial-source outage, unknown state, expired/forbidden resource and routing failure are visible states; a client-side status bucket or synthesized route must not claim a booking, pharmacy order, insurance claim, return, home-care visit or emergency outcome.

**Frozen exact evidence.** `F-056: nabd_plus_patient_app/app/orders/index.tsx:17–32,74–180,221–257`

**Constituent labels.** `CONFIRMED_ROOT_MOBILE_UNIFIED_ORDERS_ROUTE_ID_ERROR_STATUS_CONTRACT_DEFECT`

### `R-15A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 9 |
| Confirmed raw IDs | F-531<br>F-1322<br>F-1324<br>F-1321<br>F-363<br>F-529<br>F-1320<br>F-361<br>F-360 |
| Owners | Platform Operations/SRE |
| Derived graph | F-165<br>F-530<br>F-1325 |

**Observed constituent causes.** Health/readiness surfaces conflate liveness and readiness, report static/fake Redis success or lack dependency deadlines, degraded truth and redacted failure evidence.

**Business/authority boundary.** Readiness is a measured dependency-aware contract separate from liveness, with explicit criticality, deadline/budget, safe degraded state, redacted evidence and no fake fallback PONG/always-OK result.

**Frozen exact evidence.** `F-531: src/modules/system-health/system-health.controller.ts:13–26,29–36`<br>`F-1322: src/health.controller.ts:31–56`<br>`F-1324: src/health.controller.ts:37–44`<br>`F-1321: src/health.controller.ts:41–44`<br>`F-363: src/modules/admin-web-core/controllers/system-health.controller.ts:6–25`<br>`F-529: src/modules/system-health/system-health.controller.ts:29–37`<br>`F-1320: src/health.controller.ts:31–57`<br>`F-361: src/modules/admin-web-core/controllers/system-health.controller.ts:19–26`<br>`F-360: src/modules/admin-web-core/controllers/system-health.controller.ts:3–17`

**Constituent labels.** `CONFIRMED_ROOT_AVAILABILITY_DEFECT_SYSTEM_HEALTH_REAL_PROBE_NO_EXPLICIT_DEADLINE_BUDGET_CACHE_RATE_POLICY`<br>`CONFIRMED_ROOT_INFORMATION_DISCLOSURE_DEFECT_PUBLIC_READINESS_DEPENDENCY_TOPOLOGY_STATUS`<br>`CONFIRMED_ROOT_OBSERVABILITY_DEFECT_READINESS_DEPENDENCY_FAILURE_EMPTY_CATCH_NO_REDACTED_METRICS`<br>`CONFIRMED_ROOT_OPERATIONS_DEFECT_READINESS_REDIS_PING_NO_DEADLINE`<br>`CONFIRMED_ROOT_RELEASE_CONTRACT_DEFECT_DUPLICATE_SYSTEM_HEALTH_STATIC_LIVENESS_READINESS_SEMANTIC_COLLAPSE`<br>`CONFIRMED_ROOT_RELEASE_READINESS_DEFECT_TERMINUS_READINESS_MIRRORS_LIVENESS_NO_STARTUP_DEPENDENCY_CONTRACT`<br>`CONFIRMED_ROOT_RELEASE_RELIABILITY_DEFECT_READINESS_HTTP_SUCCESS_AND_REDIS_FALLBACK_FAKE_HEALTH`<br>`CONFIRMED_ROOT_RELEASE_TRUTH_DEFECT_DUPLICATE_SYSTEM_HEALTH_ROUTE_STATIC_ALWAYS_OK_READINESS_NO_DEPENDENCIES`<br>`CONFIRMED_ROOT_RELEASE_TRUTH_DEFECT_DUPLICATE_SYSTEM_HEALTH_ROUTE_STATIC_FABRICATED_LIVENESS_DEPENDENCY_STATUS`

### `R-15B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 16 |
| Confirmed raw IDs | F-2131<br>F-2091<br>F-2106<br>F-2084<br>F-2061<br>F-1777<br>F-1786<br>F-1780<br>F-1784<br>F-1779<br>F-1782<br>F-1778<br>F-1783<br>F-1776<br>F-2076<br>F-4198 |
| Owners | SRE/Build Platform + Backend<br>Release Engineering/SRE<br>SRE/Build Platform + Security |
| Derived graph | F-2170<br>F-2192<br>F-1781<br>F-1785<br>F-1787<br>F-1788<br>F-1789<br>F-1790<br>F-2085<br>F-2168 |

**Observed constituent causes.** TypeScript source aliases are declared without a demonstrated compiled-runtime/Jest resolution contract; the resulting build, test and production image can resolve source paths differently from emitted output. Deployment/build artifacts lack one controlled reproducible target, supply-chain/port parity, preflight/migration/backup gate, post-deploy evidence, rollback recovery and immutable authorization record; developer lint may mutate source. Production Dockerfile uses mutable node:20-alpine tags for both builder and runtime, so the delivered base image cannot be reconstructed or verified from immutable provenance.

**Business/authority boundary.** Release build/test/provenance must use one pinned toolchain and explicit source-to-emitted path resolution contract. CI must compile/package and exercise both alias and non-alias imports from the production artifact; compilation declaration alone does not prove runtime parity. Release uses a declared authoritative artifact and non-mutating verification path, pinned dependencies, port/config parity, approved target/preflight/migration/backup gates, time-bounded acceptance evidence, tested rollback and immutable actor/audit record. Release artifact provenance requires a policy-approved immutable base digest, tracked SBOM/vulnerability/rebuild evidence and an auditable promotion record. A Dockerfile base tag is not release readiness or runtime verification.

**Frozen exact evidence.** `F-2131: tsconfig.json:22–24`<br>`F-2091: Dockerfile:1–15 ; Dockerfile.production:1–37`<br>`F-2106: docker-compose.yml:6–7 ; Dockerfile:13 ; Dockerfile.production:32–33`<br>`F-2084: Dockerfile.production:32–36`<br>`F-2061: package.json:6–13`<br>`F-1777: scripts/deploy.sh:12–18`<br>`F-1786: scripts/deploy.sh:7–36`<br>`F-1780: scripts/deploy.sh:20–28`<br>`F-1784: scripts/deploy.sh:27–33`<br>`F-1779: scripts/deploy.sh:20–22`<br>`F-1782: scripts/deploy.sh:27–36`<br>`F-1778: scripts/deploy.sh:7–28`<br>`F-1783: scripts/deploy.sh:7–36`<br>`F-1776: scripts/deploy.sh:7–10,12–28`<br>`F-2076: Dockerfile.production:1–2,12–13`<br>`F-4198: e2e/package.json:1`

**Constituent labels.** `CONFIRMED_ROOT_BUILD_ALIAS_PARITY_DEFECT_TYPESCRIPT_ALIAS_NO_RUNTIME_COMPILED_OUTPUT_CONTRACT`<br>`CONFIRMED_ROOT_DEPLOYMENT_CONTRACT_DEFECT_TWO_DOCKERFILES_NO_AUTHORITATIVE_SELECTION_EQUIVALENCE_GATE`<br>`CONFIRMED_ROOT_DEPLOYMENT_DEFECT_COMPOSE_BACKEND_PORT_8002_DOCKER_APP_PORT_3000_MISMATCH`<br>`CONFIRMED_ROOT_DEPLOYMENT_DEFECT_DOCKER_COMPOSE_8002_MAPPING_DOCKER_3000_EXPOSE_LISTEN_PARITY`<br>`CONFIRMED_ROOT_DEVELOPER_WORKFLOW_DEFECT_LINT_SCRIPT_MUTATES_SOURCE_WITH_FIX`<br>`CONFIRMED_ROOT_RELEASE_ARTIFACT_SUPPLY_CHAIN_DEFECT`<br>`CONFIRMED_ROOT_RELEASE_AUTHORIZED_IMMUTABLE_RECORD_DEFECT`<br>`CONFIRMED_ROOT_RELEASE_BACKUP_COMPATIBILITY_DEFECT`<br>`CONFIRMED_ROOT_RELEASE_FALSE_COMPLETION_DEFECT`<br>`CONFIRMED_ROOT_RELEASE_MIGRATION_GATE_DEFECT`<br>`CONFIRMED_ROOT_RELEASE_POST_DEPLOY_ACCEPTANCE_DEFECT`<br>`CONFIRMED_ROOT_RELEASE_PREFLIGHT_DEFECT`<br>`CONFIRMED_ROOT_RELEASE_ROLLBACK_RECOVERY_DEFECT`<br>`CONFIRMED_ROOT_RELEASE_TARGET_AUTHORIZATION_DEFECT`<br>`CONFIRMED_ROOT_SUPPLY_CHAIN_DEFECT_DOCKER_MUTABLE_NODE_BASE_TAG_NO_DIGEST_PROVENANCE`<br>`CONFIRMED_ROOT_SUPPLY_CHAIN_DEFECT_E2E_CARET_DEPENDENCIES_NO_LOCKFILE`

### `R-15C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 7 |
| Confirmed raw IDs | F-939<br>F-979<br>F-1854<br>F-1853<br>F-1852<br>F-1849<br>F-892 |
| Owners | Release/Data Governance + Clinical Content<br>Release/Data Governance<br>Release Engineering + Data Governance |
| Derived graph | F-1855<br>F-1856<br>F-1859<br>F-1860<br>F-1861<br>F-1862<br>F-1863 |

**Observed constituent causes.** Nutrition seed data can be represented as runtime-verified without controlled reference-data provenance. Runtime specialty seed/reference data has no controlled lifecycle. Catalog migration tooling lacks approved target/operator binding, explicit state predicates, dry-run/reconciliation and atomic recovery/audit lifecycle. Doctor demo seed lacks production guard/provenance.

**Business/authority boundary.** Clinical/reference seed data is target-approved, source/provenance/versioned, validation/reconciliation-gated and cannot be labeled verified without evidence. Reference-data seeding is target-bound, versioned, idempotent, reconciled and auditable. Migrations are approved target-bound versioned operations with explicit predicates, dry-run and reconciliation artifacts, atomic/batched recovery plan, idempotency and immutable operator audit. Reference/demo data is target-guarded, explicitly non-production or approved/versioned/provenanced with no false verified production claim.

**Frozen exact evidence.** `F-939: src/modules/compat/compat.module.ts:236–266`<br>`F-979: src/modules/compat/admin-spa.module.ts:395–430`<br>`F-1854: scripts/backfill-catalog-governance.ts:73–101`<br>`F-1853: scripts/backfill-catalog-governance.ts:58–70`<br>`F-1852: scripts/backfill-catalog-governance.ts:48–56`<br>`F-1849: scripts/backfill-catalog-governance.ts:119–143`<br>`F-892: src/modules/doctors/doctors.module.ts:10–17,42–49`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_RUNTIME_SEED_FALSE_VERIFIED_NUTRITION_DATA`<br>`CONFIRMED_ROOT_CODE_DEFECT_RUNTIME_SEED_SPECIALTIES_REFERENCE_DATA`<br>`CONFIRMED_ROOT_MIGRATION_ATOMICITY_RECOVERY_AUDIT_DEFECT`<br>`CONFIRMED_ROOT_MIGRATION_DRY_RUN_RECONCILIATION_DEFECT`<br>`CONFIRMED_ROOT_MIGRATION_STATE_PREDICATE_DEFECT`<br>`CONFIRMED_ROOT_MIGRATION_TARGET_OPERATOR_AUTHORIZATION_DEFECT`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_DOCTORS_DEMO_SEED_PRODUCTION_GUARD_PROVENANCE`

### `R-15D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 7 |
| Confirmed raw IDs | F-1875<br>F-1882<br>F-1874<br>F-1873<br>F-1878<br>F-1879<br>F-1880 |
| Owners | SRE + Data Protection |
| Derived graph | F-1876<br>F-1877<br>F-1881<br>F-1883<br>F-1884<br>F-1885<br>F-1887 |

**Observed constituent causes.** Backup/restore tooling lacks target safety, protected content-addressed retention/provenance, restore authorization/archive compatibility, verification/recovery and access audit lifecycle.

**Business/authority boundary.** Backups are encrypted protected artifacts with provenance/retention and access audit; restore is separately authorized, target-bound, compatibility/integrity-verified, rehearsed in isolation and produces recovery evidence.

**Frozen exact evidence.** `F-1875: scripts/db-backup-restore.sh:21–34`<br>`F-1882: scripts/db-backup-restore.sh:1–60`<br>`F-1874: scripts/db-backup-restore.sh:6,21–27`<br>`F-1873: scripts/db-backup-restore.sh:4–6`<br>`F-1878: scripts/db-backup-restore.sh:36–50`<br>`F-1879: scripts/db-backup-restore.sh:36–56`<br>`F-1880: scripts/db-backup-restore.sh:43–50`

**Constituent labels.** `CONFIRMED_ROOT_BACKUP_CRYPTOGRAPHIC_PROVENANCE_RETENTION_DEFECT`<br>`CONFIRMED_ROOT_BACKUP_PII_ACCESS_AUDIT_LIFECYCLE_DEFECT`<br>`CONFIRMED_ROOT_BACKUP_PII_ARTIFACT_PROTECTION_DEFECT`<br>`CONFIRMED_ROOT_BACKUP_TARGET_SAFETY_DEFECT`<br>`CONFIRMED_ROOT_DESTRUCTIVE_RESTORE_AUTHORIZATION_DEFECT`<br>`CONFIRMED_ROOT_RESTORE_TARGET_RECOVERY_DEFECT`<br>`CONFIRMED_ROOT_TRUSTED_COMPATIBLE_RESTORE_ARCHIVE_DEFECT`

### `R-15E`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 10 |
| Confirmed raw IDs | F-1352<br>F-1355<br>F-1356<br>F-1362<br>F-1360<br>F-1353<br>F-1351<br>F-1354<br>F-1361<br>F-1357 |
| Owners | Release Engineering/SRE + Security |
| Derived graph | F-1358 |

**Observed constituent causes.** Production verifier has configuration-name drift, narrow/false capability coverage, full app side effects, incomplete Mongo/Redis/integration proofs, false-ready messaging and weak deadline/lock/cleanup/redacted artifact/exit taxonomy control.

**Business/authority boundary.** Production verification is an isolated non-mutating, target-bound and lock-budgeted check matrix; it validates exact declared configuration, dependency identity/TLS/auth/index/migration readiness, bounded Redis/integration/webhook/idempotency capabilities, emits structured redacted evidence/exit taxonomy, always cleans context, and never claims GO from partial checks.

**Frozen exact evidence.** `F-1352: src/scripts/verify-production.ts:12–38`<br>`F-1355: src/scripts/verify-production.ts:26–30`<br>`F-1356: src/scripts/verify-production.ts:12–22`<br>`F-1362: src/scripts/verify-production.ts:7–49`<br>`F-1360: src/scripts/verify-production.ts:24,46–49`<br>`F-1353: src/scripts/verify-production.ts:24 ; src/app.module.ts:135–256`<br>`F-1351: src/scripts/verify-production.ts:12–24 ; src/app.module.ts:156–159`<br>`F-1354: src/scripts/verify-production.ts:32–36`<br>`F-1361: src/scripts/verify-production.ts:46–49`<br>`F-1357: src/scripts/verify-production.ts:40–45`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_PRODUCTION_VERIFIER_CAPABILITY_VALIDATION_MATRIX_NARROW_FALSE_COVERAGE`<br>`CONFIRMED_ROOT_CODE_DEFECT_PRODUCTION_VERIFIER_DATABASE_IDENTITY_TLS_AUTH_INDEX_MIGRATION_PERMISSION`<br>`CONFIRMED_ROOT_CODE_DEFECT_PRODUCTION_VERIFIER_ENABLED_INTEGRATION_CAPABILITY_WEBHOOK_IDEMPOTENCY_PROOF`<br>`CONFIRMED_ROOT_CODE_DEFECT_PRODUCTION_VERIFIER_EXECUTION_LOCK_BUDGET_COORDINATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_PRODUCTION_VERIFIER_FAILURE_FINALLY_CLOSE_CONTEXT`<br>`CONFIRMED_ROOT_CODE_DEFECT_PRODUCTION_VERIFIER_FULL_APP_CONTEXT_SIDE_EFFECT_GRAPH`<br>`CONFIRMED_ROOT_CODE_DEFECT_PRODUCTION_VERIFIER_MONGO_URI_MONGO_URL_ENV_CONTRACT_DRIFT`<br>`CONFIRMED_ROOT_CODE_DEFECT_PRODUCTION_VERIFIER_REDIS_PING_DEADLINE_TIMEOUT`<br>`CONFIRMED_ROOT_CODE_DEFECT_PRODUCTION_VERIFIER_STRUCTURED_REDACTED_CHECK_ARTIFACT_EXIT_TAXONOMY`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_PRODUCTION_VERIFIER_FALSE_GO_READY_MESSAGE`

### `R-15F`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 5 |
| Confirmed raw IDs | F-4200<br>F-4205<br>F-4199<br>F-4201<br>F-4203 |
| Owners | Release/Test Engineering + SRE |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** E2E harness lacks canonical reproducible CI entrypoint, Node/package-manager pin, machine-readable evidence/coverage contract, exclusive Redis namespace/teardown and bounded boot/signal/timeout cleanup lifecycle.

**Business/authority boundary.** E2E tests use pinned lockfile/runtime/package-manager, canonical CI command and machine-readable report/coverage contract; every run has exclusive namespace/resources, bounded boot/timeouts, reliable signal cleanup/teardown and cannot affect shared/runtime environments.

**Frozen exact evidence.** `F-4200: e2e/package.json:1`<br>`F-4205: e2e/package.json:1`<br>`F-4199: e2e/package.json:1`<br>`F-4201: e2e/package.json:1`<br>`F-4203: e2e/package.json:1`

**Constituent labels.** `CONFIRMED_ROOT_TEST_EVIDENCE_DEFECT_E2E_NO_MACHINE_READABLE_REPORT_COVERAGE_CONTRACT`<br>`CONFIRMED_ROOT_TEST_LIFECYCLE_DEFECT_E2E_BOOT_NO_TEARDOWN_SIGNAL_TIMEOUT_CLEANUP`<br>`CONFIRMED_ROOT_TEST_REPRODUCIBILITY_DEFECT_E2E_NO_CANONICAL_PACKAGE_SCRIPT_CI_ENTRYPOINT`<br>`CONFIRMED_ROOT_TEST_REPRODUCIBILITY_DEFECT_E2E_NO_NODE_PACKAGE_MANAGER_ENGINE_PIN`<br>`CONFIRMED_ROOT_TEST_SAFETY_DEFECT_E2E_FIXED_LOCAL_REDIS_PORT_NO_EXCLUSIVE_NAMESPACE_TEARDOWN_GUARD`

### `R-15G`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-1302<br>F-1290 |
| Owners | SRE/Platform + Backend Bootstrap + Domain owners<br>SRE/Platform + Backend Bootstrap |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** AppModule composes a broad static graph of production, compatibility, operations and feature modules without a reviewed environment capability/isolation contract, so module activation/dependency expectations cannot be established from an explicit per-environment manifest. Bootstrap catches requested MongoMemoryServer startup failure, logs it and continues with a potentially unintended database configuration instead of returning a bounded, fail-closed startup outcome for that selected dependency mode.

**Business/authority boundary.** Each declared environment/dependency mode has an explicit allowlist, required configuration, bounded startup deadline and fail-closed outcome. The process must not continue with a substituted, local, unknown or partially initialized datastore after a requested dependency fails; a startup outcome is not readiness proof.

**Frozen exact evidence.** `F-1302: src/app.module.ts:135–256`<br>`F-1290: src/main.ts:27–42`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_APP_RUNTIME_CAPABILITY_ENVIRONMENT_GRAPH_ISOLATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_MEMORY_MONGO_REQUESTED_STARTUP_FAILURE_FAIL_CLOSED`

### `R-16A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 10 |
| Confirmed raw IDs | F-1523<br>F-1529<br>F-437<br>F-443<br>F-439<br>F-438<br>F-442<br>F-440<br>F-441<br>F-436 |
| Owners | Platform Reliability + Observability<br>Platform Reliability + Security |
| Derived graph | F-196<br>F-286<br>F-2568 |

**Observed constituent causes.** Telemetry Redis dependency lacks typed startup contract and truthful failure visibility. Redis degrades to per-process non-atomic/fake-ready primitives, has ambiguous connection health, lossy pubsub, unsafe rate-limit failover, unbounded key scanning and untyped corruption semantics.

**Business/authority boundary.** Redis-dependent telemetry declares typed startup/dependency contract and reports actual bounded failure/degraded state; it never masks Redis failure as health/success. Distributed locks, idempotency, sessions, rate limits and events fail closed or enter explicit degraded mode; Redis health is per dependency with deadlines, storage access is bounded/typed, and events use durable outbox/replay rather than silent pubsub loss.

**Frozen exact evidence.** `F-1523: src/modules/ops/metrics.interceptor.ts:33–45`<br>`F-1529: src/modules/ops/metrics.interceptor.ts:33–36`<br>`F-437: src/modules/redis/redis.service.ts:139–159,218–277`<br>`F-443: src/modules/redis/redis.service.ts:298–305 ; src/modules/redis/redis.service.ts:105–167`<br>`F-439: src/modules/redis/redis.service.ts:279–296`<br>`F-438: src/modules/redis/redis.service.ts:28–59`<br>`F-442: src/modules/redis/redis.service.ts:161–167`<br>`F-440: src/modules/redis/redis.service.ts:315–374`<br>`F-441: src/modules/redis/redis.service.ts:308–313`<br>`F-436: src/modules/redis/redis.service.ts:15–23,105–159,308–313`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_TELEMETRY_REDIS_FAILURE_HEALTH_VISIBILITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_TELEMETRY_TYPED_REDIS_CLIENT_STARTUP_CONTRACT`<br>`CONFIRMED_ROOT_CONCURRENCY_DEFECT_REDIS_FALLBACK_NON_ATOMIC_STATEFUL_PRIMITIVES`<br>`CONFIRMED_ROOT_DATA_CONTRACT_DEFECT_REDIS_JSON_CORRUPTION_UNTYPED_SERIALIZATION_POLICY`<br>`CONFIRMED_ROOT_EVENT_RELIABILITY_DEFECT_REDIS_PUBSUB_SILENT_OUTAGE_DROP_NO_DURABLE_REPLAY`<br>`CONFIRMED_ROOT_OBSERVABILITY_DEFECT_REDIS_SHARED_READY_FLAG_MULTI_CONNECTION_HEALTH_AMBIGUITY`<br>`CONFIRMED_ROOT_PERFORMANCE_SECURITY_DEFECT_REDIS_UNBOUNDED_KEYS_ENUMERATION`<br>`CONFIRMED_ROOT_RELIABILITY_DEFECT_REDIS_RAW_FALLBACK_PARTIAL_SEMANTICS_FAKE_PONG`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_REDIS_RATE_LIMIT_NON_ATOMIC_FAILOVER_DIVERGENCE`<br>`CONFIRMED_ROOT_SECURITY_RELIABILITY_DEFECT_REDIS_PROCESS_LOCAL_FALLBACK_FOR_DISTRIBUTED_PRIMITIVES`

### `R-16B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 5 |
| Confirmed raw IDs | F-2504<br>F-2500<br>F-2506<br>F-2501<br>F-2502 |
| Owners | Platform Reliability + Data Access<br>Platform Reliability + Data Access + Commercial Domain Owners |
| Derived graph | F-2503 |

**Observed constituent causes.** Redis response caching lacks corrupt-value safe-miss, single-flight/size/serialization budget, ordered async-write failure visibility and stale/corruption invalidation metrics. Generic response caching has no domain-aware eligibility/invalidation contract for ranking, availability, price or authorization-sensitive truth and may serve stale/incorrect commercial state.

**Business/authority boundary.** Cache entries use bounded normalized keys/serialization, safe miss on corruption, single-flight and resource budgets, explicit write/error sequencing, stale/invalidation/reconciliation metrics and never override authoritative state.

**Frozen exact evidence.** `F-2504: src/common/redis-cache.interceptor.ts:30–36`<br>`F-2500: src/common/redis-cache.interceptor.ts:24–28,31–35`<br>`F-2506: src/common/redis-cache.interceptor.ts:23–35`<br>`F-2501: src/common/redis-cache.interceptor.ts:23–35`<br>`F-2502: src/common/redis-cache.interceptor.ts:30–35`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_REDIS_CACHE_ASYNC_WRITE_FAILURE_OBSERVABILITY_SEQUENCING`<br>`CONFIRMED_ROOT_CODE_DEFECT_REDIS_CACHE_CORRUPT_VALUE_READ_WRITE_ERROR_SAFE_MISS_POLICY`<br>`CONFIRMED_ROOT_CODE_DEFECT_REDIS_CACHE_HIT_MISS_STALE_CORRUPTION_INVALIDATION_PRIVACY_METRICS`<br>`CONFIRMED_ROOT_CODE_DEFECT_REDIS_CACHE_SINGLE_FLIGHT_SIZE_SERIALIZATION_BUDGET`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_REDIS_CACHE_RANKING_AVAILABILITY_PRICE_AUTHORIZATION_INVALIDATION`

### `R-16C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 12 |
| Confirmed raw IDs | F-772<br>F-765<br>F-762<br>F-558<br>F-571<br>F-573<br>F-602<br>F-873<br>F-766<br>F-603<br>F-190<br>F-761 |
| Owners | Workflow Platform + Domain Owners<br>Workflow Platform + Content Engagement<br>Identity/Profile Platform + Product Operations<br>Workflow Platform + Custom Services Operations<br>Workflow Platform + Provider Operations<br>Workflow Platform + Security<br>Workflow Platform + Support Operations |
| Derived graph | F-731<br>F-1277<br>F-1285<br>F-604<br>F-606 |

**Observed constituent causes.** Workflow-engine mutations and match orchestration lack atomic command/state/event persistence, concurrency/idempotency and durable outcome/reconciliation contract. Legacy bookmark toggle uses read-delete-or-insert sequencing without idempotency key, unique command state or atomic concurrency contract. Tour complete endpoint persists arbitrary caller-supplied step ID with no server-owned registry, active version/locale validation or transition eligibility. Tour profile mutation accepts raw body scalar and updates user progress without typed command/idempotency, CAS/version, rate policy or actor/activity audit. Custom-service create accepts a raw request and persists a new active patient intent each time without unique/replay/idempotency protection or canonical intent correlation. Provider leave creation/cancellation uses non-idempotent commands and returns cancellation success without matched-count/state/reconciliation evidence. Workflow engine error path exposes unsafe details. Custom-service status update allows any enum transition by any caller reaching the route, without assignment/facility authority, transition graph, version/CAS/idempotency, actor/reason audit or durable outcome delivery. Admin ticket status/assignment mutates document fields directly without transition policy, version/CAS, idempotency, assignee validation, actor/reason audit or durable notification/outbox.

**Business/authority boundary.** Workflow commands use typed authoritative aggregate transitions with version/CAS/idempotency, atomic state plus outbox/event persistence, durable match outcomes and reconciliation/audit for retries and failures. User state commands use a stable idempotency key and owner-scoped unique state/atomic upsert-or-transition with truthful replay outcome and audit; a UI toggle is never the source of command truth. Onboarding progress is a server-owned versioned state machine: only allowlisted steps from the active version/locale registry may transition, owner state is read and written through typed idempotent CAS commands with truthful matched/modified outcome, bounded rate policy and immutable activity audit. Migration/reset/upgrade and client response shape remain explicit product/version policy. Custom-service requests are typed patient-owned intent aggregates with server-generated idempotency/unique active-intent protection, approved safe assets and canonical assignment. Status changes use a valid state graph, assigned facility/provider capability and purpose, version/CAS/idempotency, immutable actor/reason audit and durable outbox/reconciliation; controller response never proves service fulfillment or notification delivery. Provider operational commands use typed aggregate ownership/scope, stable idempotency keys, version/CAS state transitions, truthful matched/replay outcomes and durable audit/outbox/reconciliation. Workflow failures expose typed redacted outcomes with internal correlation/audit and no sensitive aggregate/event data leakage. Workflow commands use typed authoritative aggregate transitions with version/CAS/idempotency, valid assignee/owner scope, immutable actor/reason audit and durable outcome/outbox/reconciliation.

**Frozen exact evidence.** `F-772: src/modules/workflow-engine/workflow-engine.module.ts:481–515`<br>`F-765: src/modules/workflow-engine/workflow-engine.module.ts:226–258,284–297`<br>`F-762: src/modules/workflow-engine/workflow-engine.module.ts:239–274,303–320`<br>`F-558: src/modules/articles/articles.module.ts:175–187`<br>`F-571: src/modules/tour/tour.controller.ts:15–17 ; src/modules/tour/tour.service.ts:16–20`<br>`F-573: src/modules/tour/tour.controller.ts:15–17 ; src/modules/tour/tour.service.ts:16–21`<br>`F-602: src/modules/custom-services/custom-services.service.ts:15–34`<br>`F-873: src/modules/provider-ops/provider-ops.module.ts:40–81,528–532`<br>`F-766: src/modules/workflow-engine/workflow-engine.module.ts:259–274`<br>`F-603: src/modules/custom-services/custom-services.service.ts:58–70`<br>`F-190: src/modules/support/support.service.ts:57–70`<br>`F-761: src/modules/workflow-engine/workflow-engine.module.ts:226–277`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_MATCH_ORCHESTRATION_DURABILITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_WORKFLOW_CONCURRENCY_AND_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_WORKFLOW_EVENT_DURABILITY`<br>`CONFIRMED_ROOT_DATA_CONCURRENCY_DEFECT_LEGACY_ARTICLE_BOOKMARK_TOGGLE_DUPLICATE_NONIDEMPOTENT_READ_DELETE_INSERT`<br>`CONFIRMED_ROOT_DATA_CONTRACT_DEFECT_TOUR_CALLER_STEP_ID_STORED_NO_SERVER_OWNED_REGISTRY_VERSION_VALIDATION`<br>`CONFIRMED_ROOT_GOVERNANCE_DEFECT_TOUR_PROFILE_MUTATION_NO_TYPED_IDEMPOTENCY_AUDIT_RATE_CONTRACT`<br>`CONFIRMED_ROOT_IDEMPOTENCY_DEFECT_CUSTOM_SERVICES_CREATE_NO_UNIQUE_PATIENT_INTENT_REPLAY_PROTECTION`<br>`CONFIRMED_ROOT_PROVIDER_COMMAND_REPLAY_DEFECT_LEAVE_CREATE_CANCEL_NO_IDEMPOTENCY_CANCEL_SUCCESS_WITHOUT_MATCHED_COUNT_RECONCILIATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_WORKFLOW_ERROR_REDACTION`<br>`CONFIRMED_ROOT_STATE_GOVERNANCE_DEFECT_CUSTOM_SERVICES_STATUS_ANY_ENUM_NO_ASSIGNMENT_TRANSITION_CAS_IDEMPOTENCY_AUDIT`<br>`CONFIRMED_ROOT_SUPPORT_STATE_GOVERNANCE_DEFECT_ADMIN_STATUS_ASSIGNMENT_NO_TRANSITION_CAS_IDEMPOTENCY_ACTOR_REASON_AUDIT`<br>`CONFIRMED_ROOT_WORKFLOW_MUTATION_EVENT_DURABILITY_ATOMICITY_DEFECT`

### `R-16D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 11 |
| Confirmed raw IDs | F-2831<br>F-2827<br>F-2824<br>F-2826<br>F-323<br>F-2832<br>F-2822<br>F-322<br>F-2830<br>F-2825<br>F-2821 |
| Owners | Approval Workflow + Domain Owners + Privacy<br>Approval Workflow + Privacy |
| Derived graph | F-2823<br>F-2829 |

**Observed constituent causes.** Approval-workflow requests lack a consistent typed actor/owner boundary, versioned atomic allocation, immutable allowlisted change data, exhaustive service/entity routing, fail-closed unknown type, safe PHI attachment provenance, durable publication outbox and scoped queue projections. Provider delta approval can report success without applied state and lacks redacted cursor projection/read audit.

**Business/authority boundary.** Approval requests use typed authenticated actor and owner/admin scope, version/CAS allocation, allowlisted immutable entity change sets, exhaustive fail-closed routing, approved safe attachments, durable publication/outbox and minimum necessary cursor-paginated request views with audit. Approval outcomes are canonical applied/versioned states with truthful result; queues expose minimum redacted bounded projections with audited reads.

**Frozen exact evidence.** `F-2831: src/modules/approval-workflow/approval-workflow.module.ts:61–63`<br>`F-2827: src/modules/approval-workflow/approval-workflow.module.ts:117–164`<br>`F-2824: src/modules/approval-workflow/approval-workflow.module.ts:41–58`<br>`F-2826: src/modules/approval-workflow/approval-workflow.module.ts:142–152`<br>`F-323: src/modules/admin/admin.controller.ts:555–561`<br>`F-2832: src/modules/approval-workflow/approval-workflow.module.ts:65–67`<br>`F-2822: src/modules/approval-workflow/approval-workflow.module.ts:69–73,190–193`<br>`F-322: src/modules/admin/admin.controller.ts:555–575`<br>`F-2830: src/modules/approval-workflow/approval-workflow.module.ts:29–58`<br>`F-2825: src/modules/approval-workflow/approval-workflow.module.ts:75–114`<br>`F-2821: src/modules/approval-workflow/approval-workflow.module.ts:174–199`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_APPROVAL_PENDING_QUEUE_CURSOR_SCOPE_PROJECTION`<br>`CONFIRMED_ROOT_CODE_DEFECT_APPROVAL_PUBLICATION_ENTITY_REQUEST_OUTBOX_SAGA`<br>`CONFIRMED_ROOT_CODE_DEFECT_APPROVAL_REQUEST_VERSION_ATOMIC_ALLOCATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_APPROVAL_WORKFLOW_UNKNOWN_SERVICE_TYPE_FAIL_CLOSED`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_PROVIDER_DELTA_REDACTED_CURSOR_PROJECTION_READ_AUDIT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_APPROVAL_MY_REQUESTS_CURSOR_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_APPROVAL_REQUEST_DETAIL_OWNER_ADMIN_AUTHORIZATION`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_ADMIN_PROVIDER_DELTA_APPROVAL_FALSE_SUCCESS_NO_APPLY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_APPROVAL_CHANGE_DATA_CONTENT_PHI_ATTACHMENT_PROVENANCE_BOUNDARY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_APPROVAL_WORKFLOW_ENTITY_PATCH_ALLOWLIST_IMMUTABLE_FIELDS`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_APPROVAL_WORKFLOW_TYPED_DTO_ACTOR_VALIDATION`

### `R-16E`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 6 |
| Confirmed raw IDs | F-770<br>F-1485<br>F-956<br>F-769<br>F-771<br>F-767 |
| Owners | Workflow Platform + Provider Operations + Privacy<br>Workflow/Provider Matching |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Provider matching lacks minimum provider projection, validated location, authoritative availability and bounded/reconciled matching workload. Doctor publication treats availability as uncontrolled runtime state. Provider availability falls back to false online truth.

**Business/authority boundary.** Provider matching uses active verified provider/facility/capability/availability/location records, minimum projections, bounded query/workload behavior and durable reconciled match outcomes; no cached/client claim is authoritative. Public/provider matching availability derives from authoritative verified time-bound state with explicit unavailable/degraded outcome, never publication default. Matching/availability uses authoritative time-bound provider state with explicit unknown/degraded outcome, never default online.

**Frozen exact evidence.** `F-770: src/modules/workflow-engine/workflow-engine.module.ts:442–447`<br>`F-1485: src/modules/doctors/doctors.schemas.ts:23–39`<br>`F-956: src/modules/compat/compat.module.ts:1082–1107`<br>`F-769: src/modules/workflow-engine/workflow-engine.module.ts:449–458`<br>`F-771: src/modules/workflow-engine/workflow-engine.module.ts:354–357,393–409,474–478`<br>`F-767: src/modules/workflow-engine/workflow-engine.module.ts:354–357,460–471`

**Constituent labels.** `CONFIRMED_ROOT_BUSINESS_CONTRACT_DEFECT_PROVIDER_AVAILABILITY_TRUTH`<br>`CONFIRMED_ROOT_CODE_DEFECT_DOCTOR_PUBLICATION_AVAILABILITY_RUNTIME_STATE_GUARD`<br>`CONFIRMED_ROOT_CODE_DEFECT_PROVIDER_AVAILABILITY_FALSE_ONLINE_DEFAULT`<br>`CONFIRMED_ROOT_CODE_DEFECT_PROVIDER_LOCATION_VALIDATION`<br>`CONFIRMED_ROOT_PERFORMANCE_DEFECT_PROVIDER_MATCH_N_PLUS_ONE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PROVIDER_MATCH_PROJECTION`

### `R-16F`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 5 |
| Confirmed raw IDs | F-703<br>F-697<br>F-701<br>F-698<br>F-702 |
| Owners | Platform Reliability + Domain Owners |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Consistency reconciliation uses weak duplicate/invariant/stuck heuristics, lacks bounded coverage/cursor and SLA recovery, and has no durable approved checkpointed job lifecycle.

**Business/authority boundary.** Consistency work uses explicit per-domain invariants and overlap confidence, bounded resumable coverage, time/SLA recovery classification, durable checkpointed approved jobs and immutable reconciliation evidence; it never infers or changes truth silently.

**Frozen exact evidence.** `F-703: src/modules/consistency/consistency.module.ts:126–157`<br>`F-697: src/modules/consistency/consistency.module.ts:34–59`<br>`F-701: src/modules/consistency/consistency.module.ts:77–92`<br>`F-698: src/modules/consistency/consistency.module.ts:61–109`<br>`F-702: src/modules/consistency/consistency.module.ts:111–120`

**Constituent labels.** `CONFIRMED_ROOT_AUDIT_OPERATIONS_DEFECT_RECONCILIATION_NO_DURABLE_JOB_CHECKPOINT_APPROVAL`<br>`CONFIRMED_ROOT_CODE_DEFECT_CONSISTENCY_DUPLICATE_HEURISTIC_NO_DOMAIN_OVERLAP_CONFIDENCE`<br>`CONFIRMED_ROOT_CODE_DEFECT_CONSISTENCY_INVARIANT_MATRIX_CANCEL_EVENT_ONLY`<br>`CONFIRMED_ROOT_OBSERVABILITY_DEFECT_CONSISTENCY_AUDIT_BOUNDED_SCAN_NO_COVERAGE_CURSOR`<br>`CONFIRMED_ROOT_OPERATIONS_DEFECT_CONSISTENCY_STUCK_DETECTION_PARTIAL_NO_SLA_RECOVERY`

### `R-16G`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 5 |
| Confirmed raw IDs | F-1276<br>F-1275<br>F-1272<br>F-1274<br>F-1281 |
| Owners | Provider Jobs + Clinical Privacy + Workflow |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Provider job queues can expose excess clinical/contact data, fabricate commercial defaults, use global unbounded pagination, lack actor/role provenance and accept weak command identifier/reason input.

**Business/authority boundary.** Provider job queues use minimum necessary clinical/contact DTOs, authoritative commercial fields, bounded scoped pagination, verified actor/role provenance and typed validated idempotent command reasons with audit.

**Frozen exact evidence.** `F-1276: src/modules/provider-jobs/provider-jobs.module.ts:188–210`<br>`F-1275: src/modules/provider-jobs/provider-jobs.module.ts:103–174`<br>`F-1272: src/modules/provider-jobs/provider-jobs.module.ts:150–174`<br>`F-1274: src/modules/provider-jobs/provider-jobs.module.ts:121–140`<br>`F-1281: src/modules/provider-jobs/provider-jobs.module.ts:254–267`

**Constituent labels.** `CONFIRMED_ROOT_AUDIT_DEFECT_PROVIDER_JOB_ACTOR_ROLE_PROVENANCE`<br>`CONFIRMED_ROOT_CODE_DEFECT_PROVIDER_JOB_QUEUE_GLOBAL_PAGINATION_COST_BOUNDS`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PROVIDER_JOB_QUEUE_MINIMUM_NECESSARY_CLINICAL_CONTACT_DTO`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_PROVIDER_JOB_COMMERCIAL_DEFAULT_FABRICATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_PROVIDER_JOB_COMMAND_DTO_IDENTIFIER_REASON_VALIDATION`

### `R-17A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 4 |
| Confirmed raw IDs | F-227<br>F-223<br>F-224<br>F-225 |
| Owners | AI Platform + Clinical Privacy + Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** AI feature processing lacks explicit subject/owner/purpose authorization, consented/redacted external-data policy, provider feature/class/residency safety equivalence and truthful typed unavailable/provenance outcome.

**Business/authority boundary.** AI use is a policy-authorized purpose-bound operation with data minimization/redaction/consent/retention/residency controls; provider selection/fallback is feature/class/safety governed and results carry typed availability and provenance rather than fabricated empty success.

**Frozen exact evidence.** `F-227: src/modules/ai/ai-gateway.service.ts:129–176`<br>`F-223: src/modules/ai/ai.controller.ts:65–168 ; src/modules/ai/ai.service.ts:134–216,260–337`<br>`F-224: src/modules/ai/ai.service.ts:60–68,134–216,293–325 ; src/modules/ai/ai-provider.service.ts:193–231`<br>`F-225: src/modules/ai/ai.service.ts:139–149,207–216,260–277,293–325`

**Constituent labels.** `CONFIRMED_ROOT_AI_PROVIDER_GOVERNANCE_DEFECT_FALLBACK_PINNING_NO_FEATURE_DATA_CLASS_CONSENT_RESIDENCY_SAFETY_EQUIVALENCE_POLICY`<br>`CONFIRMED_ROOT_AUTHORIZATION_DATA_PURPOSE_DEFECT_AI_FEATURE_ROUTES_NO_EXPLICIT_SUBJECT_OWNER_PURPOSE_ROLE_CONTRACT_BEYOND_JWT`<br>`CONFIRMED_ROOT_PHI_EXTERNAL_PROCESSING_DEFECT_AI_RAW_BASE64_NOTES_NO_CENTRAL_LIMIT_REDACTION_CONSENT_RETENTION_RESIDENCY_POLICY`<br>`CONFIRMED_ROOT_USER_CLINICAL_TRUTH_DEFECT_AI_PROVIDER_PARSER_FAILURE_UNKNOWN_EMPTY_OUTPUT_INSTEAD_TYPED_UNAVAILABLE_PROVENANCE`

### `R-18A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 10 |
| Confirmed raw IDs | F-293<br>F-1128<br>F-294<br>F-355<br>F-354<br>F-1127<br>F-1132<br>F-2418<br>F-297<br>F-292 |
| Owners | Realtime Platform + Security/Privacy |
| Derived graph | F-298<br>F-299<br>F-356<br>F-357<br>F-358<br>F-1130<br>F-1131<br>F-1134<br>F-2419<br>F-2421<br>F-2428<br>F-2429<br>F-1129<br>F-1135<br>F-1136 |

**Observed constituent causes.** Realtime/websocket transports expose query credentials or uncontrolled origin/room/payload behavior and lack authenticated bounded event authorization, audience projection, offline acknowledgement/replay and transport-abuse controls. Public booking SSE maps full emitted payloads without an audience-minimized public event DTO, tenant/subject projection or durable offline/replay contract. Public booking SSE authorizes subscription only by client-supplied type/id, enabling identifier guessing and cross-booking event access. SSE endpoints expose unbounded JWT/public connections and heartbeat streams without per-principal connection/subscription/lifetime/backpressure resource limits.

**Business/authority boundary.** Realtime connections use secure handshake credential handling, normalized origin allowlist, expiry/revocation, bounded typed payloads and per-event authorization; delivery is audience-minimized, acknowledged/replayable with explicit degraded state and legacy global/client-controlled rooms are removed or hardened. Realtime/SSE subscriptions require a server-issued expiring scoped capability tied to a verified subject/booking/tenant relationship; public status, if permitted, is a separate opaque capability and minimum event DTO. Connections, heartbeats, subscriptions and buffers have per-principal budgets, bounded lifetime/backpressure and explicit degraded/replay/acknowledgement semantics. A stream is never authorization or delivery proof.

**Frozen exact evidence.** `F-293: src/modules/realtime/realtime.gateway.ts:74–91`<br>`F-1128: src/modules/realtime/realtime.sse.ts:32–35`<br>`F-294: src/modules/realtime/realtime.gateway.ts:210–301,423–498`<br>`F-355: src/modules/socket/socket.gateway.ts:27–37`<br>`F-354: src/modules/socket/socket.gateway.ts:6–23`<br>`F-1127: src/modules/realtime/realtime.sse.ts:27–36`<br>`F-1132: src/modules/realtime/realtime.sse.ts:16–36`<br>`F-2418: src/config/websocket-cors.ts:5–10`<br>`F-297: src/modules/realtime/realtime.gateway.ts:128–139,212–301,320–377`<br>`F-292: src/modules/realtime/realtime.gateway.ts:41–46`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_REALTIME_OFFLINE_DELIVERY_ACK_RECONCILIATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PUBLIC_SSE_BOOKING_EVENT_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_REALTIME_EVENT_AUDIENCE_PROJECTION_REDACTION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_LEGACY_SOCKET_CLIENT_CONTROLLED_PRIVATE_ROOMS`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_LEGACY_SOCKET_UNAUTHENTICATED_GLOBAL_BROADCAST`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_PUBLIC_SSE_BOOKING_EVENT_IDOR`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_SSE_CONNECTION_RESOURCE_BUDGET`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_WEBSOCKET_ALLOWED_ORIGIN_NORMALIZATION_VALIDATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_WEBSOCKET_PAYLOAD_SCHEMA_RATE_BACKPRESSURE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_WEBSOCKET_QUERY_JWT_EXPOSURE`

### `R-18B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 13 |
| Confirmed raw IDs | F-308<br>F-315<br>F-313<br>F-316<br>F-310<br>F-311<br>F-314<br>F-944<br>F-904<br>F-934<br>F-052<br>F-900<br>F-309 |
| Owners | Chat/Communication + Clinical Privacy<br>Chat/Communication + Care |
| Derived graph | F-070<br>F-312<br>F-729<br>F-1493 |

**Observed constituent causes.** Chat/family/appointment communication trusts client participant/sender state, permits arbitrary membership, lacks relationship/booking fail-closed checks, durable message/unread/replay lifecycle and bounded safe content/media policy. Consultation message access lacks server-verified participant and appointment state authorization.

**Business/authority boundary.** Chat members are server-verified against active family/booking/appointment relationships and invitation/owner policy; commands are typed, idempotent and durable with participant/state audit, minimum PHI projection/retention, bounded media/content controls and authoritative closure/read lifecycle. Consultation messages require active authorized participant and appointment state relationship, fail closed on missing registry data and use minimum audited projection.

**Frozen exact evidence.** `F-308: src/modules/chat/chat.module.ts:24–41`<br>`F-315: src/modules/chat/chat.service.ts:204–246,289–307,333–369`<br>`F-313: src/modules/chat/guards/chat-gateway.guard.ts:15–34`<br>`F-316: src/modules/chat/schedulers/chat-lifecycle.scheduler.ts:11–27`<br>`F-310: src/modules/chat/chat.service.ts:25–40,402–420`<br>`F-311: src/modules/chat/chat.service.ts:229–285`<br>`F-314: src/modules/chat/chat.service.ts:161–199`<br>`F-944: src/modules/compat/compat.module.ts:477–532`<br>`F-904: src/modules/doctors/doctors.module.ts:148–150,183–187,214–221`<br>`F-934: src/modules/compat/compat.module.ts:40–86`<br>`F-052: nabd_plus_patient_app/app/family/chat.tsx:34–103,138–175`<br>`F-900: src/modules/doctors/doctors.module.ts:182–196,262–264`<br>`F-309: src/modules/chat/chat.gateway.ts:89–154`

**Constituent labels.** `CONFIRMED_ROOT_AUTHORIZATION_DEFECT_CHAT_PERMISSIONS_EVALUATES_THREAD_FAMILY_BOOKING_BEFORE_PARTICIPANT_ASSERTION`<br>`CONFIRMED_ROOT_CHAT_CONTENT_MEDIA_ABUSE_DEFECT_NO_COMPREHENSIVE_TYPED_BOUND_SANITIZE_MIME_RATE_CONTRACT`<br>`CONFIRMED_ROOT_CHAT_GATEWAY_ACTOR_AUTHORIZATION_DEFECT_BODY_SENDER_ID_FAMILY_BYPASS_NO_WEBSOCKET_WIRING_PROOF`<br>`CONFIRMED_ROOT_CHAT_LIFECYCLE_TIME_AUTHORITY_DEFECT_SCHEDULER_UPDATEDAT_VS_COMPLETION_CONFIG_DIVERGENCE`<br>`CONFIRMED_ROOT_CHAT_MEMBERSHIP_GOVERNANCE_DEFECT_PARTICIPANT_CAN_ADD_REMOVE_ARBITRARY_USER_NO_RELATIONSHIP_INVITATION_OWNER_POLICY`<br>`CONFIRMED_ROOT_CHAT_RELIABILITY_DEFECT_MESSAGE_THREAD_UNREAD_EVENT_SEPARATE_NO_TRANSACTION_DURABLE_OUTBOX_RECONCILIATION`<br>`CONFIRMED_ROOT_CLINICAL_AUTHORIZATION_DEFECT_CHAT_BOOKING_REGISTRY_LOOKUP_FAILURE_PERMISSIVE_COMMUNICATION_NOT_FAIL_CLOSED`<br>`CONFIRMED_ROOT_CODE_DEFECT_CONSULTATION_MESSAGE_PARTICIPANT_STATE_AUTHORIZATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_DOCTOR_APPOINTMENT_CHAT_NOTIFICATION_CURSOR_COMPLETENESS`<br>`CONFIRMED_ROOT_CODE_DEFECT_FAMILY_CHAT_PROJECTION_REPLAY_GOVERNANCE`<br>`CONFIRMED_ROOT_MOBILE_FAMILY_CHAT_TRUTH_PARTICIPANT_DEFECT_FABRICATED_MESSAGE_IDS_SWALLOWED_MEMBER_FAILURES`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_DOCTOR_APPOINTMENT_CHAT_PARTICIPANT_ASSIGNMENT_STATE_AUTHORIZATION`<br>`CONFIRMED_ROOT_WEBSOCKET_AUTHORIZATION_TRUTH_DEFECT_CHAT_SEND_CALL_SEEN_DIRECT_ROOM_EMIT_NO_SERVICE_PARTICIPANT_LIFECYCLE_PERSISTENCE_TRUSTS_CLIENT_STATE`

### `R-18C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 13 |
| Confirmed raw IDs | F-585<br>F-348<br>F-349<br>F-347<br>F-352<br>F-345<br>F-587<br>F-586<br>F-067<br>F-588<br>F-351<br>F-350<br>F-583 |
| Owners | Calls/LiveKit/TURN + Security/Privacy |
| Derived graph | F-353<br>F-627<br>F-628<br>F-629<br>F-630<br>F-631 |

**Observed constituent causes.** Video/call and TURN credentials lack verified call/participant/session binding, signed webhook acceptance, safe credential issuance/rotation, call-state/idempotency and privacy-safe metrics/admin projection lifecycle.

**Business/authority boundary.** Call access and TURN credentials are issued only for an authorized active participant/session with audience/expiry/one-time/no-store controls; webhook and remote actions are verified/idempotent, state/attendance is authoritative and metrics/admin views are minimized/audited/retained by policy.

**Frozen exact evidence.** `F-585: src/modules/coturn/coturn.controller.ts:5–18 ; src/modules/coturn/coturn.service.ts:52–67`<br>`F-348: src/modules/livekit/livekit.service.ts:159–185`<br>`F-349: src/modules/livekit/livekit.service.ts:188–217`<br>`F-347: src/modules/livekit/livekit.controller.ts:13–28`<br>`F-352: src/modules/livekit/livekit.service.ts:300–341`<br>`F-345: src/modules/livekit/livekit.controller.ts:31–35`<br>`F-587: src/modules/coturn/coturn.service.ts:30–44`<br>`F-586: src/modules/coturn/coturn.controller.ts:10–18`<br>`F-067: nabd_plus_patient_app/app/room/[id].tsx:45–75,145–209`<br>`F-588: src/modules/coturn/coturn.service.ts:47–66`<br>`F-351: src/modules/livekit/livekit.service.ts:259–298`<br>`F-350: src/modules/livekit/livekit.service.ts:219–225`<br>`F-583: src/modules/coturn/coturn.service.ts:23–34`

**Constituent labels.** `CONFIRMED_ROOT_AUTHORIZATION_DEFECT_COTURN_ANY_JWT_CREDENTIAL_ISSUANCE_NO_CALL_SESSION_PARTICIPANT_PURPOSE_ACCOUNT_SCOPE`<br>`CONFIRMED_ROOT_CODE_DEFECT_LIVEKIT_CALL_SESSION_CREATION_IDENTITY_SAGA`<br>`CONFIRMED_ROOT_CODE_DEFECT_LIVEKIT_CALL_STATE_TRANSITION_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_LIVEKIT_PROVIDER_NO_SHOW_STATE_AUTHORIZATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_LIVEKIT_REMOTE_ACTION_TRUTHFUL_OUTCOME`<br>`CONFIRMED_ROOT_CODE_DEFECT_LIVEKIT_WEBHOOK_UNVERIFIED`<br>`CONFIRMED_ROOT_CONFIG_VALIDATION_DEFECT_COTURN_TURN_URLS_ARBITRARY_NO_SCHEME_HOST_PORT_TRANSPORT_ALLOWLIST`<br>`CONFIRMED_ROOT_CREDENTIAL_PROTECTION_DEFECT_COTURN_TWO_AUTH_ENDPOINTS_NO_NO_STORE_ISSUANCE_AUDIENCE_ONE_TIME_POLICY`<br>`CONFIRMED_ROOT_MOBILE_VIDEO_ROOM_CALL_LIFECYCLE_DEFECT_INCOMPATIBLE_ROUTE_NO_VERIFIED_TOKEN_END_ATTENDANCE`<br>`CONFIRMED_ROOT_PRIVACY_AUDIT_DEFECT_COTURN_RAW_ACCOUNT_ID_USERNAME_NO_PSEUDONYMOUS_ISSUANCE_KEY_ROTATION_AUDIT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_LIVEKIT_ADMIN_ROOM_PROJECTION_ACCESS_AUDIT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_LIVEKIT_CALL_METRICS_SCHEMA_RETENTION_AUDIT`<br>`CONFIRMED_ROOT_SECURITY_CONFIG_DEFECT_COTURN_DEFAULT_HOST_CHANGE_THIS_SECRET_NO_FAIL_CLOSED_VALIDATION`

### `R-18D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 4 |
| Confirmed raw IDs | F-333<br>F-330<br>F-332<br>F-334 |
| Owners | Realtime Platform + Privacy + Reliability |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Presence service has non-atomic multi-device disconnect transitions, discloses online/last-seen/device count without relationship/purpose policy, permits unbounded arbitrary bulk lookups and reports Redis outage as offline/zero truth.

**Business/authority boundary.** Presence uses atomic device/session lifecycle, explicit relationship/purpose/consent minimum projection, bounded scoped bulk access and an explicit unavailable/degraded state when Redis cannot establish authoritative presence; it never fabricates offline/zero.

**Frozen exact evidence.** `F-333: src/modules/presence/presence.service.ts:75–77`<br>`F-330: src/modules/presence/presence.service.ts:22–49`<br>`F-332: src/modules/presence/presence.service.ts:19–20,63–72`<br>`F-334: src/modules/presence/presence.service.ts:56–81`

**Constituent labels.** `CONFIRMED_ROOT_AVAILABILITY_DEFECT_PRESENCE_BULK_UNBOUNDED_ARBITRARY_USER_IDS_PROMISE_ALL`<br>`CONFIRMED_ROOT_CONCURRENCY_DEFECT_PRESENCE_MULTI_KEY_DEVICE_DISCONNECT_TRANSITION_NON_ATOMIC`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PRESENCE_ONLINE_LAST_SEEN_DEVICE_COUNT_NO_RELATIONSHIP_PURPOSE_POLICY`<br>`CONFIRMED_ROOT_TRUTH_RELIABILITY_DEFECT_PRESENCE_REDIS_OUTAGE_REPORTED_AS_OFFLINE_ZERO`

### `R-18E`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-296 |
| Owners | Realtime/Presence + Care Scheduling + Patient/Provider Experience |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Realtime waiting room keeps queues in process memory, derives ETA as position times a fixed 15 minutes and emits ready solely for position one, without authoritative clinician/session capacity, actual start, reconnect/recovery or truthful stale/unavailable lifecycle.

**Business/authority boundary.** Waiting-room position and estimated start are server-authoritative operational projections correlated to an authorized appointment and current clinician/session state. Estimates carry freshness/confidence and are withdrawn on disconnect/recovery; queue position is not consultation start, attendance, clinical availability or payment confirmation.

**Frozen exact evidence.** `F-296: src/modules/realtime/realtime.gateway.ts:389–409`

**Constituent labels.** `CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_WAITING_ROOM_SYNTHETIC_ETA`

### `R-19A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-199<br>F-200 |
| Owners | Community Trust & Safety + Security/Privacy |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Community admin moderation endpoint lacks explicit privileged role/step-up reviewer binding, reason, transition policy and immutable actor/outcome audit. Community post/comment/live-session endpoints and schemas accept raw unbounded text, tags, session status and stream URL without typed sanitizer, safe-media/URL allowlist, content moderation/version or ownership/state command contract.

**Business/authority boundary.** Community actions are server-authorized trust workflows: posts/comments/live sessions use typed bounded sanitized content, approved safe-media/stream references, owned host/member relationships, explicit state transitions and minimum public projection. Moderation requires privileged step-up reviewer role, reason, immutable actor/outcome audit, appeal/reconciliation and idempotent commands; anonymous UI mode never removes server accountability.

**Frozen exact evidence.** `F-199: src/modules/community/community.controller.ts:51–61`<br>`F-200: src/modules/community/community.controller.ts:26–43,70–85 ; src/schemas/community.schemas.ts:5–65`

**Constituent labels.** `CONFIRMED_ROOT_AUTHORIZATION_DEFECT_COMMUNITY_ADMIN_MODERATION_NO_EXPLICIT_ROLE_ACTOR_AUDIT`<br>`CONFIRMED_ROOT_CONTENT_SAFETY_DEFECT_COMMUNITY_RAW_UNBOUNDED_POST_COMMENT_SESSION_URL_FIELD_CONTRACT`

### `R-20A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-520 |
| Owners | Data Governance/Migrations + Home-care Catalog + SRE |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Home-care module mutates service catalog data during module startup with partial-error continuation, name/category matching and hard-coded active/price/duration values, without authorized target, versioned seed policy or reconciliation outcome.

**Business/authority boundary.** Reference-data seeding is an explicit authorized versioned migration with immutable input, environment/target guard, dry-run/approval, per-record outcome, reconciliation and rollback evidence. Startup logging or attempted upserts do not establish catalog correctness or availability.

**Frozen exact evidence.** `F-520: src/modules/home-care/home-care.module.ts:33–70`

**Constituent labels.** `CONFIRMED_ROOT_HOME_CARE_STARTUP_SEED_MUTATION_LIFECYCLE_DEFECT`

### `R-20B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-1850 |
| Owners | Catalog Governance + Data Migrations + SRE |
| Derived graph | F-1851<br>F-1857<br>F-1864 |

**Observed constituent causes.** Catalog-governance backfill promotes legacy medicine/provider rows from limited legacy signals to approved/public eligible, while rollback removes fields by coarse provenance/time checks and there is no source-version, reviewer, target authorization or post-migration reconciliation contract.

**Business/authority boundary.** Catalog-governance migrations use an approved target, immutable input/version, explicit per-entity review policy and idempotent dry-run/apply/rollback/reconciliation record. Operational status or a legacy flag alone never proves present medical/public eligibility.

**Frozen exact evidence.** `F-1850: scripts/backfill-catalog-governance.ts:18–46,54–56`

**Constituent labels.** `CONFIRMED_ROOT_CATALOG_GOVERNANCE_POLICY_VALIDITY_DEFECT`

### `R-21A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 15 |
| Confirmed raw IDs | F-921<br>F-912<br>F-911<br>F-916<br>F-917<br>F-913<br>F-920<br>F-914<br>F-919<br>F-910<br>F-909<br>F-923<br>F-915<br>F-918<br>F-922 |
| Owners | Business Policy Platform + Domain Owners |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Business-rules policy evaluation trusts caller context, lacks persisted/versioned surge/eligibility/capability authority and fail-closed missing/invalid inputs, can issue nonauthoritative pricing/payment results, and lacks admin separation/concurrency/redacted projection enforcement.

**Business/authority boundary.** Business policy evaluation receives authoritative typed context only, is versioned/persisted and concurrency-safe, fails closed for unknown/missing eligibility/capability/payment inputs, returns bounded/redacted explainable results, and is enforced at owning commands with separated policy administration.

**Frozen exact evidence.** `F-921: src/modules/business-rules/business-rules.module.ts:2–7,142–163`<br>`F-912: src/modules/business-rules/business-rules.module.ts:69–81`<br>`F-911: src/modules/business-rules/business-rules.module.ts:50–67`<br>`F-916: src/modules/business-rules/business-rules.module.ts:29–39,101–122,142–163`<br>`F-917: src/modules/business-rules/business-rules.module.ts:124–139`<br>`F-913: src/modules/business-rules/business-rules.module.ts:83–98,145–156`<br>`F-920: src/modules/business-rules/business-rules.module.ts:167–179`<br>`F-914: src/modules/business-rules/business-rules.module.ts:100–122`<br>`F-919: src/modules/business-rules/business-rules.module.ts:145–156`<br>`F-910: src/modules/business-rules/business-rules.module.ts:17–27,142–163`<br>`F-909: src/modules/business-rules/business-rules.module.ts:41–48,167–178`<br>`F-923: src/modules/business-rules/business-rules.module.ts:45–48,175–176`<br>`F-915: src/modules/business-rules/business-rules.module.ts:110–119`<br>`F-918: src/modules/business-rules/business-rules.module.ts:59–61,72–80,136–138`<br>`F-922: src/modules/business-rules/business-rules.module.ts:29–39,142–163`

**Constituent labels.** `CONFIRMED_ROOT_ARCHITECTURE_DEFECT_RULE_ENGINE_NOT_ENFORCED`<br>`CONFIRMED_ROOT_BUSINESS_CONTRACT_DEFECT_ELIGIBILITY_MISSING_CONTEXT_FAIL_OPEN`<br>`CONFIRMED_ROOT_BUSINESS_CONTRACT_DEFECT_INSURANCE_ELIGIBILITY_FAIL_OPEN`<br>`CONFIRMED_ROOT_BUSINESS_CONTRACT_DEFECT_NONAUTHORITATIVE_RULE_RESULT`<br>`CONFIRMED_ROOT_BUSINESS_CONTRACT_DEFECT_PAYMENT_POLICY_FAIL_OPEN`<br>`CONFIRMED_ROOT_BUSINESS_CONTRACT_DEFECT_PROVIDER_CAPABILITY_FAIL_OPEN`<br>`CONFIRMED_ROOT_CODE_DEFECT_BUSINESS_RULES_ADMIN_SEPARATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_BUSINESS_RULE_PRICING_AUTHORITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_PROVIDER_CAPABILITY_PROVENANCE`<br>`CONFIRMED_ROOT_CODE_DEFECT_RULE_ENGINE_TRUSTS_CALLER_CONTEXT`<br>`CONFIRMED_ROOT_CODE_DEFECT_SURGE_POLICY_AUTHORITY_AND_PERSISTENCE`<br>`CONFIRMED_ROOT_CODE_DEFECT_SURGE_POLICY_CONCURRENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_SURGE_TIMEZONE_POLICY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_RULE_ERROR_REDACTION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_RULE_RESULT_PROJECTION`

### `R-21B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 11 |
| Confirmed raw IDs | F-1149<br>F-1146<br>F-1142<br>F-1140<br>F-1147<br>F-1144<br>F-1143<br>F-1139<br>F-1138<br>F-1141<br>F-1150 |
| Owners | Recruitment Platform + Facility Governance + Privacy |
| Derived graph | F-1151 |

**Observed constituent causes.** Recruitment jobs/applications lack one authoritative candidate principal, facility/publication/legal state, credential/CV lifecycle, unique application, typed query/projection and actor/CAS/audit contract.

**Business/authority boundary.** Recruitment commands verify candidate principal and facility authority, accept typed bounded inputs, secure/scan/retain credentials and CVs by policy, use unique idempotent applications, versioned legal-state transitions with actor audit, and expose only published minimum job/application projections through bounded queries.

**Frozen exact evidence.** `F-1149: src/modules/recruitment/recruitment.module.ts:199–217,280–284`<br>`F-1146: src/modules/recruitment/recruitment.module.ts:145–157`<br>`F-1142: src/modules/recruitment/recruitment.module.ts:70–88`<br>`F-1140: src/modules/recruitment/recruitment.module.ts:23–49`<br>`F-1147: src/modules/recruitment/recruitment.module.ts:162–181`<br>`F-1144: src/modules/recruitment/recruitment.module.ts:90–117`<br>`F-1143: src/modules/recruitment/recruitment.module.ts:114–117,264–267`<br>`F-1139: src/modules/recruitment/recruitment.module.ts:23–34`<br>`F-1138: src/modules/recruitment/recruitment.module.ts:1–15,18–67,220–284`<br>`F-1141: src/modules/recruitment/recruitment.module.ts:53–68`<br>`F-1150: src/modules/recruitment/recruitment.module.ts:90–111,257–262`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_RECRUITMENT_APPLICATION_LEGAL_STATE_ACTOR_CAS_AUDIT`<br>`CONFIRMED_ROOT_CODE_DEFECT_RECRUITMENT_APPLICATION_UNIQUE_CANDIDATE_JOB_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_RECRUITMENT_JOB_LEGAL_STATE_TRANSITION_CAS_IDEMPOTENCY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_RECRUITMENT_CV_LICENSE_SECURE_STORAGE_SCAN_EXPIRY_RETENTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_RECRUITMENT_FACILITY_APPLICATION_CANDIDATE_CONSENT_REDACTED_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_RECRUITMENT_PUBLIC_JOB_CURSOR_MINIMUM_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_RECRUITMENT_PUBLIC_JOB_DETAIL_PUBLISHED_SAFE_PROJECTION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_RECRUITMENT_CANDIDATE_DELETION_LICENSE_VERIFICATION_LIFECYCLE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_RECRUITMENT_CANDIDATE_JOB_APPLICATION_DTO_PRINCIPAL_VALIDATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_RECRUITMENT_JOB_FACILITY_PUBLICATION_STATE_SERVER_AUTHORITY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_RECRUITMENT_PUBLIC_AUTH_QUERY_CURSOR_COST_VALIDATION`

### `R-21C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 24 |
| Confirmed raw IDs | F-1019<br>F-521<br>F-244<br>F-1016<br>F-1013<br>F-658<br>F-974<br>F-305<br>F-306<br>F-342<br>F-249<br>F-524<br>F-526<br>F-523<br>F-525<br>F-1018<br>F-1011<br>F-1015<br>F-978<br>F-646<br>F-1012<br>F-1017<br>F-1014<br>F-248 |
| Owners | Admin Operations + Privacy + Domain Owners<br>Admin Operations + SRE + Privacy + Domain Owners<br>Operational Read Models + Privacy<br>Admin Operations + SRE + Privacy<br>Admin Operations<br>Operational Read Models + Clinical Privacy<br>Timeline/Booking Platform + Finance<br>Admin Operations + Privacy |
| Derived graph | F-648<br>F-650<br>F-656<br>F-649 |

**Observed constituent causes.** Admin command center combines operational state from heterogeneous sources without verified scope/freshness/completeness/confidence, canonical identity resolution, purpose-safe PHI/payment projections, redacted failure snapshots or audited bounded detail reads. Ops overview scans Redis presence/session keyspaces with a large ad hoc cap and converts unavailable data to empty counts without cost budget or explicit degraded/completeness truth. Patient timeline fans out unbounded per-kind raw reads/reminders, defaults unknown domain status to active and merges independent models without snapshot/materialized-event provenance. Admin metric summary uses missing history/default collection outcomes as counts without explicit unknown/completeness/window/source semantics. Admin operational metrics lack declared source completeness/freshness/confidence truth. Unified medical timeline catches each source failure as an empty array and presents a complete event list without source/partial/freshness/unavailable semantics. Radiology bookings are emitted with type lab plus an optional kind field, violating one canonical timeline event discriminator contract. Unified timeline represents financial fields with false defaults rather than a typed server-owned financial projection. Ops request feed hard-codes heterogeneous collection names/status taxonomies and emits Mongo object IDs rather than canonical domain identity/source contracts. Ops traffic endpoint accepts any syntactically valid date and exposes counters without a server-enforced retention/access window. Ops pipeline aggregation catches collection failures as empty/zero values and combines all-time/today/late windows without explicit source failure or window semantics. Ops global request feed limits each source before merge/sort, producing a biased incomplete global order without cursor/snapshot completeness. Admin operational views expose data without purpose-scoped minimum projection. Admin patient-360 aggregates and returns raw cross-domain order, clinical, insurance and event objects with large arbitrary windows rather than a purpose-scoped minimum projection with source/freshness/completeness evidence.

**Business/authority boundary.** Admin command center is a read-model only: it resolves canonical identities and source metadata, presents explicit freshness/completeness/confidence/stuck state, enforces provider/admin/purpose scope, exposes minimum redacted PHI/payment details and validates/audits bounded detail requests; it never creates domain truth. Admin operations is a read model, not readiness or domain truth: it uses bounded canonical source queries/cursors and identity contracts, shows explicit source/freshness/completeness/degraded/unknown status, preserves global ordering semantics, enforces purpose/retention limits and exposes redacted minimum projections with audited detail access. Missing or failed sources may never be represented as zero/success. Timeline is a minimum purpose-scoped read model with bounded canonical query/order/cursor, explicit unknown/unavailable status, and a versioned snapshot/materialized-event contract with source/freshness/partial evidence; it never becomes domain truth. Admin operational read models resolve canonical identities and source metadata, enforce purpose/role/scope, expose only redacted minimum PHI/financial projections with bounded cursor/time windows and explicit freshness/completeness/unknown state; they never create domain truth. Admin operational dashboards are read-models with source metadata, explicit freshness/completeness/confidence and no fabricated universal status. Patient timeline is a bounded purpose-scoped read model with canonical event kind/identity/order and explicit source, freshness, partial/unavailable evidence; it never turns independent read failures into absence or domain truth. Timeline may display only explicit canonical financial state/projection; absent/unknown values are not amounts, payments or completed commerce. Operational read-models enforce purpose/scope and minimum redacted projection with audit.

**Frozen exact evidence.** `F-1019: src/modules/admin-command-center/admin-command-center.module.ts:147–154`<br>`F-521: src/modules/ops/ops.controller.ts:24–50`<br>`F-244: src/modules/timeline/timeline.service.ts:105–121,321–366`<br>`F-1016: src/modules/admin-command-center/admin-command-center.module.ts:88–113`<br>`F-1013: src/modules/admin-command-center/admin-command-center.module.ts:68–77`<br>`F-658: src/modules/admin-governance/admin-governance.module.ts:38–63,115–120`<br>`F-974: src/modules/compat/admin-spa.module.ts:53–109`<br>`F-305: src/modules/medical-reports/medical-reports.controller.ts:14–33`<br>`F-306: src/modules/medical-reports/medical-reports.controller.ts:27–30`<br>`F-342: src/modules/unified-bookings/unified-bookings.module.ts:60–100`<br>`F-249: src/modules/timeline/timeline.service.ts:118–366,369–385`<br>`F-524: src/modules/ops/ops.controller.ts:123–151`<br>`F-526: src/modules/ops/ops.controller.ts:161–173`<br>`F-523: src/modules/ops/ops.controller.ts:72–94`<br>`F-525: src/modules/ops/ops.controller.ts:118–158`<br>`F-1018: src/modules/admin-command-center/admin-command-center.module.ts:62–66,125–143`<br>`F-1011: src/modules/admin-command-center/admin-command-center.module.ts:37–60`<br>`F-1015: src/modules/admin-command-center/admin-command-center.module.ts:86–123`<br>`F-978: src/modules/compat/admin-spa.module.ts:277–370`<br>`F-646: src/modules/admin-governance/admin-governance.module.ts:102–159`<br>`F-1012: src/modules/admin-command-center/admin-command-center.module.ts:40–59`<br>`F-1017: src/modules/admin-command-center/admin-command-center.module.ts:48–59,103–112`<br>`F-1014: src/modules/admin-command-center/admin-command-center.module.ts:79–84`<br>`F-248: src/modules/timeline/timeline.service.ts:32–78,123–133,264–274`

**Constituent labels.** `CONFIRMED_ROOT_AUDIT_DEFECT_ADMIN_COMMAND_CENTER_DETAIL_PARAM_VALIDATION_PURPOSE_READ_AUDIT`<br>`CONFIRMED_ROOT_AVAILABILITY_OBSERVABILITY_DEFECT_OPS_OVERVIEW_REDIS_SCAN_PRESENCE_SESSION_KEYSPACE_NO_COUNTER_BUDGET_DEGRADED_TRUTH`<br>`CONFIRMED_ROOT_AVAILABILITY_ORDERING_DEFECT_TIMELINE_PER_KIND_RAW_LIMIT_FANOUT_UNBOUNDED_REMINDER_EXPANSION_FINAL_SLICE`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_COMMAND_CENTER_CANONICAL_PATIENT_PROVIDER_IDENTITY_ASSIGNMENT_RESOLVER`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_COMMAND_CENTER_DOMAIN_COMPLETE_STATE_TRANSITION_STUCK_DETECTION`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_METRIC_MISSING_HISTORY_UNKNOWN_SEMANTICS`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_OPERATIONAL_METRICS_TRUTH_COMPLETENESS`<br>`CONFIRMED_ROOT_CODE_DEFECT_MEDICAL_TIMELINE_PARTIAL_FAILURE_CANONICAL_SEMANTICS`<br>`CONFIRMED_ROOT_CODE_DEFECT_MEDICAL_TIMELINE_RADIOLOGY_EVENT_DISCRIMINATOR`<br>`CONFIRMED_ROOT_CODE_DEFECT_UNIFIED_TIMELINE_FALSE_FINANCIAL_DEFAULTS`<br>`CONFIRMED_ROOT_CONSISTENCY_DEFECT_TIMELINE_INDEPENDENT_MULTI_MODEL_READS_NO_SNAPSHOT_MATERIALIZED_EVENT_CONTRACT`<br>`CONFIRMED_ROOT_DATA_CONTRACT_DEFECT_OPS_HARD_CODED_COLLECTION_STATES_MONGO_OBJECT_ID_NOT_CANONICAL_DOMAIN_ID`<br>`CONFIRMED_ROOT_OPERATIONS_ACCESS_PERFORMANCE_DEFECT_OPS_TRAFFIC_ANY_VALID_DATE_NO_ENFORCED_RETENTION_WINDOW`<br>`CONFIRMED_ROOT_OPERATIONS_TRUTH_DEFECT_OPS_COLLECTION_FAILURE_EMPTY_ZERO_INCONSISTENT_ALL_TIME_TODAY_LATE_WINDOWS`<br>`CONFIRMED_ROOT_PERFORMANCE_ORDERING_DEFECT_OPS_PER_COLLECTION_LIMIT_MERGE_SLICE_BIASED_GLOBAL_REQUEST_FEED`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_COMMAND_CENTER_FAILURE_EVENT_SNAPSHOT_REDACTION_HEALTH_BOUNDARY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_COMMAND_CENTER_OPERATIONAL_SCOPE_PURPOSE_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_COMMAND_CENTER_ORDER_DETAIL_PHI_PAYMENT_RAW_DOCUMENT_REDACTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_OPERATIONAL_PROJECTION_PURPOSE_SCOPE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_PATIENT_360_PURPOSE_PROJECTION`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_ADMIN_COMMAND_CENTER_COMPLETENESS_CURSOR_FRESHNESS_METADATA`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_ADMIN_COMMAND_CENTER_UNIVERSAL_STATE_UNKNOWN_SOURCE_CONFIDENCE`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_ADMIN_COMMAND_CENTER_VERIFIED_PROVIDER_STATUS_SCOPE_FRESHNESS`<br>`CONFIRMED_ROOT_USER_TRUTH_DEFECT_TIMELINE_UNKNOWN_DOMAIN_STATUS_DEFAULTS_ACTIVE`

### `R-21D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 7 |
| Confirmed raw IDs | F-624<br>F-618<br>F-622<br>F-616<br>F-617<br>F-615<br>F-623 |
| Owners | Provider Onboarding + Identity/Privacy |
| Derived graph | F-626 |

**Observed constituent causes.** Provider onboarding lacks a verified provider identity/credential and account-provenance gate, encrypted/retained typed draft and minimum progress projection, default-deny contract visibility, durable submit/moderation and immutable resubmission review-state lifecycle.

**Business/authority boundary.** Provider onboarding binds a verified credentialed identity to a controlled account record; drafts are typed/encrypted/retention-bounded, progress and contracts are minimum/default-deny, submit/moderation is durable/idempotent/audited, and resubmission follows a versioned immutable review state machine.

**Frozen exact evidence.** `F-624: src/modules/provider-onboarding/provider-onboarding.module.ts:361–378`<br>`F-618: src/modules/provider-onboarding/provider-onboarding.module.ts:195–223`<br>`F-622: src/modules/provider-onboarding/provider-onboarding.module.ts:249–269`<br>`F-616: src/modules/provider-onboarding/provider-onboarding.module.ts:80–100,102–114,117–185`<br>`F-617: src/modules/provider-onboarding/provider-onboarding.module.ts:187–193,381–385`<br>`F-615: src/modules/provider-onboarding/provider-onboarding.module.ts:45–78,432–436`<br>`F-623: src/modules/provider-onboarding/provider-onboarding.module.ts:325–379`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_PROVIDER_ONBOARDING_RESUBMISSION_IMMUTABLE_REVIEW_STATE_MACHINE`<br>`CONFIRMED_ROOT_CODE_DEFECT_PROVIDER_ONBOARDING_SUBMIT_MODERATION_CONTRACT_DURABLE_SAGA`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PROVIDER_CONTRACT_DEFAULT_DENY_VISIBILITY_GRANT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PROVIDER_ONBOARDING_DRAFT_SNAPSHOT_TYPED_ENCRYPTED_RETENTION_BOUNDARY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PROVIDER_ONBOARDING_PROFILE_PROGRESS_MINIMUM_PROJECTION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_PROVIDER_ONBOARDING_IDENTITY_VERIFICATION_CREDENTIAL_GATE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_PROVIDER_ONBOARDING_SINGLE_IDENTITY_NO_PASSWORD_HASH_MIRROR_VERIFICATION_PROVENANCE`

### `R-21E`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 13 |
| Confirmed raw IDs | F-402<br>F-400<br>F-740<br>F-746<br>F-744<br>F-748<br>F-738<br>F-401<br>F-997<br>F-398<br>F-743<br>F-742<br>F-399 |
| Owners | Analytics/Data Platform + Privacy |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Administrative heatmap exposes sensitive emergency/home demand without k-anonymity/suppression/audit, suppresses source failures, permits unbounded coordinate load and lacks range/precision/taxonomy contracts. Analytics lacks bounded query/resource controls, canonical provider identity and funnel/state vocabulary, consented/provenanced activity taxonomy, UTC retention/cohort source, materialized workload isolation and explicit unknown metric/schema health states. Admin analytics metrics lack retention governance.

**Business/authority boundary.** Location analytics use minimum aggregated k-anonymous/suppressed data with purpose-scoped audit, bounded server-side aggregation/query budgets, validated spatial range/precision and canonical source taxonomy; source failure is explicit rather than represented as live/empty truth. Analytics is a bounded read-model with typed finite query limits, canonical identities/state vocabulary, consented event taxonomy/provenance, explicit retention/time semantics, materialized/isolated workloads and declared unknown/freshness/confidence rather than fabricated metrics. Analytics metrics have declared classification, retention and audit controls.

**Frozen exact evidence.** `F-402: src/modules/admin-web-core/controllers/analytics.controller.ts:40–56`<br>`F-400: src/modules/admin-web-core/controllers/analytics.controller.ts:40–58`<br>`F-740: src/modules/analytics/analytics.module.ts:39–46`<br>`F-746: src/modules/analytics/analytics.module.ts:18–116`<br>`F-744: src/modules/analytics/analytics.module.ts:99–107`<br>`F-748: src/modules/analytics/analytics.module.ts:16–116`<br>`F-738: src/modules/analytics/analytics.module.ts:120–143`<br>`F-401: src/modules/admin-web-core/controllers/analytics.controller.ts:21–34`<br>`F-997: src/modules/compat/admin-spa.module.ts:1215–1299`<br>`F-398: src/modules/admin-web-core/controllers/analytics.controller.ts:21–34,40–56`<br>`F-743: src/modules/analytics/analytics.module.ts:85–97`<br>`F-742: src/modules/analytics/analytics.module.ts:69–83,109–116`<br>`F-399: src/modules/admin-web-core/controllers/analytics.controller.ts:40–59`

**Constituent labels.** `CONFIRMED_ROOT_ANALYTICS_TRUTH_DEFECT_ADMIN_HEATMAP_SOS_HOME_VISIT_COLLAPSED_HOME_CARE_SOURCE_TAXONOMY`<br>`CONFIRMED_ROOT_AVAILABILITY_DEFECT_ADMIN_HEATMAP_UNBOUNDED_THIRTY_DAY_COORDINATE_LOAD_NO_DB_AGGREGATION_CAP`<br>`CONFIRMED_ROOT_CODE_DEFECT_ANALYTICS_CANONICAL_DOCTOR_PROVIDER_IDENTITY_PROJECTION`<br>`CONFIRMED_ROOT_CODE_DEFECT_ANALYTICS_MATERIALIZED_BOUNDED_QUERY_TIMEOUT_WORKLOAD_ISOLATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_ANALYTICS_RETENTION_UTC_YEAR_COHORT_ACTIVITY_SOURCE`<br>`CONFIRMED_ROOT_CODE_DEFECT_ANALYTICS_SCHEMA_FIELD_STATUS_METRIC_HEALTH_UNKNOWN_STATE_DEFENSE`<br>`CONFIRMED_ROOT_CODE_DEFECT_ANALYTICS_STRICT_FINITE_POSITIVE_MAX_LIMIT_DTO`<br>`CONFIRMED_ROOT_DATA_CONTRACT_DEFECT_ADMIN_HEATMAP_FINITE_ONLY_COORDINATE_NO_RANGE_SPATIAL_PRECISION_POLICY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_ANALYTICS_METRIC_RETENTION_GOVERNANCE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_HEATMAP_EMERGENCY_HOME_LOCATION_DEMAND_NO_K_ANONYMITY_SUPPRESSION_ACCESS_AUDIT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ANALYTICS_ACTIVITY_EVENT_TAXONOMY_CONSENT_SCOPE_PROVENANCE`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_ANALYTICS_CANONICAL_FUNNEL_CONVERSION_CANCELLATION_STATE_VOCABULARY`<br>`CONFIRMED_ROOT_TRUTH_OBSERVABILITY_DEFECT_ADMIN_HEATMAP_DB_FAILURE_SWALLOWED_SOURCE_LIVE_FALSE_STATUS`

### `R-21F`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 9 |
| Confirmed raw IDs | F-1157<br>F-1156<br>F-1163<br>F-1153<br>F-1155<br>F-790<br>F-1152<br>F-1161<br>F-1160 |
| Owners | Patient Experience + Trust/Safety + Provider Governance<br>Patient Experience + Trust/Safety |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Ratings lack verified completed patient-provider/entity eligibility, unique atomic command semantics, canonical provider aggregate/reconciliation, anonymous minimum public projection, bounded query/DTO validation and index verification. Patient review workflow lacks typed content moderation, completed-entity eligibility, canonical aggregation and audit.

**Business/authority boundary.** Ratings are accepted only for verified completed patient-provider/entity relationships, unique/idempotent and validated commands, canonical provider identity aggregates with reconciliation, anonymous/redacted public views, bounded pagination and verified indexes. Reviews are accepted only from eligible completed relationships, use typed/sanitized moderated content, canonical aggregation and immutable audit/appeal lifecycle.

**Frozen exact evidence.** `F-1157: src/modules/ratings/ratings.module.ts:60–64,95–99`<br>`F-1156: src/modules/ratings/ratings.module.ts:47–57`<br>`F-1163: src/modules/ratings/ratings.module.ts:14–15,25,48–68`<br>`F-1153: src/modules/ratings/ratings.module.ts:25–44`<br>`F-1155: src/modules/ratings/ratings.module.ts:60–77`<br>`F-790: src/modules/patient-ux/patient-ux.module.ts:36–67`<br>`F-1152: src/modules/ratings/ratings.module.ts:17–24,32–44`<br>`F-1161: src/modules/ratings/ratings.module.ts:5,17,60,80,91–104`<br>`F-1160: src/modules/ratings/ratings.module.ts:80–82,101–105`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_PUBLIC_RATING_PAGINATION_FINITE_CURSOR_QUERY_BOUNDS`<br>`CONFIRMED_ROOT_CODE_DEFECT_RATINGS_CANONICAL_PROVIDER_IDENTITY_AGGREGATE_READ_MODEL_RECONCILIATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_RATINGS_INDEX_MANIFEST_STARTUP_VERIFICATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_RATINGS_UNIQUE_USER_ENTITY_ATOMIC_IDEMPOTENCY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PUBLIC_RATING_ANONYMOUS_REDACTED_PROJECTION`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_PATIENT_REVIEW_TYPED_CONTENT_MODERATION_AGGREGATION_AUDIT`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_RATINGS_CANONICAL_COMPLETED_ENTITY_PATIENT_PROVIDER_ELIGIBILITY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_RATING_COMMAND_DTO_COMMENT_IDENTIFIER_PROVIDER_VALIDATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_RATING_MINE_SHARED_ENTITY_IDENTIFIER_ELIGIBILITY_VALIDATOR`

### `R-21G`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 16 |
| Confirmed raw IDs | F-289<br>F-800<br>F-287<br>F-816<br>F-818<br>F-755<br>F-757<br>F-321<br>F-825<br>F-827<br>F-797<br>F-798<br>F-823<br>F-824<br>F-801<br>F-704 |
| Owners | Security Enforcement + Admin Governance + Privacy<br>Admin Authority + Security<br>Admin Authority + Domain Owners + Security<br>Admin Authority + Booking/Finance<br>Admin Authority + Identity<br>Admin Authority + Domain Owners<br>Admin Authority + Reliability |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Admin ban listing returns raw identifier/reason records without minimum redacted projection, bounded pagination/cursor, purpose/audit or retention controls. Admin overrides lack dual-control ticket and immutable event durability. Unban route identifies a ban only by value and service update can cross types/match multiple records, without typed subject identity, versioned lifecycle or reconciliation evidence. Admin authority bypasses canonical domain/payment/slot state or lacks short-lived revocable support impersonation, target case/approval scope, provider suspension reconciliation and minimum action-log projection. Administrative force resolution bypasses canonical booking state/settlement saga controls. Admin ban/approval/suspension lacks canonical state, durable outbox and session revocation lifecycle. Admin force-cancel can bypass legal transition and settlement orchestration. Admin force transition lacks per-domain state invariant enforcement. Admin override accepts noncanonical domain identifier scope. Destructive consistency fix is controlled by an unbounded query flag without approval/idempotency.

**Business/authority boundary.** Privileged enforcement uses a typed canonical subject identity including ban type/value, versioned idempotent transition, scoped expiry/revocation and immutable actor/reason audit with durable event/session-revocation reconciliation. Admin enforcement views are role/purpose-scoped minimum redacted projections with bounded cursor/retention; raw identifiers and reasons are never an unbounded default list. Privileged overrides require dual approval, scoped ticket, immutable actor/reason/event record and reconciliation. Privileged support/override actions require a time-bound revocable support session, approved target case, canonical domain command/state/version checks, dual control/reason/audit/reconciliation and minimum scoped action-log views; no direct mutation shortcut is allowed. Any force resolution is a dual-controlled case-bound admin command that invokes canonical booking transition and settlement orchestration, records immutable reason/audit and reconciles failure. Privileged enforcement follows canonical state/version transition with actor/reason, durable event/outbox, session revocation and reconciliation. Administrative override requires explicit domain transition policy, linked settlement orchestration, dual control/ticket, reason and immutable audit; no direct bypass. Override actions use domain-specific allowed transition matrix and authoritative aggregate state/version checks under dual control and audit. Override targets resolve to canonical domain identifiers with explicit scope/relationship validation before any command. Destructive repair requires approved scoped case/ticket, dry-run/impact evidence, bounded target, idempotent command, dual control, immutable audit and reconciliation.

**Frozen exact evidence.** `F-289: src/modules/bans/bans.controller.ts:30–34`<br>`F-800: src/modules/patient-ux/patient-ux.module.ts:204–215,229–240,255–267`<br>`F-287: src/modules/bans/bans.controller.ts:25–28`<br>`F-816: src/modules/admin-authority/admin-authority.module.ts:50–83`<br>`F-818: src/modules/admin-authority/admin-authority.module.ts:173–184`<br>`F-755: src/modules/booking-flow/booking-flow.module.ts:202–229`<br>`F-757: src/modules/booking-flow/booking-flow.module.ts:209–228`<br>`F-321: src/modules/admin/admin.controller.ts:457–484,529–552`<br>`F-825: src/modules/admin-authority/admin-authority.module.ts:187–203`<br>`F-827: src/modules/admin-authority/admin-authority.module.ts:241–247,275`<br>`F-797: src/modules/patient-ux/patient-ux.module.ts:191–216,271–280`<br>`F-798: src/modules/patient-ux/patient-ux.module.ts:218–241,281–285`<br>`F-823: src/modules/admin-authority/admin-authority.module.ts:206–239`<br>`F-824: src/modules/admin-authority/admin-authority.module.ts:207–227`<br>`F-801: src/modules/patient-ux/patient-ux.module.ts:172–189,191–267`<br>`F-704: src/modules/consistency/consistency.module.ts:160–168`

**Constituent labels.** `CONFIRMED_ROOT_ADMIN_PII_GOVERNANCE_DEFECT_BANS_RAW_UNBOUNDED_IDENTIFIER_REASON_LIST_NO_PROJECTION_PAGINATION_RETENTION`<br>`CONFIRMED_ROOT_AUDIT_DEFECT_ADMIN_OVERRIDE_DUAL_CONTROL_TICKET_IMMUTABLE_EVENT_DURABILITY`<br>`CONFIRMED_ROOT_BAN_LIFECYCLE_IDENTITY_DEFECT_UNBAN_VALUE_ONLY_UPDATE_MANY_CROSSTYPE_ISOLATION_ABSENT`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_FORCE_DOMAIN_STATE_PAYMENT_SAGA_BYPASS`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_FORCE_RESCHEDULE_SLOT_CAPACITY_PAYMENT_BYPASS`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_FORCE_RESOLUTION_SAGA`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_FORCE_RESOLUTION_STATE_SETTLEMENT`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_USER_PROVIDER_BAN_APPROVE_SUSPEND_CANONICAL_STATE_OUTBOX_SESSION_REVOCATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_PROVIDER_SUSPENSION_CANONICAL_LIFECYCLE_RECONCILIATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_AUTHORITY_ACTION_LOG_PROJECTION_CURSOR_SCOPE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_ADMIN_FORCE_CANCEL_LEGAL_TRANSITION_SETTLEMENT_ORCHESTRATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_ADMIN_FORCE_TRANSITION_PER_DOMAIN_STATE_INVARIANT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_ADMIN_IMPERSONATION_SHORT_LIVED_REVOCABLE_SUPPORT_SESSION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_ADMIN_IMPERSONATION_TARGET_CASE_APPROVAL_SCOPE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_ADMIN_OVERRIDE_CANONICAL_DOMAIN_IDENTIFIER_SCOPE`<br>`CONFIRMED_ROOT_SECURITY_STATE_DEFECT_CONSISTENCY_DESTRUCTIVE_FIX_QUERY_FLAG_NO_APPROVAL_BOUNDS_IDEMPOTENCY`

### `R-21H`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 7 |
| Confirmed raw IDs | F-806<br>F-805<br>F-815<br>F-501<br>F-812<br>F-813<br>F-804 |
| Owners | Operations Safety + Privacy<br>Operations Safety + Provider Analytics + Domain owners |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Operations safety has unversioned SLA clocks, incomplete/unknown or privacy-unsafe reports, false escalation success and broad fallback/penalty projections. Provider SLA endpoint accepts an unbounded raw days window, falls back unknown provider type to pharmacy, derives heterogeneous source metrics with incomplete state histories and masks missing SLA logs as zero, so it cannot state a complete provider-performance outcome.

**Business/authority boundary.** Operational SLA/escalation read-models use versioned policy clocks, explicit unknown/freshness/completeness, truthful command outcomes, purpose-scoped minimum provider/penalty projections, bounded pagination and audit. Operational SLA reporting uses a typed finite window, verified provider/facility/service scope, canonical state-clock definitions, data-completeness/freshness status and auditable source lineage. Unknown, missing or partial data is explicit—not silently mapped to a service type or zero metric.

**Frozen exact evidence.** `F-806: src/modules/operations-safety/operations-safety.module.ts:83–100`<br>`F-805: src/modules/operations-safety/operations-safety.module.ts:34–70`<br>`F-815: src/modules/operations-safety/operations-safety.module.ts:65–80`<br>`F-501: src/modules/legal/legal-enterprise.controller.ts:118–123 ; src/modules/legal/legal-enterprise.service.ts:308–363`<br>`F-812: src/modules/operations-safety/operations-safety.module.ts:116–125`<br>`F-813: src/modules/operations-safety/operations-safety.module.ts:128–146`<br>`F-804: src/modules/operations-safety/operations-safety.module.ts:56–81`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_OPERATIONAL_ESCALATION_FALSE_EXECUTION_RESULT`<br>`CONFIRMED_ROOT_CODE_DEFECT_OPERATIONAL_SLA_CLOCK_POLICY_VERSIONING`<br>`CONFIRMED_ROOT_CODE_DEFECT_OPERATIONAL_SLA_UNKNOWN_STATE_REPORT_FAILURE`<br>`CONFIRMED_ROOT_CODE_DEFECT_PROVIDER_SLA_REPORT_WINDOW_COMPLETENESS_TRUTH`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_OPERATIONAL_FALLBACK_PROVIDER_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_OPERATIONAL_PENALTY_LIST_SCOPE_PAGINATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_OPERATIONAL_SLA_REPORT_PROJECTION_COMPLETENESS`

### `R-21I`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 3 |
| Confirmed raw IDs | F-324<br>F-317<br>F-319 |
| Owners | Admin Operations + Privacy/Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Admin reports/directory/provisioning lacks purpose-bound minimum projections, anti-enumeration search controls or typed idempotent creation lifecycle.

**Business/authority boundary.** Administrative reports/directories/provisioning use typed authorized commands, purpose/scope minimum projections, bounded anti-enumeration search, idempotency and immutable audit.

**Frozen exact evidence.** `F-324: src/modules/admin/admin.controller.ts:251–305`<br>`F-317: src/modules/admin/admin.controller.ts:39–131,139–235`<br>`F-319: src/modules/admin/admin.controller.ts:348–372,423–454`

**Constituent labels.** `CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_DIRECTORY_REPORT_SEARCH_MINIMUM_PURPOSE_ANTI_ENUMERATION_AUDIT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_REPORTS_USER360_PURPOSE_SCOPE_MINIMUM_AUDIT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_ADMIN_SUBADMIN_PROVIDER_CREATION_TYPED_DTO_IDEMPOTENT_LIFECYCLE`

### `R-21K`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 6 |
| Confirmed raw IDs | F-403<br>F-408<br>F-407<br>F-406<br>F-405<br>F-404 |
| Owners | B2B/Commercial Operations + Privacy |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** B2B request list/decision can bypass role/organization/request scope, versioned current-state CAS/idempotency/maker-checker/audit, bounded/redacted note/document projections and canonical organization quote/price/currency authority.

**Business/authority boundary.** B2B requests are organization-scoped and role/purpose-authorized; approve/reject uses current-state CAS/idempotency, maker-checker and immutable actor/reason audit; notes/documents are bounded/redacted/retained by policy, lists are paginated/minimum/degraded-aware, and commercial status derives from canonical quote/price/currency authority.

**Frozen exact evidence.** `F-403: src/modules/admin-governance/b2b.controller.ts:8–22`<br>`F-408: src/modules/admin-governance/b2b.controller.ts:15–22`<br>`F-407: src/modules/admin-governance/b2b.controller.ts:24–41`<br>`F-406: src/modules/admin-governance/b2b.controller.ts:31,41`<br>`F-405: src/modules/admin-governance/b2b.controller.ts:24–30,34–40`<br>`F-404: src/modules/admin-governance/b2b.controller.ts:24–41`

**Constituent labels.** `CONFIRMED_ROOT_AUTHORIZATION_DEFECT_B2B_LIST_ANY_JWT_NO_ROLE_ORGANIZATION_REQUEST_SCOPE`<br>`CONFIRMED_ROOT_AVAILABILITY_PRIVACY_DEFECT_B2B_UNBOUNDED_GLOBAL_LIST_NO_PROJECTION_FILTER_PAGINATION_DEGRADED_CONTRACT`<br>`CONFIRMED_ROOT_COMMERCIAL_INTEGRITY_DEFECT_B2B_STATUS_NOT_TIED_CANONICAL_ORG_QUOTE_PRICE_CURRENCY_AUTHORIZATION`<br>`CONFIRMED_ROOT_DATA_MINIMIZATION_DEFECT_B2B_MUTATION_RETURNS_FULL_COMMERCIAL_REQUEST_DOCUMENT`<br>`CONFIRMED_ROOT_PII_CONTENT_GOVERNANCE_DEFECT_B2B_RAW_NOTE_CONCATENATION_NO_BOUND_REDACTION_RETENTION_POLICY`<br>`CONFIRMED_ROOT_STATE_GOVERNANCE_DEFECT_B2B_APPROVE_REJECT_NO_CURRENT_STATE_CAS_IDEMPOTENCY_MAKER_CHECKER_ACTOR_AUDIT`

### `R-21L`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 7 |
| Confirmed raw IDs | F-385<br>F-390<br>F-387<br>F-388<br>F-386<br>F-391<br>F-389 |
| Owners | Provider Onboarding/Moderation + Privacy/Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Provider-delta moderation lacks privileged role/permission/step-up actor boundary, minimum masked list, canonical profile target, atomic apply/status/event, durable cleanup, CAS/idempotency/reviewer audit and truthful zero-apply/downstream outcome.

**Business/authority boundary.** Provider moderation uses a step-up authorized reviewer and canonical provider target, masked/bounded PII views, versioned CAS/idempotent review commands, atomic profile-apply/status/outbox where possible, durable cleanup/reconciliation and immutable reviewer/reason/outcome audit.

**Frozen exact evidence.** `F-385: src/modules/admin-web-core/controllers/provider-moderation.controller.ts:8–14,44–118`<br>`F-390: src/modules/admin-web-core/controllers/provider-moderation.controller.ts:51–79,82–117`<br>`F-387: src/modules/admin-web-core/controllers/provider-moderation.controller.ts:58–73`<br>`F-388: src/modules/admin-web-core/controllers/provider-moderation.controller.ts:64–79`<br>`F-386: src/modules/admin-web-core/controllers/provider-moderation.controller.ts:44–49`<br>`F-391: src/modules/admin-web-core/controllers/provider-moderation.controller.ts:62–80`<br>`F-389: src/modules/admin-web-core/controllers/provider-moderation.controller.ts:18–35,87–115`

**Constituent labels.** `CONFIRMED_ROOT_AUTHORIZATION_DEFECT_PROVIDER_DELTA_MODERATION_NO_ROLE_PERMISSION_STEPUP_ACTOR_BOUNDARY`<br>`CONFIRMED_ROOT_CONCURRENCY_AUDIT_DEFECT_PROVIDER_DELTA_NO_CAS_IDEMPOTENCY_REVIEWER_COMMAND_AUDIT`<br>`CONFIRMED_ROOT_DATA_INTEGRITY_DEFECT_PROVIDER_DELTA_RAW_SPREAD_MULTI_ALIAS_PROFILE_TARGET`<br>`CONFIRMED_ROOT_EVENT_RELIABILITY_DEFECT_PROVIDER_DELTA_PROFILE_APPLY_STATUS_NON_ATOMIC`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PROVIDER_DELTA_RAW_PII_LIST_NO_PROJECTION_PAGINATION_MASKING`<br>`CONFIRMED_ROOT_STATE_INTEGRITY_DEFECT_PROVIDER_DELTA_SUCCESS_WITH_ZERO_APPLY_NO_DOWNSTREAM_PROOF`<br>`CONFIRMED_ROOT_STORAGE_RELIABILITY_DEFECT_PROVIDER_DELTA_CLEANUP_BEST_EFFORT_NO_DURABLE_STATUS`

### `R-21M`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 5 |
| Confirmed raw IDs | F-924<br>F-930<br>F-925<br>F-926<br>F-929 |
| Owners | Platform Governance + Security/Privacy |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Legacy governance assumes static fixed collection/module maps, exposes global cardinality/topology/internal paths and permits unbounded database-wide enumeration without runtime evidence/drift detection.

**Business/authority boundary.** Legacy compatibility inventory is declared/versioned/allowlisted with bounded target-scoped diagnostics, no internal topology/path disclosure, runtime evidence/drift classification and minimum authorized aggregated reports; no broad collection enumeration is exposed.

**Frozen exact evidence.** `F-924: src/modules/legacy/legacy.module.ts:13–21,30–42`<br>`F-930: src/modules/legacy/legacy.module.ts:52–79`<br>`F-925: src/modules/legacy/legacy.module.ts:27–49,83–90`<br>`F-926: src/modules/legacy/legacy.module.ts:52–80`<br>`F-929: src/modules/legacy/legacy.module.ts:27–45`

**Constituent labels.** `CONFIRMED_ROOT_DATA_GOVERNANCE_DEFECT_LEGACY_FIXED_MAP_UNLISTED_COLLECTIONS_ASSUMED_CANONICAL`<br>`CONFIRMED_ROOT_INFORMATION_DISCLOSURE_DEFECT_ADMIN_LEGACY_API_INTERNAL_SOURCE_PATH_MODULE_MAP`<br>`CONFIRMED_ROOT_INFORMATION_DISCLOSURE_DEFECT_ADMIN_LEGACY_GLOBAL_COLLECTION_CARDINALITY_TOPOLOGY_REPORT`<br>`CONFIRMED_ROOT_OPERATIONS_DATA_GOVERNANCE_DEFECT_LEGACY_STATIC_USAGE_MAP_NO_RUNTIME_EVIDENCE_DRIFT_DETECTION`<br>`CONFIRMED_ROOT_OPERATIONS_DEFECT_ADMIN_LEGACY_DATABASE_WIDE_COLLECTION_ENUMERATION_UNBOUNDED`

### `R-21N`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 4 |
| Confirmed raw IDs | F-203<br>F-202<br>F-204<br>F-201 |
| Owners | Community Platform + Trust/Safety |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Community moderation/vote/session mutations lack reviewed actor/reason evidence, atomic idempotent vote/count contract, host/state authorization and durable mutation/outbox/reconstruction lifecycle.

**Business/authority boundary.** Community actions use authorized participant/host/state rules, typed bounded content, reviewed moderation reason/actor/evidence, atomic idempotent votes/counters, durable actor/reason/outbox events and reconciliation/appeal outcomes.

**Frozen exact evidence.** `F-203: src/modules/community/community.service.ts:180–197`<br>`F-202: src/modules/community/community.service.ts:104–130`<br>`F-204: src/modules/community/community.service.ts:86–101,132–156,192–197`<br>`F-201: src/modules/community/community.service.ts:14–23,48–58,72–83`

**Constituent labels.** `CONFIRMED_ROOT_CONCURRENCY_AUTHORIZATION_DEFECT_COMMUNITY_SESSION_JOIN_UNCONDITIONAL_INCREMENT_STATUS_NO_HOST_TRANSITION_POLICY`<br>`CONFIRMED_ROOT_CONCURRENCY_DEFECT_COMMUNITY_VOTE_READ_ARRAY_SEPARATE_COUNTER_UPDATE_REPLAY_DRIFT`<br>`CONFIRMED_ROOT_EVENT_AUDIT_DEFECT_COMMUNITY_MUTATION_NO_IDEMPOTENCY_DURABLE_ACTOR_REASON_OUTBOX_RECONSTRUCTION`<br>`CONFIRMED_ROOT_MODERATION_GOVERNANCE_DEFECT_COMMUNITY_KEYWORD_REMOVAL_NO_REASON_ACTOR_EVIDENCE_REVIEW_WORKFLOW`

### `R-21O`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 4 |
| Confirmed raw IDs | F-365<br>F-368<br>F-366<br>F-367 |
| Owners | Procurement/Commercial Operations + Finance |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Administrative procurement quotes trust client items/prices/totals, overwrite state without CAS/maker-checker/audit, claim invoice/payment readiness without authoritative handoff and expose unbounded pending list.

**Business/authority boundary.** Procurement quotes derive catalog/tax/currency/quantity/version from canonical commercial sources; state changes use CAS/idempotency/maker-checker/actor audit; invoice/payment readiness is truthful authoritative handoff state, and pending views are bounded/minimum/audited.

**Frozen exact evidence.** `F-365: src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:22–38`<br>`F-368: src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:12–15`<br>`F-366: src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:28–38`<br>`F-367: src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:40–42`

**Constituent labels.** `CONFIRMED_ROOT_COMMERCIAL_INTEGRITY_DEFECT_PROCUREMENT_QUOTE_CLIENT_PRICING_ITEMS_TOTAL_NO_CANONICAL_CATALOG_TAX_CURRENCY_QUANTITY_VERSION`<br>`CONFIRMED_ROOT_PRIVACY_AVAILABILITY_DEFECT_PROCUREMENT_PENDING_ADMIN_LIST_UNBOUNDED_UNPROJECTED_NO_SENSITIVE_ACCESS_AUDIT`<br>`CONFIRMED_ROOT_STATE_GOVERNANCE_DEFECT_PROCUREMENT_QUOTE_FIND_BY_ID_OVERWRITE_NO_STATE_CAS_MAKER_CHECKER_ACTOR_AUDIT_IDEMPOTENCY`<br>`CONFIRMED_ROOT_USER_COMMERCE_TRUTH_DEFECT_PROCUREMENT_QUOTE_RESPONSE_CLAIMS_INVOICE_HANDOFF_PAYMENT_READINESS_NOT_PERFORMED`

### `R-21P`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-146<br>F-065 |
| Owners | Clinical Programs/Product + Care Providers + Patient Mobile + Loyalty/Finance dependency |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** NabdExtensions treatment-program service returns hard-coded master programs, schedules and rewards and accepts arbitrary program/session completion, auto-enrolling a patient when no enrollment exists, without versioned catalog, eligible session or clinical/provider completion authority. Patient Mobile active-program screen falls back to a fabricated diabetes program and locally reports attendance/reschedule success; its completion action sends raw program/session identifiers to the permissive program endpoint with no visible provider/clinical outcome or authoritative status contract.

**Business/authority boundary.** Treatment programs, sessions, eligibility, rewards and completion are server-authoritative clinical-product records. A patient cannot create enrollment or mark attendance/completion merely by UI action: the command must bind an eligible program/catalog version, patient/provider/encounter and permitted session, require the applicable clinician/provider evidence and state transition, and emit idempotent auditable outcome. UI fallback, alert or local progress never establishes clinical completion, reward entitlement or a scheduled visit.

**Frozen exact evidence.** `F-146: src/modules/nabd-extensions/nabd-extensions.service.ts:283–371`<br>`F-065: nabd_plus_patient_app/app/programs/active.tsx:13–27,37–60,62–90,146–161`

**Constituent labels.** `CONFIRMED_ROOT_CLINICAL_PRODUCT_TRUTH_DEFECT_CARE_PROGRAM_HARDCODED_MASTERS_REWARDS_FIXED_TIME_ARBITRARY_PROGRAM_SESSION_COMPLETION`<br>`CONFIRMED_ROOT_MOBILE_ACTIVE_PROGRAM_TRUTH_DEFECT_FABRICATED_DIABETES_PROGRAM_LOCAL_ATTENDANCE_COMPLETION`

### `R-21Q`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-574<br>F-572 |
| Owners | Product Onboarding + User Domain + Patient Mobile/Web |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Tour module persists raw step IDs directly on User with no versioned tour definition, valid-step constraint, reset, migration, upgrade or retirement lifecycle. Tour service ignores the update result and always returns ok, so a missing/nonmatching user or failed zero-modification update is represented as completed progress.

**Business/authority boundary.** Product-tour progress is a server-authoritative, versioned onboarding state. The service accepts only catalogued step identifiers for the active tour version, reports the actual owner-scoped write outcome, and supports explicit reset/migration/expiry semantics on version change. Client or caller-provided step values and an unconditional success response cannot establish completed onboarding or feature entitlement.

**Frozen exact evidence.** `F-574: src/modules/tour/tour.module.ts:7–14 ; src/modules/tour/tour.service.ts:11–20`<br>`F-572: src/modules/tour/tour.service.ts:16–21`

**Constituent labels.** `CONFIRMED_ROOT_LIFECYCLE_DEFECT_TOUR_DIRECT_USER_PROGRESS_NO_VERSION_RESET_MIGRATION_UPGRADE_CONTRACT`<br>`CONFIRMED_ROOT_USER_TRUTH_DEFECT_TOUR_UPDATE_RESULT_IGNORED_ALWAYS_RETURNS_OK`

### `R-21R`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-246<br>F-250 |
| Owners | Timeline/Clinical Data + API Platform + Privacy/Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Timeline controller parses kinds, limit and ISO dates directly with no allowlist, positive maximum, valid date/range or stable ordering/window validation before building the cross-domain feed. Timeline module registers AppointmentSchema but AppointmentRepository imports Appointment from a different extra schema and uses a generic model wrapper, creating an unverified identity/schema/repository binding for timeline data.

**Business/authority boundary.** A patient timeline uses one owner-scoped, typed aggregate projection with registered schemas/repositories and finite validated filter/date/pagination/order inputs. Invalid or conflicting values fail explicitly; unknown source rows, identity/PHI authorization, freshness and partial-source errors are represented truthfully. Feed construction cannot be inferred from parsed query strings or a generic repository wrapper.

**Frozen exact evidence.** `F-246: src/modules/timeline/timeline.controller.ts:17–31`<br>`F-250: src/modules/timeline/timeline.module.ts:5–25,27–44 ; src/modules/timeline/repositories/appointment.repository.ts:1–13`

**Constituent labels.** `CONFIRMED_ROOT_INPUT_CONTRACT_DEFECT_TIMELINE_RAW_LIMIT_INVALID_DATE_NO_POSITIVE_MAX_ISO_ORDER_WINDOW_VALIDATION`<br>`CONFIRMED_ROOT_TIMELINE_MODEL_IDENTITY_PHI_REPOSITORY_BOUNDARY_DEFECT_SCHEMA_IMPORT_REGISTRATION_MISMATCH_GENERIC_WRAPPER`

### `R-22A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 21 |
| Confirmed raw IDs | F-372<br>F-653<br>F-652<br>F-371<br>F-370<br>F-166<br>F-169<br>F-369<br>F-374<br>F-318<br>F-187<br>F-185<br>F-687<br>F-3750<br>F-3746<br>F-3753<br>F-3748<br>F-3747<br>F-3758<br>F-186<br>F-184 |
| Owners | Platform Configuration / Release Governance<br>Identity Security + Device Trust<br>Identity Security<br>Identity Security + API Security |
| Derived graph | F-3749<br>F-3757 |

**Observed constituent causes.** Public and admin reads expose raw persistence documents rather than stable role-appropriate DTO projections. Kill-switch GET initializes and persists default configuration, violating non-mutating read and controlled bootstrap/change governance. Kill-switch toggle silently returns current configuration when key is unknown, without fail-closed validation, version/CAS/idempotency or auditable rejected outcome. Feature-flag mutation lacks version/CAS, idempotency, actor/reason audit and durable event/outbox provenance. Admin mutation upserts an arbitrary path key without an immutable registry or allowlist. User/device authentication and push-device binding lack verified token/credential ownership, challenge nonce/counter lifecycle, platform/attestation allowlist, expiry/revocation/transfer audit and fail-closed sensitive endpoint enforcement. Public startup endpoint returns every raw persistence feature-flag document, exposing internal keys and enabled state. Remote flags provide no governed targeting, staged rollout, kill switch, audit, compatibility contract or safe client default. Admin owner enrollment lacks one-time credential lifecycle without password exposure. API abuse controls accept a caller-controlled device identifier as trust input.

**Business/authority boundary.** Feature flags are a governed release control plane: public clients receive only an allowlisted stable DTO; mutations are constrained to a registry and protected by version/CAS, idempotency, actor/reason audit and outbox; targeting, staged rollout, kill switch, dependency compatibility and safe client defaults are server-governed. Release control-plane switches use an immutable registry/allowlist, explicit unknown-key rejection, version/CAS/idempotency, privileged approval/actor-reason audit, durable change event and safe staged rollout/kill-switch semantics. Device and social/passkey trust use verified issuer/audience/nonce/counter and owner binding, platform attestation allowlists, short-lived revocable credentials, transfer/rotation audit and fail-closed enforcement on sensitive endpoints; no client-supplied device identity becomes trust. Privileged owner enrollment uses one-time short-lived verified credential issuance with no password response, revocation/audit and secure activation. Device identifiers used for enforcement are server-issued/attested/owner-bound and never accepted as sole caller trust signal.

**Frozen exact evidence.** `F-372: src/modules/feature-flags/feature-flags.service.ts:19–20`<br>`F-653: src/modules/admin-governance/admin-governance.module.ts:261–267`<br>`F-652: src/modules/admin-governance/admin-governance.module.ts:270–285`<br>`F-371: src/modules/feature-flags/feature-flags.service.ts:15–17`<br>`F-370: src/modules/feature-flags/feature-flags.service.ts:15–17`<br>`F-166: src/modules/push/push.module.ts:28–43,354–373`<br>`F-169: src/modules/push/push.module.ts:697–743`<br>`F-369: src/modules/feature-flags/feature-flags.controller.ts:8–18`<br>`F-374: src/modules/feature-flags/feature-flags.controller.ts:12–16`<br>`F-318: src/modules/admin/admin.controller.ts:319–324,348–375`<br>`F-187: src/modules/auth/device-trust.service.ts:45–115`<br>`F-185: src/modules/auth/auth.service.ts:407–447,449–515,517–545,634–667,912–960`<br>`F-687: src/modules/api-security/api-security.module.ts:72–90,101–117`<br>`F-3750: src/modules/device-trust/device-trust.module.ts:31–68`<br>`F-3746: src/modules/device-trust/device-trust.module.ts:40–51`<br>`F-3753: src/modules/device-trust/device-trust.module.ts:61–66,119–124`<br>`F-3748: src/modules/device-trust/device-trust.module.ts:31–42,131–146`<br>`F-3747: src/modules/device-trust/device-trust.module.ts:45–51`<br>`F-3758: src/modules/device-trust/device-trust.module.ts:119–124`<br>`F-186: src/modules/auth/passkey.service.ts:117–150,175–205`<br>`F-184: src/modules/auth/auth.service.ts:912–1028`

**Constituent labels.** `CONFIRMED_ROOT_API_CONTRACT_DEFECT_FEATURE_FLAGS_PUBLIC_ADMIN_RAW_PERSISTENCE_DOCUMENT_NO_STABLE_DTO_PROJECTION`<br>`CONFIRMED_ROOT_CODE_DEFECT_KILL_SWITCH_READ_SIDE_EFFECT_INITIALIZATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_KILL_SWITCH_UNKNOWN_KEY_FALSE_SUCCESS`<br>`CONFIRMED_ROOT_CONFIG_GOVERNANCE_DEFECT_FEATURE_FLAGS_NO_VERSION_CAS_IDEMPOTENCY_ACTOR_REASON_AUDIT_OUTBOX`<br>`CONFIRMED_ROOT_CONTROL_PLANE_DEFECT_FEATURE_FLAGS_ADMIN_ARBITRARY_KEY_UPSERT_NO_IMMUTABLE_ALLOWLIST_REGISTRY`<br>`CONFIRMED_ROOT_DEVICE_OWNERSHIP_DEFECT_PUSH_TOKEN_GLOBAL_UNIQUE_UPSERT_REBINDS_USER_NO_POSSESSION_ATTESTATION_TRANSFER_AUDIT`<br>`CONFIRMED_ROOT_INPUT_CONFIG_TRUTH_DEFECT_PUSH_RAW_TOKEN_WEB_SUBSCRIPTION_DTO_VAPID_OK_WITH_NULL_KEY_ACTIVE_SELF_TEST_SURFACE`<br>`CONFIRMED_ROOT_PUBLIC_DISCLOSURE_DEFECT_FEATURE_FLAGS_STARTUP_PUBLIC_ALL_RAW_INTERNAL_KEYS_ENABLED_STATE`<br>`CONFIRMED_ROOT_RELEASE_SAFETY_DEFECT_FEATURE_FLAGS_NO_TARGETING_STAGED_ROLLOUT_KILL_SWITCH_AUDIT_DEPENDENCY_COMPATIBILITY_CLIENT_DEFAULT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_ADMIN_OWNER_IDENTITY_ONE_TIME_CREDENTIAL_ENROLLMENT_NO_PASSWORD_RESPONSE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_AUTH_TRUSTED_DEVICE_TOKEN_EXPIRY_REVOCATION_HEARTBEAT_BINDING`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_BROWSER_TOKEN_TRANSPORT_DRIFT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_CALLER_CONTROLLED_DEVICE_ID`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_DEVICE_ATTESTATION_NONCE_REQUEST_BINDING`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_DEVICE_TRUST_CHALLENGE_OWNER_BINDING`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_DEVICE_TRUST_LIFECYCLE_REVOCATION_MODEL`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_DEVICE_TRUST_PLATFORM_RUNTIME_ALLOWLIST`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_DEVICE_TRUST_REDIS_FAIL_CLOSED`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_DEVICE_TRUST_SENSITIVE_ENDPOINT_ENFORCEMENT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_PASSKEY_CHALLENGE_COUNTER_CREDENTIAL_LIFECYCLE_ATOMICITY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_SOCIAL_LOGIN_TOKEN_UNVERIFIED`

### `R-22B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 2 |
| Confirmed raw IDs | F-193<br>F-195 |
| Owners | Security Platform + Integrations |
| Derived graph | F-196<br>F-197 |

**Observed constituent causes.** Webhook acceptance can accept missing/non-production secret configuration or reconstructed JSON instead of exact signed provider bytes.

**Business/authority boundary.** Every webhook is fail-closed on required configuration and verifies provider signature over exact raw bytes before typed envelope/idempotency processing; logs are redacted and invalid/replayed events are rejected/audited.

**Frozen exact evidence.** `F-193: src/modules/webhooks/webhooks.service.ts:30–63,107–117`<br>`F-195: src/modules/webhooks/webhooks.controller.ts:14–48`

**Constituent labels.** `CONFIRMED_ROOT_WEBHOOK_SECURITY_CONFIG_DEFECT_NONPROD_MISSING_SECRET_ACCEPTS_TRUSTED_PAYMENT_SMS_EVENT_NOT_FAIL_CLOSED_EXPOSED_DEPLOYMENT`<br>`CONFIRMED_ROOT_WEBHOOK_SIGNATURE_DEFECT_RECONSTRUCTED_JSON_FALLBACK_NOT_REQUIRED_EXACT_RAW_PROVIDER_BYTES`

### `R-22C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 6 |
| Confirmed raw IDs | F-469<br>F-472<br>F-474<br>F-214<br>F-470<br>F-468 |
| Owners | Storage/Media Security + Privacy |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Storage and administrative deletion trust raw keys/content without a safe asset linkage, content magic/decoded-size/scan/quarantine, owner-scoped cloud key or durable tombstone/upload lifecycle.

**Business/authority boundary.** Storage operations reference authorized typed asset records, validate magic and decoded size, scan/quarantine before use, use owner-scoped private object keys, and retain durable upload/delete tombstone/quota/audit/reconciliation lifecycle.

**Frozen exact evidence.** `F-469: src/modules/storage/storage.module.ts:109–110,184–187,289–291`<br>`F-472: src/modules/storage/storage.module.ts:127–178`<br>`F-474: src/modules/storage/storage.module.ts:184–216,302–343`<br>`F-214: src/modules/media/media.controller.ts:158–173 ; src/modules/media/media.service.ts:84–97`<br>`F-470: src/modules/storage/storage.module.ts:184–216,302–313,346–358`<br>`F-468: src/modules/storage/storage.module.ts:109–110,184–190,288–313,381–394`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_STORAGE_DECODED_SIZE_LIMIT_CONSISTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_STORAGE_PHYSICAL_DELETE_TOMBSTONE_DURABILITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_STORAGE_UPLOAD_LIFECYCLE_IDEMPOTENCY_QUOTA_AUDIT`<br>`CONFIRMED_ROOT_MEDIA_DATA_INTEGRITY_DEFECT_ADMIN_RAW_STORAGE_KEY_DELETE_NO_ASSET_LINKAGE_DB_RECONCILIATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_STORAGE_CLOUDINARY_CUSTOM_KEY_OWNER_AUTHORITY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_STORAGE_CONTENT_MAGIC_SCAN_QUARANTINE`

### `R-22D`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 26 |
| Confirmed raw IDs | F-2450<br>F-2446<br>F-2441<br>F-2444<br>F-2448<br>F-384<br>F-2408<br>F-2407<br>F-395<br>F-382<br>F-381<br>F-380<br>F-2411<br>F-2409<br>F-394<br>F-392<br>F-383<br>F-226<br>F-1295<br>F-1291<br>F-1293<br>F-1298<br>F-995<br>F-2077<br>F-2416<br>F-393 |
| Owners | Security Engineering + Platform + API Governance<br>Security Engineering + Platform<br>Security Configuration + Admin Governance<br>Platform Security + Configuration Governance |
| Derived graph | F-2442 |

**Observed constituent causes.** OpenAPI server metadata exposes fixed production/local URLs without typed environment TLS/proxy/trusted-public-base configuration contract. Security configuration and API/documentation surfaces lack controlled secret/config validation, trusted origin/CORS/CSP/body-limit policy, safe OpenAPI session contract/route parity and build-context secret exclusion. Manually injected OpenAPI operations use generic object schemas and omit complete typed request/response/error/sensitive-field contracts. OpenAPI configuration lacks governed tags, deprecation/replacement, content-type and error taxonomy policy for manual contract-pack operations. System configuration exposes raw singleton values, permits full replace/upsert, lacks entitlement/redaction/schema/version/CAS/idempotency/maker-checker/audit/rollback and mutates on GET. Environment validation checks a small production required-variable list but does not validate each enabled external integration as a complete mutually compatible credential/endpoint/callback capability. Admin SLA configuration is hard-coded/noncanonical, reports raw-body success without durable persistence, lacks typed range/unit/cross-field validation and lacks version/CAS/idempotency/audit/outbox/maker-checker governance. System configuration governance lacks restricted/validated secret-safe configuration contract. Environment validator has no source-evidenced profile/failure test matrix covering non-production, enabled/disabled integrations, invalid URI/origin and secret-safe error behavior.

**Business/authority boundary.** API documentation is a governed, environment-scoped client contract generated from canonical routes/DTOs: each operation has typed request/response/error/security/cookie semantics, sensitive schemas are minimized/redacted, tags/deprecation/replacement are controlled, and manual additions must pass collision/operation parity validation. Server URLs/TLS/proxy metadata are typed per environment. Published document parity remains runtime release evidence, not source-only proof. Configuration is typed and fail-closed across environments; secrets are managed/rotated/audited, origins/CORS/CSP/body limits are allowlisted, API docs expose only safe contracts behind environment access control, and build context excludes secrets by policy. System configuration is a typed versioned schema/effective-source contract: reads are non-mutating and field-entitled/redacted; writes are allowlisted patches with CAS/idempotency, maker-checker/actor-reason immutable change events, compatibility and tested rollback. Configuration validation is typed and fail-closed in every deployment profile: each enabled external integration requires complete mutually compatible credentials/endpoints/callback policy; database/cache URLs and origins use canonical secure URI/host/TLS rules; unknown/invalid values fail startup without leaking secrets. A maintained profile/failure matrix verifies validator behavior, while dependency reachability/readiness remains runtime evidence. SLA configuration is a canonical typed persisted system-config contract with range/unit/cross-field compatibility validation; commands apply versioned CAS/idempotency, maker-checker/actor/reason immutable audit and durable change event, and never report success without confirmed persistence. System configuration is typed, field-entitled, versioned/audited and never exposes raw secret or unsafe administrative configuration.

**Frozen exact evidence.** `F-2450: src/config/openapi.config.ts:10–11,25–26`<br>`F-2446: src/config/openapi.config.ts:36–45,53–86`<br>`F-2441: src/config/openapi.config.ts:53–86`<br>`F-2444: src/config/openapi.config.ts:62–66`<br>`F-2448: src/config/openapi.config.ts:17–24,53–86`<br>`F-384: src/modules/admin-governance/system-config.controller.ts:21–35`<br>`F-2408: src/config/env.validation.ts:5–7`<br>`F-2407: src/config/env.validation.ts:1–3,12`<br>`F-395: src/modules/admin-web-core/controllers/admin-config.controller.ts:19–27`<br>`F-382: src/modules/admin-governance/system-config.controller.ts:31–36`<br>`F-381: src/modules/admin-governance/system-config.controller.ts:31–36`<br>`F-380: src/modules/admin-governance/system-config.controller.ts:19–29`<br>`F-2411: src/config/env.validation.ts:9–10`<br>`F-2409: src/config/env.validation.ts:5–7`<br>`F-394: src/modules/admin-web-core/controllers/admin-config.controller.ts:8–27`<br>`F-392: src/modules/admin-web-core/controllers/admin-config.controller.ts:8–17`<br>`F-383: src/modules/admin-governance/system-config.controller.ts:19–27`<br>`F-226: src/modules/ai/ai-gateway.service.ts:14–18,27–50,82–109,252–257`<br>`F-1295: src/main.ts:89–96`<br>`F-1291: src/main.ts:44–55`<br>`F-1293: src/main.ts:70–81`<br>`F-1298: src/main.ts:110–119`<br>`F-995: src/modules/compat/admin-spa.module.ts:1160–1213`<br>`F-2077: Dockerfile.production:4–10`<br>`F-2416: src/config/env.validation.ts:1–13`<br>`F-393: src/modules/admin-web-core/controllers/admin-config.controller.ts:19–27`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_OPENAPI_ENVIRONMENT_SERVER_TLS_PROXY_METADATA_CONFIGURATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_OPENAPI_MANUAL_INJECTION_ROUTE_COLLISION_OPERATION_PARITY_GATE`<br>`CONFIRMED_ROOT_CODE_DEFECT_OPENAPI_MANUAL_PATH_TYPED_REQUEST_RESPONSE_ERROR_SENSITIVE_SCHEMA`<br>`CONFIRMED_ROOT_CODE_DEFECT_OPENAPI_SESSION_EXCHANGE_TOKEN_COOKIE_MACHINE_READABLE_CONTRACT`<br>`CONFIRMED_ROOT_CODE_DEFECT_OPENAPI_TAG_DEPRECATION_CONTENT_ERROR_GOVERNANCE`<br>`CONFIRMED_ROOT_CONFIG_CONTRACT_DEFECT_NO_SCHEMA_VERSION_EFFECTIVE_SOURCE_COMPATIBILITY_ROLLBACK`<br>`CONFIRMED_ROOT_CONFIG_DEFECT_ENABLED_INTEGRATION_PRODUCTION_FAIL_CLOSED_CONTRACT_MISSING`<br>`CONFIRMED_ROOT_CONFIG_DEFECT_ENV_NON_PRODUCTION_UNTYPED_VALIDATION_BYPASS`<br>`CONFIRMED_ROOT_CONFIG_GOVERNANCE_DEFECT_ADMIN_SLA_NO_IDEMPOTENCY_VERSION_CAS_AUDIT_OUTBOX_MAKER_CHECKER`<br>`CONFIRMED_ROOT_CONFIG_GOVERNANCE_DEFECT_NO_VERSION_CAS_IDEMPOTENCY_MAKER_CHECKER_ACTOR_REASON_AUDIT_DURABLE_CHANGE_EVENT`<br>`CONFIRMED_ROOT_CONFIG_INTEGRITY_DEFECT_RAW_VALUE_ANY_FULL_SINGLETON_REPLACE_UPSERT_NO_ALLOWLIST_PATCH`<br>`CONFIRMED_ROOT_CONFIG_PRIVACY_DEFECT_ADMIN_RAW_SINGLETON_VALUE_NO_FIELD_ENTITLEMENT_REDACTION_SECRET_PROJECTION`<br>`CONFIRMED_ROOT_CONFIG_SECURITY_DEFECT_ALLOWED_ORIGIN_CANONICAL_URL_POLICY_MISSING`<br>`CONFIRMED_ROOT_CONFIG_SECURITY_DEFECT_DATABASE_CACHE_URI_POLICY_NOT_VALIDATED`<br>`CONFIRMED_ROOT_CONFIG_VALIDATION_DEFECT_ADMIN_SLA_NO_TYPED_RANGE_UNIT_CROSS_FIELD_COMPATIBILITY`<br>`CONFIRMED_ROOT_CONTROL_PLANE_TRUTH_DEFECT_ADMIN_SLA_HARD_CODED_NOT_CANONICAL_SYSTEM_CONFIG`<br>`CONFIRMED_ROOT_HTTP_RELEASE_SEMANTICS_DEFECT_SYSTEM_CONFIG_GET_MUTATES_AUTO_CREATES_MISSING_SINGLETON`<br>`CONFIRMED_ROOT_SECRET_GOVERNANCE_DEFECT_AI_PROVIDER_API_KEYS_MONGO_REGISTRY_NO_MANAGED_SECRET_ROTATION_DUAL_CONTROL_AUDIT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_GLOBAL_BODY_LIMIT_RAW_BODY_MEMORY_AMPLIFICATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_NONPRODUCTION_EXTERNAL_CORS_DEFAULT_DENY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_PRODUCTION_CSP_UNSAFE_INLINE_UNBOUNDED_HTTPS_IMAGE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_SWAGGER_PRODUCTION_NONPRODUCTION_ACCESS_GUARD`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_SYSTEM_CONFIGURATION_GOVERNANCE`<br>`CONFIRMED_ROOT_SUPPLY_CHAIN_SECRET_DEFECT_DOCKER_BUILDER_FULL_CONTEXT_COPY_NO_DOCKERIGNORE_EXCLUSION`<br>`CONFIRMED_ROOT_TEST_GAP_ENV_VALIDATOR_PROFILE_FAILURE_MATRIX`<br>`CONFIRMED_ROOT_USER_TRUTH_DEFECT_ADMIN_SLA_PUT_RAW_BODY_NO_PERSISTENCE_RETURNS_SUCCESS`

### `R-22E`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 4 |
| Confirmed raw IDs | F-2514<br>F-2509<br>F-2513<br>F-2515 |
| Owners | Platform Security + Domain Identity Governance<br>Platform Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** TRACK_PREFIX registry is advisory because trackingId accepts raw strings and does not enforce a single authoritative entity-to-prefix registry. Tracking ID generator accepts an arbitrary caller-supplied prefix rather than a typed entity-kind allowlist/registry boundary. Tracking ID month/year format uses local process time and two-digit year without explicit UTC/four-digit-year/version semantics. Tracking identifier accepts control/unicode/delimiter/length ambiguity.

**Business/authority boundary.** Tracking identifiers are generated only by a single typed authoritative registry: entity kind selects a fixed allowed prefix; input cannot supply a prefix; UTC/versioned format semantics are explicit; output is canonical bounded ASCII/delimiter-safe before storage, lookup or presentation. Uniqueness, public lookup and caller-command idempotency remain separate data/runtime or product-policy gates. Tracking identifiers use canonical bounded allowlisted character and delimiter rules before storage, lookup or presentation.

**Frozen exact evidence.** `F-2514: src/common/tracking.ts:8,17–28`<br>`F-2509: src/common/tracking.ts:8–15`<br>`F-2513: src/common/tracking.ts:9–11`<br>`F-2515: src/common/tracking.ts:8,14`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_TRACKING_ID_SINGLE_AUTHORITATIVE_PREFIX_REGISTRY_ENFORCEMENT`<br>`CONFIRMED_ROOT_CODE_DEFECT_TRACKING_ID_TYPED_PREFIX_ALLOWLIST_BOUNDARY`<br>`CONFIRMED_ROOT_CODE_DEFECT_TRACKING_ID_UTC_FOUR_YEAR_TIME_FORMAT_SEMANTICS`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_TRACKING_ID_PREFIX_UNICODE_DELIMITER_CONTROL_LENGTH_VALIDATION`

### `R-22F`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 7 |
| Confirmed raw IDs | F-686<br>F-285<br>F-695<br>F-690<br>F-693<br>F-685<br>F-689 |
| Owners | API Security + Platform Reliability + Privacy<br>Platform Security + Edge/SRE + Identity |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** API abuse controls can fail open or use non-atomic counters/raw URL policy, lack degraded enforcement/reconciliation and privacy-safe security-event governance/admin projection/retention. Bans middleware trusts the raw x-forwarded-for string and client-supplied x-device-id directly as enforcement identifiers, without a trusted-proxy chain parser or attested device identity boundary.

**Business/authority boundary.** Abuse controls use canonical normalized route/policy keys, atomic distributed limits with fail-closed or explicit degraded enforcement/reconciliation, and security events use minimum redacted/audited retention and scoped admin projections. Abuse enforcement uses a validated trusted-proxy source address and, where device controls are used, a server-verifiable device identity/attestation policy. Raw forwarding/device headers are untrusted input and never independently justify a ban decision.

**Frozen exact evidence.** `F-686: src/modules/api-security/api-security.module.ts:101–123`<br>`F-285: src/modules/bans/bans.middleware.ts:9–20`<br>`F-695: src/modules/api-security/api-security.module.ts:197–207`<br>`F-690: src/modules/api-security/api-security.module.ts:54–70`<br>`F-693: src/modules/api-security/api-security.module.ts:80–84,111–119,154–168`<br>`F-685: src/modules/api-security/api-security.module.ts:72–100`<br>`F-689: src/modules/api-security/api-security.module.ts:24–32,86–145`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_RATE_LIMIT_NONATOMIC_COUNTERS`<br>`CONFIRMED_ROOT_ENFORCEMENT_IDENTITY_DEFECT_BANS_TRUST_RAW_X_FORWARDED_FOR_AND_X_DEVICE_ID_NO_TRUSTED_PROXY_DEVICE_ATTESTATION_BOUNDARY`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_SECURITY_EVENT_ADMIN_PROJECTION_AND_RETENTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_SECURITY_EVENT_GOVERNANCE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_ABUSE_ACTION_DEGRADED_RECONCILIATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_RATE_LIMIT_REDIS_FAIL_OPEN`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_RAW_URL_RATE_POLICY`

### `R-22G`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 8 |
| Confirmed raw IDs | F-855<br>F-847<br>F-845<br>F-848<br>F-851<br>F-844<br>F-846<br>F-850 |
| Owners | Security/Audit Platform + Privacy |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Audit/security logging lacks durable append-safe persistence, classified/redacted details, bounded regex/cursor/query budgets, purpose-safe admin/patient projections, trusted correlation normalization and URL-query redaction.

**Business/authority boundary.** Audit data is append-durable and tamper-evident with classified/redacted fields; reads are purpose-scoped minimum projections with bounded query/cursor controls and access audit; correlation IDs and URL/query metadata are normalized/trusted/redacted before logging.

**Frozen exact evidence.** `F-855: src/modules/security/security.module.ts:19–53`<br>`F-847: src/modules/security/security.module.ts:17–53,161–167`<br>`F-845: src/modules/security/security.module.ts:14–16,85–99`<br>`F-848: src/modules/security/security.module.ts:42–53,152–159`<br>`F-851: src/modules/security/security.module.ts:109–115`<br>`F-844: src/modules/security/security.module.ts:11–16,55–99`<br>`F-846: src/modules/security/security.module.ts:19–39`<br>`F-850: src/modules/security/security.module.ts:101–108`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_AUDIT_CURSOR_PAGINATION_QUERY_BUDGET`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_ADMIN_AUDIT_VIEW_PROJECTION_PURPOSE_ACCESS_LOG`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_AUDIT_EVENT_DETAILS_CLASSIFICATION_REDACTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_PATIENT_AUDIT_ACTIVITY_SAFE_PROJECTION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_REQUEST_URL_QUERY_LOG_REDACTION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_AUDIT_PERSISTENCE_DURABILITY`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_AUDIT_SEARCH_REGEX_RESOURCE_GUARD`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_CORRELATION_ID_UNTRUSTED_INPUT_VALIDATION`

### `R-22H`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-275 |
| Owners | Security/Privacy + Export/Data Governance |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** ExportService reads an entire selected model and serializes caller-selected fields to CSV while escaping quotes only; it does not neutralize spreadsheet formula prefixes or establish an authorized minimum export projection.

**Business/authority boundary.** Data exports are purpose/role-scoped, server-defined minimum projections with bounded selection and audit. CSV values that can be interpreted as formulas are safely neutralized; download content is not trusted merely because it is quoted or generated by the server.

**Frozen exact evidence.** `F-275: src/modules/export/export.service.ts:18–34`

**Constituent labels.** `CONFIRMED_ROOT_SECURITY_DEFECT_EXPORT_CSV_FORMULA_INJECTION`

### `R-22I`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-3752 |
| Owners | Platform Security + iOS + Identity |
| Derived graph | F-3751 |

**Observed constituent causes.** iOS App Attest verification returns an untrusted pending/not-configured result even when Apple credential variables exist; no assertion, certificate-chain, nonce/request binding or device trust decision is implemented.

**Business/authority boundary.** Device attestation is fail-closed for flows that require it: challenge ownership/one-time use, platform assertion/certificate verification, nonce/request/session binding, verdict expiry/revocation and security-event audit are server-authoritative. Placeholder configuration or a status endpoint never proves device trust.

**Frozen exact evidence.** `F-3752: src/modules/device-trust/device-trust.module.ts:109–117`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_IOS_APP_ATTEST_UNIMPLEMENTED`

### `R-22J`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-1318 |
| Owners | Platform Security + SRE/API Platform |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** The unauthenticated root health response exposes a fixed application product/version fingerprint alongside an unconditional status ok, without a minimal public metadata/release provenance policy.

**Business/authority boundary.** Public liveness metadata exposes only the minimum safe operational signal and is environment/release-policy controlled. Fixed product/version fingerprints are not health, readiness or deployment evidence and require an explicit disclosure decision.

**Frozen exact evidence.** `F-1318: src/health.controller.ts:14–22`

**Constituent labels.** `CONFIRMED_ROOT_INFORMATION_DISCLOSURE_DEFECT_PUBLIC_HEALTH_FIXED_APP_VERSION_FINGERPRINT`

### `R-23A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 8 |
| Confirmed raw IDs | F-595<br>F-598<br>F-592<br>F-594<br>F-141<br>F-590<br>F-591<br>F-593 |
| Owners | Hospital Operations + Identity/Privacy<br>Provider Governance + Care/Facilities + Catalog/Pricing + Media Safety |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Hospital branches, staff, affiliations, invitations and appointment ownership lack one verified membership/branch/facility relationship, typed DTO, credential review, expiry/revocation and atomic idempotent invitation lifecycle. DoctorProfileExtended schema stores institution links, clinic/online/home prices, radius, insurance networks, gallery URLs and weekly schedule as raw/default scalar or object fields with no typed readiness, version, effective-date, facility, safe-media or provider-capability contract.

**Business/authority boundary.** Hospital operations verify active actor membership and branch/facility relationship; staff/department DTOs are allowlisted, affiliations/credentials are reviewed, invitations are recipient-bound/expiring/revocable/idempotent, and appointment ownership/projections are purpose-scoped and audited. Provider profile configuration is a versioned, reviewed and facility-scoped capability record. Prices, availability/schedule, network participation and media references are validated server-side and must not themselves establish bookability, coverage, a commercial quote or clinical authorization.

**Frozen exact evidence.** `F-595: src/modules/hospital/services/hospital.service.ts:95–110`<br>`F-598: src/modules/hospital/hospital.module.ts:14–30 ; src/modules/hospital/controllers/hospital.controller.ts:5–8`<br>`F-592: src/modules/hospital/services/hospital.service.ts:162–170`<br>`F-594: src/modules/hospital/services/hospital.service.ts:54–93 ; src/modules/hospital/controllers/hospital.controller.ts:64–79`<br>`F-141: src/modules/care/schemas/doctor-profile-extended.schema.ts:6–38`<br>`F-590: src/modules/hospital/services/hospital.service.ts:33–40 ; src/modules/hospital/controllers/hospital.controller.ts:10–62`<br>`F-591: src/modules/hospital/services/hospital.service.ts:113–147`<br>`F-593: src/modules/hospital/services/hospital.service.ts:149–159`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_HOSPITAL_INVITATION_MEMBERSHIP_PERMISSION_ATOMIC_IDEMPOTENT_SAGA`<br>`CONFIRMED_ROOT_HOSPITAL_ROUTE_AUTHORIZATION_ENTITY_SCOPE_DEFECT_OPTIONAL_ACTOR_SEMANTICS_NO_ROUTE_RBAC`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_HOSPITAL_APPOINTMENT_BRANCH_TO_FACILITY_OWNERSHIP_VALIDATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_HOSPITAL_INVITATION_ROLE_EXPIRY_REVOCATION_MINIMUM_PROJECTION`<br>`CONFIRMED_ROOT_PROVIDER_PROFILE_CONFIGURATION_DEFECT_CARE_RAW_INSTITUTION_PRICE_SCHEDULE_INSURANCE_MEDIA_NO_TYPED_READINESS_VERSIONED_CONTRACT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_HOSPITAL_ACTOR_MEMBERSHIP_BRANCH_ENTITY_SCOPE_AUTHORIZATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_HOSPITAL_BRANCH_DEPARTMENT_STAFF_TYPED_ALLOWLISTED_DTO`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_HOSPITAL_DOCTOR_AFFILIATION_VERIFICATION_REVIEW_AUDIT_LIFECYCLE`

### `R-23B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 12 |
| Confirmed raw IDs | F-668<br>F-976<br>F-660<br>F-661<br>F-670<br>F-664<br>F-667<br>F-662<br>F-663<br>F-669<br>F-659<br>F-945 |
| Owners | Facility Operations + Clinical Governance<br>Facility Operations<br>Facility Operations + Clinical Privacy |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Facility admissions, wards/beds, shifts, surgery and communications/resources lack unified branch/role/clinical-purpose controls, bounded transactional capacity, CAS/idempotency, truthful invalid outcome and audit/retention policy. Admin shift commands lack membership overlap/timezone truth. Facility tenant PHI projection lacks facility ownership/purpose boundary.

**Business/authority boundary.** Facility resources use typed branch/role/purpose commands, bounded transactional ward/bed/OT capacity, idempotent admission/discharge/shift transitions, validated participant consent/capability, and minimum necessary audited/retained clinical/operational projections. Facility shifts validate staff relationship, interval overlap and timezone with authoritative state/audit. Facility views enforce active facility/branch relationship and clinical purpose, return minimum PHI projection and retain access audit.

**Frozen exact evidence.** `F-668: src/modules/facility-ops/facility-ops.module.ts:207–241,325–333`<br>`F-976: src/modules/compat/admin-spa.module.ts:197–220`<br>`F-660: src/modules/facility-ops/facility-ops.module.ts:82–109`<br>`F-661: src/modules/facility-ops/facility-ops.module.ts:112–150`<br>`F-670: src/modules/facility-ops/facility-ops.module.ts:383–417`<br>`F-664: src/modules/facility-ops/facility-ops.module.ts:161–171,289–302`<br>`F-667: src/modules/facility-ops/facility-ops.module.ts:213–241`<br>`F-662: src/modules/facility-ops/facility-ops.module.ts:60–79`<br>`F-663: src/modules/facility-ops/facility-ops.module.ts:29–50`<br>`F-669: src/modules/facility-ops/facility-ops.module.ts:342–418`<br>`F-659: src/modules/facility-ops/facility-ops.module.ts:253–339,345–418`<br>`F-945: src/modules/compat/compat.module.ts:534–562,758–838`

**Constituent labels.** `CONFIRMED_ROOT_CLINICAL_SAFETY_DEFECT_FACILITY_SURGERY_PARTICIPANT_CONSENT_CAPACITY_VALIDATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_ADMIN_SHIFT_MEMBERSHIP_OVERLAP_TIMEZONE`<br>`CONFIRMED_ROOT_CODE_DEFECT_FACILITY_ADMISSION_BED_WARD_ATOMIC_RESERVATION_COUNTER`<br>`CONFIRMED_ROOT_CODE_DEFECT_FACILITY_DISCHARGE_BED_WARD_ATOMIC_IDEMPOTENT_RECONCILIATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_FACILITY_RESOURCE_INVALID_VALUE_REJECT_TRUTHFUL_OUTCOME`<br>`CONFIRMED_ROOT_CODE_DEFECT_FACILITY_SHIFT_STAFF_RELATION_TIME_DEPARTMENT_DTO_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_FACILITY_SURGERY_OT_INTERVAL_ATOMIC_RESERVATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_FACILITY_WARD_BED_BOUNDED_TRANSACTIONAL_CREATION`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_FACILITY_ADMISSION_CLINICAL_PURPOSE_PROJECTION_RETENTION_AUDIT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_FACILITY_COMMS_RESOURCES_ROLE_BRANCH_TYPE_LIFECYCLE_GOVERNANCE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_FACILITY_OPS_MEMBERSHIP_ROLE_BRANCH_SCOPE_AUTHORIZATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_FACILITY_TENANCY_PHI_PROJECTION`

### `R-23C`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 13 |
| Confirmed raw IDs | F-3809<br>F-3802<br>F-1484<br>F-3799<br>F-3808<br>F-3806<br>F-3807<br>F-3810<br>F-3803<br>F-3804<br>F-3805<br>F-3801<br>F-3797 |
| Owners | Hospital Staff Operations + Security/Privacy<br>Provider/Facility Governance |
| Derived graph | F-3800 |

**Observed constituent causes.** Hospital staff onboarding/maintenance lacks verified credential/qualification/approval, owner-account and permission invariants, fee provenance, typed commands, MFA/session/offboarding lifecycle, idempotency and purpose-safe audit projections. Doctor profile nested schedule/location/insurance fields lack typed validation and provenance.

**Business/authority boundary.** Hospital staff records bind a verified qualified identity to one authoritative owner account and allowlisted permissions; credential approval, fee/currency provenance, typed commands, MFA/reset/revocation, suspension/offboarding, assignment retention, idempotency and immutable actor/reason audit are enforced. Provider profiles use typed versioned validated schedule/location/insurance references with authoritative source/provenance and bounded public projection.

**Frozen exact evidence.** `F-3809: src/modules/hospital-staff/hospital-staff.module.ts:47–80`<br>`F-3802: src/modules/hospital-staff/hospital-staff.module.ts:39–65,70–78`<br>`F-1484: src/modules/doctors/doctors.schemas.ts:27–36`<br>`F-3799: src/modules/hospital-staff/hospital-staff.module.ts:47–56,70–80`<br>`F-3808: src/modules/hospital-staff/hospital-staff.module.ts:44–48`<br>`F-3806: src/modules/hospital-staff/hospital-staff.module.ts:83–90`<br>`F-3807: src/modules/hospital-staff/hospital-staff.module.ts:92–99`<br>`F-3810: src/modules/hospital-staff/hospital-staff.module.ts:66–80`<br>`F-3803: src/modules/hospital-staff/hospital-staff.module.ts:39–65`<br>`F-3804: src/modules/hospital-staff/hospital-staff.module.ts:39–43,70–78,113–123`<br>`F-3805: src/modules/hospital-staff/hospital-staff.module.ts:101–109`<br>`F-3801: src/modules/hospital-staff/hospital-staff.module.ts:55–58,70–78`<br>`F-3797: src/modules/hospital-staff/hospital-staff.module.ts:39–65`

**Constituent labels.** `CONFIRMED_ROOT_AUDIT_DEFECT_HOSPITAL_STAFF_PRIVILEGED_MUTATION_ACTOR_REASON_EVENT_DURABILITY`<br>`CONFIRMED_ROOT_CLINICAL_SAFETY_DEFECT_HOSPITAL_STAFF_QUALIFICATION_CAPABILITY_CREDENTIAL_VALIDATION`<br>`CONFIRMED_ROOT_CODE_DEFECT_DOCTOR_PROFILE_NESTED_SCHEDULE_LOCATION_INSURANCE_VALIDATION_PROVENANCE`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOSPITAL_STAFF_CANONICAL_OWNER_ACCOUNT_FIELD_INVARIANT`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOSPITAL_STAFF_CREATE_UNIQUE_CONFLICT_IDEMPOTENCY_ERROR_CONTRACT`<br>`CONFIRMED_ROOT_CODE_DEFECT_HOSPITAL_STAFF_SUSPENSION_ACCESS_ASSIGNMENT_SESSION_LIFECYCLE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_HOSPITAL_STAFF_OFFBOARDING_ASSIGNMENT_RETENTION_AUDIT`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_HOSPITAL_STAFF_ROLE_PURPOSE_PROJECTION`<br>`CONFIRMED_ROOT_PRODUCT_TRUTH_DEFECT_HOSPITAL_STAFF_CONSULTATION_FEE_CURRENCY_PROVENANCE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_HOSPITAL_STAFF_COMMAND_DTO_IDENTIFIER_VALIDATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_HOSPITAL_STAFF_PASSWORD_RESET_MFA_SESSION_REVOCATION_AUDIT`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_HOSPITAL_STAFF_PERMISSION_ALLOWLIST_APPROVAL`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_HOSPITAL_STAFF_VERIFICATION_CREDENTIAL_APPROVAL_GATE`

### `R-24A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 11 |
| Confirmed raw IDs | F-502<br>F-495<br>F-1506<br>F-1505<br>F-1510<br>F-1504<br>F-181<br>F-494<br>F-1508<br>F-1503<br>F-500 |
| Owners | Legal/Compliance + Privacy |
| Derived graph | F-1509 |

**Observed constituent causes.** Legal policy and acceptance handling lacks immutable typed consent value/version/artifact evidence, owner/org scope, Arabic artifact fidelity, effective/publication rules, unique idempotent archive lifecycle, device/platform provenance and bounded pending applicability.

**Business/authority boundary.** Every consent/acceptance records an immutable typed value, policy version/effective artifact digest and authorized subject/organization scope; policy publication is allowlisted/versioned, acceptance is unique/idempotent/archive-durable with device/platform provenance and pending applicability is explicitly bounded/audited.

**Frozen exact evidence.** `F-502: src/modules/legal/legal-enterprise.controller.ts:125–138 ; src/modules/legal/legal-enterprise.service.ts:365–387`<br>`F-495: src/modules/legal/legal-enterprise.service.ts:50–77 ; src/modules/legal/legal-enterprise.controller.ts:26–41`<br>`F-1506: src/modules/legal/legal.module.ts:103–120`<br>`F-1505: src/modules/legal/legal.module.ts:98–112`<br>`F-1510: src/modules/legal/legal.module.ts:123–128`<br>`F-1504: src/modules/legal/legal.module.ts:68–95`<br>`F-181: src/modules/auth/auth.service.ts:125–131`<br>`F-494: src/modules/legal/legal-enterprise.controller.ts:43–53 ; src/modules/legal/legal-enterprise.service.ts:79–94`<br>`F-1508: src/modules/legal/legal.module.ts:108–118`<br>`F-1503: src/modules/legal/legal.module.ts:68–95,180–185`<br>`F-500: src/modules/legal/legal-enterprise.controller.ts:75–123`

**Constituent labels.** `CONFIRMED_ROOT_CODE_DEFECT_CONSENT_TYPED_VALUE_POLICY_VERSION_EVIDENCE`<br>`CONFIRMED_ROOT_CODE_DEFECT_LEGAL_ACCEPTANCE_ARABIC_ARTIFACT_FIDELITY_HASH`<br>`CONFIRMED_ROOT_CODE_DEFECT_LEGAL_ACCEPTANCE_ARCHIVE_SAGA_DURABILITY`<br>`CONFIRMED_ROOT_CODE_DEFECT_LEGAL_ACCEPTANCE_UNIQUE_IDEMPOTENCY`<br>`CONFIRMED_ROOT_CODE_DEFECT_LEGAL_PENDING_APPLICABILITY_TYPED_SCOPE_BOUNDS`<br>`CONFIRMED_ROOT_CODE_DEFECT_LEGAL_POLICY_VERSION_EFFECTIVE_PUBLICATION_LIFECYCLE`<br>`CONFIRMED_ROOT_COMPLIANCE_DEFECT_MUTABLE_CONSENT_EVIDENCE`<br>`CONFIRMED_ROOT_PRIVACY_DEFECT_LEGAL_ACCEPTANCE_ARCHIVE_OWNER_SCOPE_AUTHORIZATION`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_LEGAL_ACCEPTANCE_DEVICE_PLATFORM_EVIDENCE_PROVENANCE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_LEGAL_POLICY_UPSERT_FIELD_ALLOWLIST_PUBLICATION_GATE`<br>`CONFIRMED_ROOT_SECURITY_DEFECT_PROVIDER_LEGAL_ENDPOINT_ROLE_ORGANIZATION_SCOPE`

### `R-25A`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-376 |
| Owners | Configuration/API Platform + Pricing/Finance + SRE |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** Client configuration converts environment strings only to finite numbers, allowing negative or extreme VAT/delivery values and publishing them without currency/scale/range or startup policy validation.

**Business/authority boundary.** Public client configuration is a versioned, typed and range-validated server contract. Tax, delivery and currency presentation values must be policy-approved and cannot be the payment/quote authority; invalid configuration fails startup or is explicitly unavailable.

**Frozen exact evidence.** `F-376: src/modules/config/config.service.ts:16–25`

**Constituent labels.** `CONFIRMED_ROOT_CONFIGURATION_PRICING_VALIDATION_DEFECT_FINITE_ONLY_ENV_PARSE_PERMITS_NEGATIVE_EXTREME_VAT_DELIVERY_NO_CURRENCY_RANGE_STARTUP_GATE`

### `R-25B`

| Register field | Consolidated evidence |
|---|---|
| Candidate labels | 1 |
| Confirmed raw IDs | F-413 |
| Owners | API Platform + Localization + Security |
| Derived graph | `NONE_FOUND_AFTER_TARGETED_SEARCH` for all constituent labels |

**Observed constituent causes.** I18n lookup returns an unknown raw key and performs a single unescaped replacement per parameter, with no validated locale/key/parameter schema, safe fallback or repeated-placeholder handling.

**Business/authority boundary.** Localized messages use a canonical typed key/locale/parameter contract with safe interpolation and approved fallback behavior. Missing keys and invalid parameters are observable controlled errors; translated copy never supplies clinical, legal, payment or state truth by itself.

**Frozen exact evidence.** `F-413: src/modules/i18n/i18n.service.ts:728–733`

**Constituent labels.** `CONFIRMED_ROOT_I18N_CONTRACT_DEFECT_MISSING_KEY_RAW_LEAK_AND_SINGLE_OCCURRENCE_INTERPOLATION_NO_CANONICAL_SAFE_FALLBACK`

## Explicit non-closure boundaries

This register does **not** close behavior that requires a controlled environment or external authority. The separately reported runtime/external gates—including Mongo DNS resolution, Redis persistence health, appointment enum validation, PSP live activation/payment availability, and BSON/ObjectId failures—remain unexecuted and cannot be resolved by static source inspection. Likewise, no claim is made that every user journey was exercised screen-by-screen, that any data migration is safe, or that any provider, insurance, notification, payment, storage, or clinical integration is operational.

No product source was modified in creating this register. The next permissible work product is a constrained vertical remediation plan that begins from these root boundaries and preserves the stated business rules; it must not be treated as an approval to execute or deploy.

## Local evidence references

1. `NABD_Final_Root_Mapping_WORKING_2026-08-25.tsv` — completed 852-row manual mapping register.
2. `raw_findings_reviewer_gate_ledger.tsv` — frozen raw evidence/taxonomy ledger for the baseline.
3. `PHASE4_MAPPING_COMPLETENESS_AUDIT_2026-08-27.md` — independent reconciliation result.
4. `PHASE4_CROSS_ROOT_DERIVED_REVIEW_2026-08-27.md` — documented non-owning derived fan-out.
5. `PHASE4_ARTIFACT_DELTA_ISOLATION_2026-08-26.md` — isolation record for artifact-only remote deltas.
