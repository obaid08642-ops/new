# Semantic evidence — Mobile Medical Timeline

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/reports/timeline.tsx:40–52` loads `/medical-reports/timeline` and stores the response list, but any failure is only logged and `loading` is cleared. The UI then renders the same empty message as a legitimate no-record/filter result (`:122–130`), with no error/retry/offline/stale distinction.

Filtering compares a local union of five event types against the response `e.type` (`:26–27,54–57,93–119`) without typed schema validation, unknown-event handling or server ordering/freshness proof. Event IDs, date/time, color, icon, title and details render directly (`:133–202`) without non-empty ID validation, date parsing, PHI minimization, source/actor/status context, ownership proof or detail navigation.

Every event with `hasFile` exposes “Download analysis PDF”, but `handleDownload` only opens a localized alert and does not download, authorize, bind or audit a document (`:59–63,204–224`). The QR header routes to the Health Passport without preserving timeline/event context (`:87–90`).

The screen has no report mark-read, share, retry, pagination, event deduplication, timezone/source labeling, or explicit clinical-status semantics. No Phase 0 remediation was made.
