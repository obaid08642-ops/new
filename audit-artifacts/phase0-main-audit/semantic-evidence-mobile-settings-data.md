# Semantic evidence — Mobile Settings Data Management

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/data.tsx:24–33` reads `/users/me/storage`, but failure is swallowed and the screen keeps `0 MB`/loading-like output. The storage response is untyped; item `pct` is interpolated directly into width without range validation (`:107–129`), and there is no refresh, stale/error state, per-category PHI classification or proof that the reported 2 GB quota is server truth.

Three visible data rights actions are nonfunctional: download (`:34–41`), portability (`:42–48`), and permanent deletion (`:57–62`) all have `action: () => {}`. The UI claims JSON/PDF delivery within 24 hours and FHIR R4/HL7 compatibility without any request, export job, file delivery, identity verification, consent, status, expiry or audit trail. Deletion is separately exposed in Privacy but this screen does not link to it or explain legal retention/irreversibility. The only active action routes to Privacy (`:49–55`).

Labels claim regulatory data access/portability/deletion rights (`:84–97`) and the footer claims a fixed data quota (`:129`) without source/version. Icon names are rendered as text (`:131–150`) rather than using the imported `Icon`, creating a visible design/semantics defect. No Phase 0 remediation was made.
