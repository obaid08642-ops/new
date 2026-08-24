# Semantic evidence — Mobile Medications

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/health/medications.tsx:1–9` uses `@ts-nocheck`, Reanimated and a localized `medicationT` helper. The screen loads `/health/reminders`, distinguishes loading/error and offers retry (`:21–27,34–42,50`). It accepts an array or `.data` response and stores reminders as an `any`-backed typed shape.

The page computes scheduled doses, taken doses, chronic count and a progress percentage locally from `today_doses`/`times` (`:29–32`). This is a presentation calculation and requires consistency checks against server status/timezone semantics; no server acknowledgment of dose-taking is present in this file.

The screen exposes navigation to `/health/medication-reminder-add`, `/health/medication-reminder-list`, `/health/chronic-medications` and `/health/prescriptions` (`:37,51–55`). “Device alerts / sync alerts” routes to the reminder list; it does not show device permission, push scheduling or actual synchronization behavior (`:52`). Add/manage mutations are outside this source, and no idempotency/ownership/error contract can be claimed here.

The page uses staggered `FadeInDown` animations (`:43–55`) with no visible reduced-motion handling. Localized labels are used, but completeness across all supported locales and backend field translation are not proven.

No Phase 0 remediation was made.
