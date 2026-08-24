# Semantic evidence — Mobile Settings Language

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/language.tsx:11–49` renders the language list from `LANGUAGES` in `AppContext` and calls `setLang(item.code)` locally (`:24–33`). No API request, server preference, account/device synchronization, optimistic/error state or persistence proof exists in this screen. A new device/session may therefore use a different language, and failed persistence cannot be surfaced.

The UI labels the screen “اللغة / Language” and shows native/English labels, but the flag output is intentionally empty for every language (`:40–45`). This is a broken/placeholder visual affordance. The screen does not prove that all six supported locales have complete translations, date/number/currency formatting, RTL/LTR direction switching, restart/reload behavior, or localized error/legal/medical content. It also does not confirm accessibility labels or language-change confirmation for direction changes.

Selection has no completion feedback and does not close/reload; it assumes global state updates synchronously. Unsupported/unknown `item.code` handling is absent. No Phase 0 remediation was made.
