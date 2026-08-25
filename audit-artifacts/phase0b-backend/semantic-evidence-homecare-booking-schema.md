# Phase 0B semantic evidence — Home-care booking schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/home-care/schemas/home-care-booking.schema.ts:1–36`

`HomeCareBooking` stores patient, nurse and service identifiers, multiple selected dates, a free-form selected time and frequency (`14–23`). The schedule fields have no visible date/timezone/interval/recurrence validation, no slot uniqueness or capacity invariant, and no explicit booking ID, request/idempotency key or source-of-truth link. Transport type is an enum, but patient location is an unvalidated object containing address and coordinates (`25–27`), with no geospatial bounds, privacy projection, serviceability or location retention policy.

Payment method and booking status are runtime enums, but the status set only includes pending insurance/payment, confirmed, in-progress and completed; no cancelled, rejected, expired, rescheduled, no-show, failed-payment or disputed state is represented (`4–12,29–31`). `total_amount` and `transport_fee` are unconstrained optional numbers with no currency, quote/version, tax, server-calculation or atomic payment provenance (`29–34`). Insurance details are a free-form object containing provider, policy number and coverage status, with no validation, redaction, authorization, coverage evidence, authorization lifecycle or retention boundary (`34`). No visible indexes, compound uniqueness, patient/nurse/service foreign-key verification, overlap protection, optimistic concurrency, audit/provenance or deletion/anonymization policy exists in this schema. No product code was changed and no tests/builds were executed during this semantic read.
