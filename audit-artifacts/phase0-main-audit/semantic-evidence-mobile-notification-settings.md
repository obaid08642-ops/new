# Semantic evidence — Mobile Notification Settings

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/notifications-settings.tsx:1–11` is marked `@ts-nocheck`; it uses Reanimated and `apiFetch`. It loads `/users/me/notification-settings` and silently ignores failure (`:98–102`). Each unlocked toggle updates local state optimistically and PATCHes one key, again swallowing failure without rollback or visible unavailable state (`:104–114`).

The screen exposes general, appointment, order, offers, medication, doctor-message, emergency, sound and vibration settings (`:21–80`). Emergency is initialized true, marked locked, disabled and described as non-disableable (`:59–64,135–145,151–163`). The copy promises appointment reminders at one hour and fifteen minutes and medication alerts (`:29–32,47–50`), which require notification scheduling/delivery evidence rather than UI evidence alone.

The page uses staggered `FadeInDown` entrance animations up to 500ms (`:121–125,204–278`) but the source has no visible `prefers-reduced-motion` equivalent or accessibility state announcement. Web Notifications Settings was previously read-only, while Backend exposes notification PATCH with idempotency; this is a direct Web/Mobile/Backend contract mismatch.

No Phase 0 remediation was made.
