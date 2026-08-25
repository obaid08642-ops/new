# Phase 0B semantic evidence — tracking ID generator

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/common/tracking.ts:1–28`

`trackingId` generates a human-readable code using an uppercased caller-supplied prefix, two-digit year/month from local process time, and five characters selected from an ambiguity-reduced alphabet with `Math.random()` (`1–15`). The file exports a static prefix map for orders, appointments, lab/home-care/prescription/result/support/radiology/medical-report concepts (`17–28`).

The readable alphabet and documented format are useful usability properties. The function does not validate the prefix against `TRACK_PREFIX`, length/character policy or tenant/domain namespace; callers can create arbitrary formats (`8,14,17–28`). `Math.random()` is not cryptographically secure, and five characters provide a finite collision domain without database uniqueness, retry, reservation or collision handling visible in this member (`12–14`).

The month/year uses local server time and two-digit year, creating timezone/clock/DST boundary ambiguity and eventual year ambiguity (`9–11`). No privacy analysis establishes whether these identifiers are safe to expose, whether they are enumerable, or whether they can be correlated with patient/order information. No test evidence covers collision probability under concurrency, deterministic clock boundaries, malformed prefixes, Unicode, leading/trailing spaces or cross-tenant enumeration. No code was changed and no build/test/application operation was performed during this read.
