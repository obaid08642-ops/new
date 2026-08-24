# Semantic evidence — Mobile Family Member Health

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/family/member-health.tsx:1–25` is marked `@ts-nocheck` and uses route params, `apiFetch`, localization and date helpers. The member identifier is taken directly from `params.id`; name and relation come from route params with fallback labels (`:29–36`).

The screen fetches a granular bundle from `/family/member-records/{memberId}` and locally extracts heart rate, blood pressure, weight, medications and next appointment (`:41–103`). The comment claims sections are permission-filtered by the backend (`:45–50`), but the source does not independently verify returned permission scope or distinguish missing permission from missing data.

Any fetch error, including unauthorized, forbidden, not-found or network failure, is logged and converted into a populated member object with route-derived name/relation and empty vitals/medications/appointment (`:104–117`). The UI then presents normal empty states, so unavailable/denied/unknown member is not visibly distinguishable.

Age is calculated locally from `birth_date` and medication names are localized from Arabic/English fields (`:78–93`). Doctor/specialty/date are transformed locally and displayed (`:94–103,250–273`). This needs timezone, PHI minimization and permission-scope evidence.

The screen links to permissions, family chat and consultation booking (`:147–161,276–290`). The booking CTA routes to the general consultations tab without passing `memberId`, consent context, or proving that proxy-booking permission is active. Chat similarly routes to a general family chat without member context. No mutation, idempotency, or audit behavior is proven here.

No Phase 0 remediation was made.
