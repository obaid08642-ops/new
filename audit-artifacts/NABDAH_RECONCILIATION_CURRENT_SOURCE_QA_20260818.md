# Nabdah reconciliation-source QA — current branch baseline

This pass was run after extracting the four committed artifacts from the current `manus/on-live-reconciliation` HEAD into `/home/ubuntu/nabdah-reconciled-source`.

The extracted components are:

| Component | Source artifact |
|---|---|
| Backend | `nabdah-backend.zip` |
| Patient | `nabd_plus_patient_app.zip` |
| Provider | `NabdProvider-provider.zip` |
| Admin | `Napd-admin-dashboard.zip` |

The new UI/action inventory contains **4,207 markers** across Patient, Provider, and Admin: 814 wired candidates, 3,114 UI-action reviews, 49 fail-closed reviews, 221 placeholder candidates, and 9 stale/environment reviews. This is a triage inventory; classifications require source and contract verification.

The current Backend source produced **1,391 composed controller routes**. The concrete API-call extractor found **728 calls**: POST 322, GET 327, PATCH 46, DELETE 18, and PUT 15. Method-aware matching found **530 matched calls** and **198 `UNMATCHED_API_REVIEW` records**. The unmatched set is not a confirmed bug count because concatenated/template expressions, client aliases, query expressions, and provider/admin-specific wrappers require reconstruction before PASS/FIX/BLOCKED classification.

The detailed TSV evidence is:

- `NABDAH_RECONCILIATION_SOURCE_UI_MARKERS_20260818.tsv`
- `NABDAH_RECONCILIATION_BACKEND_ROUTES_20260818.tsv`
- `NABDAH_RECONCILIATION_ACTUAL_API_CALLS_20260818.tsv`
- `NABDAH_RECONCILIATION_API_ROUTE_MATCH_20260818.tsv`

No production mutation was performed in this pass. The next step is to reconstruct and manually classify the 198 API review candidates, then run package build/test gates from these extracted artifacts.
