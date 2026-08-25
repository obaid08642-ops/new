# Phase 0B semantic evidence — Care discovery, appointments and referrals

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/care/care.service.ts:2–325`
- `src/modules/care/care.controller.ts:2–111`
- `src/modules/care/appointments.service.ts:2–471`
- `src/modules/care/appointments.controller.ts:2–80`
- `src/modules/care/appointments.dto.ts:2–72`
- `src/modules/care/slot.service.ts:2–108`
- `src/modules/care/doctor-integration.controller.ts:2–56`
- `src/modules/care/doctor-referrals.controller.ts:2–115`
- `src/modules/care/care.module.ts:2–37`

Care discovery applies public filters for active/approved providers and facilities, allowlisted projections, bounded search/page sizes, distance sorting and availability checks (`care.service.ts:44–165,168–229,232–315`). Distance input is parsed by controller without visible coordinate bounds, and availability/next-slot calls repeatedly query appointments for up to 14 days (`care.service.ts:77–165; slot.service.ts:26–107`). Slot generation uses UTC dates, working-hour strings, overnight windows, 15-minute lead time and booked statuses, but does not visibly validate date format strictly, working-hour values or duration bounds (`slot.service.ts:26–79`).

Appointment creation supports family on-behalf booking, service/payment policy, doctor eligibility, future/15-minute slot validation, overlap lookup, server-side price/fee snapshot and card-vs-cash/insurance state behavior (`appointments.service.ts:37–189`). The overlap check and insert are separate; a unique-index error is only relied upon as a fallback. DTO does not include `for_member_id`, although the service accepts it (`appointments.dto.ts:17–60; appointments.service.ts:54–78`). Appointment detail injects hard-coded queue fields (`appointments.service.ts:226–246`). Access allows patient, doctor identity variants and admins; list admin scope is broad (`191–223`).

Cancellation computes refund percentages and a fixed doctor penalty, saves the appointment, emits refund event, then transitions separately (`276–324`). Rescheduling checks overlap then clones a confirmed appointment and marks the original rescheduled with compensating deletion if the second save fails; it does not visibly carry `booked_by_user_id`, idempotency or payment/refund reconciliation (`373–428`). Waitlist only emits an event and returns success without durable waitlist persistence (`430–443`). Payment completion marks paid, saves, transitions and emits separately (`445–470`).

Doctor integration has no visible guards and accepts raw doctor/appointment/patient ObjectIds, prices, networks, images, diagnosis, medications and insurance snapshot; it upserts settings and writes a unique encounter but does not visibly verify actor ownership or linked appointment/patient/doctor relationships (`doctor-integration.controller.ts:7–55`). Doctor referrals guard JWT/no-guests and check doctor ownership for listing/issuance, but issue flow accepts raw IDs/arrays/notes and creates referral without visible idempotency or linked appointment ownership; diagnostic callback has no visible auth/secret/signature verification, validates only appointment ObjectId construction and appends raw URLs (`doctor-referrals.controller.ts:9–115`).

Care module registers discovery, appointments and referrals controllers/services, slot engine, workflow engine, schemas and repositories (`care.module.ts:21–37`). No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: hard-coded queue truthfulness defects; appointment overlap/idempotency and payment/refund saga risks; DTO/contract drift; waitlist false success; availability load/timezone validation gaps; unauthenticated doctor integration; referral/result callback authorization and attachment risks; and broad clinical/insurance PII exposure.

## Additional clinical schema members read

The following schema members were read in full:
- `src/modules/care/schemas/encounter-record.schema.ts:2–42`
- `src/modules/care/schemas/encounter-referrals.schema.ts:2–33`
- `src/modules/care/schemas/doctor-profile-extended.schema.ts:2–38`

`EncounterRecord` uniquely links one appointment and stores required free-text diagnosis, an untyped prescribed-medications array, and an insurance claim snapshot containing status, pre-authorization reference, coverage percentage, copay and carrier (`encounter-record.schema.ts:4–40`). The schema has no visible bounds, field-level encryption, immutable update policy or numeric/range constraints for medication and insurance values.

`EncounterReferral` links appointment/patient/doctor and stores arbitrary lab/radiology code arrays, free-form home-care notes, a boolean returned-results flag, raw result file URLs and a two-value routing status (`encounter-referrals.schema.ts:4–31`). There are no visible URL allowlist/size limits, result versioning, callback idempotency or immutable completion constraints.

`DoctorProfileExtended` uniquely keys a doctor and stores institutional links, three prices, maximum home radius, accepted insurance networks, gallery URLs and a free-form weekly schedule object (`doctor-profile-extended.schema.ts:6–36`). Prices/radius and schedule have no visible non-negative/range/schema validation, and image URLs/networks have no visible canonicalization or ownership validation.

### Additional schema findings candidates

The read supports: weakly typed immutable clinical/insurance records, raw result URL exposure/storage, missing attachment lifecycle controls, and unvalidated pricing/radius/schedule configuration.

No product code was changed and no tests/builds were executed during this semantic read.
