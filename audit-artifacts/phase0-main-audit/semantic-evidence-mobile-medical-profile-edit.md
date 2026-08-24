# Semantic evidence — Mobile Medical Profile Edit

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/health/edit-profile.tsx:1–10` defines a medical profile draft and is not marked `@ts-nocheck` in this file. It loads `/medical-profile` and `/users/me/profile` in parallel (`:22–33`), distinguishes load error with a retry card (`:69–71`), and maps blood type, height, weight, gender, pregnancy, breastfeeding and smoking fields into local state (`:25–30,72–74`).

Save validates numeric height/weight bounds client-side, then PATCHes `/medical-profile` and navigates back on success (`:35–43`). The source shows no explicit idempotency key, duplicate-submit protection beyond loading state, typed DTO, server-side validation evidence or ownership test.

Avatar selection requests media permission, uploads multipart data to `/media/upload`, extracts a returned URL and PATCHes `/users/me/profile` (`:45–64`). It has a missing-URL check and visible error, but no upload size/type/security policy, cleanup on profile PATCH failure, idempotency or ownership evidence. This creates a two-step mutation where the media may remain orphaned if the profile update fails.

The screen links to `/health/conditions-allergies`, but the lifecycle of those sensitive conditions/allergies is outside this source. Pregnancy, breastfeeding, smoking and blood type are sensitive health attributes and require minimization, audit and strict patient ownership.

No Phase 0 remediation was made.
