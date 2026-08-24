# Semantic evidence — Mobile Language Settings

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/language.tsx:1–14` is marked `@ts-nocheck` and obtains `LANGUAGES`, current `lang` and `setLang` from `AppContext`. It renders every configured language and updates the global language state on row press (`:24–47`). No backend request is made by this screen.

The language header is bilingual Arabic/English (`:17–22`). The row renders native and English labels, but the flag expression intentionally returns an empty string for every listed country (`:44`), leaving a visually empty flag slot. The inline comment says navigation may go back or reload if needed, but no reload, route replacement, persistence confirmation or error state is implemented (`:28–33`).

The source does not prove persistence across app restart, synchronization with Web locale routing, translation completeness, or RTL/layout changes after language selection. It therefore cannot support a claim of six-locale production parity by itself.

No Phase 0 remediation was made.
