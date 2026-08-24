# Semantic evidence — Mobile Insurance Index

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/insurance/index.tsx:1–7` is only an Expo Router redirect from `/insurance` to `/insurance/hub`. It has no independent UI, API call, mutation, authorization logic, or additional scenario. Coverage is therefore represented by the Insurance Hub evidence; no separate finding is created for this wrapper.

No Phase 0 remediation was made.
