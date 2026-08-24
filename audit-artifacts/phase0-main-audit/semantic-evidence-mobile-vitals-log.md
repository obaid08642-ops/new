# Semantic evidence — Mobile Vitals Log

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/health/vitals-log.tsx:1–16` defines six vital types: blood pressure, glucose, heart rate, weight, temperature and SpO2, with local units/colors. The screen loads `/health/vitals?type={type}&limit=30` and distinguishes error, loading and empty states with retry (`:18–39,54–63`). It explicitly avoids drawing trends or averages without actual data and displays a non-diagnostic disclaimer.

The add form supports manual source readings and context morning/afternoon/evening (`:41–52,63`). It only requires a non-empty primary value, and for blood pressure a non-empty secondary value; it converts strings with `Number()` but does not validate finite values, clinically valid ranges, unit consistency, timestamp/source integrity or cross-field constraints before POSTing `/health/vitals` (`:41–50`).

The mutation is a plain `POST /health/vitals` with no visible `Idempotency-Key`, request nonce, duplicate-submit policy or ownership evidence (`:44–50`). The UI disables the button only through a loading prop during the request; replay and network retry semantics are unproven. Returned readings are rendered using `reading.id`, `value`, `unit`, `measured_at` and `context` (`:61`), with `any` response handling.

No Phase 0 remediation was made.
