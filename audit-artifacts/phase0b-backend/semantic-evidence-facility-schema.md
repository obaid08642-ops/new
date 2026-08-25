# Phase 0B semantic evidence — Facility schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/facility.schema.ts:1–64`

The schema models Hospital/Clinic/Medical Center/Polyclinic facilities and notes that doctors reference facility_id as a string FK (`7–11`). Facility stores generated id, optional parent_facility_id, Arabic/English names/descriptions, enum FacilityType, city/district/address/location, logo/images, phone/WhatsApp/website/email, departments, accepted insurance, accepts_insurance, nested insurance contracts, working-hours objects, rating/reviews_count, is_active, separate public/indexing eligibility, medical review status, review time and provenance (`11–63`).

Facility hierarchy is only a plain optional parent ID; no cycle prevention, parent-type/tenant boundary, ownership, active-parent, unique facility identity or deletion/merge semantics are declared (`13–18`). Names, type, descriptions, city/district/address and department slugs are free-form beyond FacilityType (`15–20,23–25,40`). Location has no coordinate bounds/precision/geocode freshness or privacy/access policy (`26–27`). Media/contact URLs and email/phone/WhatsApp are raw fields without validation, verification, secure access, content/size/retention or contact-consent controls (`30–37`).

Insurance arrays/contracts and accepts_insurance have no consistency invariant, effective dates, payer/provider/network validity, plan/benefit/country scope, authorization or source freshness (`40–44`). Working-hours nested objects use strings for day/open/close with no timezone, day uniqueness, interval/holiday/overnight or schedule version semantics (`46–48`). Rating/reviews_count are denormalized numbers without range, source, moderation, aggregation or anti-manipulation policy (`50–52`).

Operational is_active is separate from public/indexing eligibility and medical review, but no fail-closed cross-field publication invariant, reviewer actor/approval evidence, expiry/suspension reason or CAS/version is declared (`53–60`). Review provenance is a string only (`57–60`). No provider/doctor, department, service, booking or facility ownership referential integrity appears; no capability/availability/credential/inspection state is represented beyond free-form department and hours (`9,40,46–48`).

Facility contact, location, insurance and internal review/provenance data may be sensitive or security relevant; no projection, access audit, encryption, consent, retention, deletion/DSAR or legal-hold lifecycle is represented (`23–60`). No audit actor, notification, cache/search index consistency, idempotency, transaction, concurrency, soft-delete or live facility/review/insurance/runtime evidence is established by this source read. No code was changed and no build/test/application operation was performed during this read.
