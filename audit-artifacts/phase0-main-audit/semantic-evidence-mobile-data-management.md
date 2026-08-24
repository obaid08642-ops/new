# Semantic evidence — Mobile Data Management

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/data.tsx:1–16` is marked `@ts-nocheck` and uses `apiFetch`. It reads `/users/me/storage`, stores returned items/total and silently ignores failure (`:18–33`). Empty storage is rendered as `جاري التحميل...`, which conflates loading with an empty or unavailable result (`:105–129`). The footer hard-codes `2 GB` as the total denominator (`:129`).

The page defines four data actions (`:34–63`). The privacy-policy link routes to `/settings/privacy`, but the download/export action, data portability action and permanent deletion action all have empty callbacks (`action: () => {}` at `:40,47,61`). Their labels nevertheless claim JSON/PDF delivery within 24 hours and FHIR R4/HL7 compatibility (`:35–46`). The screen also states a legal right to access/transfer/delete data (`:84–98`) without a corresponding executable workflow in this source.

The rendered action icon is the literal icon-name string rather than an icon component (`:131–150`), creating a UI quality/accessibility issue. No request status, idempotency, re-authentication, export download, portability package, deletion lifecycle or error/retry behavior is shown.

No Phase 0 remediation was made.
