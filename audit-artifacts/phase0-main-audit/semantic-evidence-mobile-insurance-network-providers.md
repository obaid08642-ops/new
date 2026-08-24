# Semantic evidence — Mobile Insurance Network Providers

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/insurance/network-providers.tsx:49–69` loads `/users/me/profile`, takes `profile.insurance`, then constructs `/providers` query parameters from `company_id/provider`, network and class. Profile failure is converted to `null`; provider request failure is converted to `[]`, so unauthenticated, unavailable, malformed and no-policy states can converge on an empty list. No explicit retry or error state exists.

The screen sends insurance identifiers and class values without typed schema validation or proof that the policy is active/verified/eligible (`:52–64`). Local filters compare provider `type` strings to a fixed list (`:21–37,71–77`), which omits radiology and home-care from selectable filters despite those types being listed in `TYPE_LABELS`. Search uses raw substring matching on name/city and has no debounce, normalization or locale-aware contract (`:71–77`).

Provider cards display server names, specialties, city and phone without schema/freshness/licence/network coverage validation (`:183–272`). The phone button calls `Linking.openURL('tel:...')` directly without confirmation, number validation, consent/audit or fallback. Cards are not pressable and provide no provider detail, coverage verification, booking handoff, map, ownership or authorization context. No Phase 0 remediation was made.
