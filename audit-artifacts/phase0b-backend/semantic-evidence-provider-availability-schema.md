# Phase 0B semantic evidence — provider-availability.schema.ts

**Archive member:** `src/schemas/provider-availability.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–16; full 16-line member covered.

Lines 2–5 import Document/uuid and define a timestamped ProviderAvailability schema. Line 7 provides a generated unique id. Line 8 requires indexed and unique provider_id. Line 9 stores working_hours as an array of objects with day/start/end. Line 10 stores blocked_slots as objects with start/end/reason. Line 11 stores optional vacation_mode object with from/to/reason. Line 12 defaults instant_available to true. Lines 14–16 define the document type and create the schema.

**Audit judgment:** Unique provider_id is a positive one-record-per-provider control. However all schedule structures are loose Object arrays with no day/time format, timezone, start<end, overlap, historical immutability or maximum-size validation; vacation and blocked periods have no range validation. There is no version/CAS, booking/slot reservation reference, idempotency key, exclusion/overlap index or audit actor. `instant_available` default true can be unsafe if provisioning/verification is incomplete. Schema uniqueness cannot alone prevent concurrent booking races or prove that a slot remained available at commit time.

No product code was changed and no tests were executed during this semantic read.
