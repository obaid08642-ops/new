# Semantic evidence — Mobile Health Home

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/(tabs)/health.tsx:1–30` is marked `@ts-nocheck` and uses Reanimated plus `apiFetch`. The quick grid exposes routes for vitals, medications, prescriptions, reports, family, family chat, smart reminders, articles and loyalty (`:32–88`). Each route needs independent existence/contract/ownership verification.

The screen loads `/health/vitals/summary`, `/health/score`, `/home/upcoming-appointment`, and `/nutrition/daily-summary?date=...` (`:99–127`). Each request catches failure to `null`; there is no visible global error, retry or unavailable state. Water is transformed locally from `total_water_ml` into 250ml glasses (`:112–123`), and the health score maps status labels locally (`:206–247`). These transformations require unit/status contract evidence.

The upcoming appointment card navigates to `/consultations/waiting-room` with `appointmentId: upcomingAppt.id || "1"` (`:338–373`), creating a fabricated identifier fallback that can open the wrong waiting room. The card labels every appointment as video (`:372`) without proving appointment modality. Health score recommendations render a literal lightbulb emoji (`:234–237`), conflicting with the no-emoji product requirement.

Vitals cards and score are rendered only when corresponding data exists, without a distinct empty/unavailable state (`:206–250,252–310`). The page uses staggered `FadeInDown` animations (`:176–204,208–249,261–264`) with no visible reduced-motion handling. Sensitive health summaries, appointment data, pregnancy-related profile flags and family/chat routes require strict ownership and PHI minimization evidence.

No Phase 0 remediation was made.
