# Phase 0B semantic evidence — Doctors catalog, appointments and provider communication

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:** `src/modules/doctors/doctors.module.ts:2–291` and its embedded schemas/controllers/services.

The module contains a seeded doctor array and default schedule; seeding is gated by `SEED_DEMO_DATA=true`, but the source includes realistic-looking doctors, fees, ratings, clinics and biographies (`doctors.module.ts:10–17,19–25,42–49`). Public list/detail/specialties/slots endpoints expose published accepting doctors. List filters use raw regex for search and insurance-company matching, return up to 100 records and do not visibly paginate, validate filter syntax or project a canonical public profile (`56–82`). Slot generation uses JavaScript local date/time helpers, default schedule, current time and booked appointment scan; timezone/date validation, capacity claim and slot-lock atomicity are not visible (`85–110`).

Booking checks required fields/doctor existence/accepting status and counts same-slot appointments before inserting. It accepts raw type/contact/documents/reason/address/payment/insurance inputs, derives fees from doctor document, then creates the appointment and separately emits events/notifications; no visible unique/idempotency/slot lock/current-version or payment/insurance validation exists (`112–145`). Patient appointments are limited to 100; doctor inbox allows provider/doctor/admin roles and admin sees all; detail checks patient ownership only for patient role and returns doctor plus consultation note (`148–180`).

Chat list checks patient ownership only for patient role; message post checks text/content patterns but does not verify that sender is participant/provider assigned to the appointment (`182–196`). Consultation note upsert allows provider/doctor/admin based on role but does not visibly verify doctor assignment, validates no clinical schema, merges arbitrary body fields and emits patient notification (`198–212`). Notifications are scoped by recipient ID but list/count are bounded without pagination/version; mark-read returns success regardless of match (`214–232`). Availability restricts role to provider/doctor but updates all doctor profiles for account and emits event without idempotency (`234–243`). Controllers mark public catalog routes with `@Public`, while all mutations lack visible idempotency and typed DTOs (`246–277`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: demo data risk, raw regex/filter exposure, timezone/slot correctness gaps, booking race and client-input trust, incomplete ownership on chat/notes, arbitrary clinical note mass assignment, broad inbox/admin exposure and notification/availability idempotency gaps.
