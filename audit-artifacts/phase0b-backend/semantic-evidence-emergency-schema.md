# Phase 0B semantic evidence — EmergencyRequest schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/emergency.schema.ts:1–36`

`EmergencyRequest` is a timestamped `emergency_requests` collection with generated UUID-like ID, required indexed patient ID, optional patient name/phone, location object, symptoms, severity, enum-backed state, hospital/ambulance/provider assignment, patient-facing unit/paramedic fields, claim/location/resolution fields and state history (`6–33`). The schema uses an `EmergencyState` enum for state and defaults new records to `TRIGGERED` (`16–17`); it has no other visible indexes beyond patient/state fields (`8–17`).

The comments distinguish internal provider account ID from patient-safe unit/paramedic display values, which is a useful projection intent (`20–25`). However, the schema itself does not enforce that separation or prevent internal fields from serialization; it also persists patient name/phone, symptoms, exact location, admin notes, resolver identity and live unit coordinates without visible minimization, retention, encryption, consent or role-based projection policy (`9–14,20–31`). Coordinates have no bounds/precision validation and location timestamps have no freshness constraint (`12–13,27–28`).

`severity` is a free string with a default of `critical`, and claim/resolution/state-history fields have no actor authenticity, transition allowlist, monotonicity, optimistic concurrency, idempotency or audit integrity constraints (`14–17,26,30–33`). Hospital/ambulance/provider relationships lack compound uniqueness, provider/fleet authorization, active availability, facility scope or assignment expiry (`18–21`). There is no TTL/auto-close/retention index, geospatial index, deduplication key, incident correlation key or soft-delete field visible here (`6–33`). No code was changed and no build/test/application operation was performed during this read.
