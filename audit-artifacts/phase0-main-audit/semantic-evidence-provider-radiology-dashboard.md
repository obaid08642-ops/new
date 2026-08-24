# Semantic evidence — Provider RadiologyDashboard

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/NabdProvider-provider/src/screens/radiology/RadiologyDashboard.tsx:12–79` defines a radiology state machine from NEW_REQUEST through insurance/copay, confirmation, arrival, scanning, draft/review/ready, abort and cancellation. The navigator exposes home, orders, catalog, schedule, settings, order detail, reporting, insurance requests and wallet.

Radiology home and orders load `/radiology/provider/inbox` (`:82–97`, `:135–149`) and locally derive statistics and tabs. Fetch errors reset orders/statistics to zero or are otherwise swallowed, making unavailable data resemble no orders. Cards display patient name, scan name, payment/state and safety questionnaire flags for pregnancy, pacemaker and contrast allergy (`:107–127`, `:160–171`); this is sensitive clinical data and needs least-privilege/role/retention evidence.

Order detail refreshes `/radiology/bookings/{id}` and performs action POSTs under `/radiology/bookings/{id}/{action}` (`:180–198`). Later source markers show report upload/review/publish, an explicitly disabled image-upload button, catalog delta requests and schedule-update mutations. These need exact backend method/schema, authorization, audit, idempotency and clinical-signoff verification.

The UI's state labels and local derived revenue do not prove the backend lifecycle. Required proof includes scan consent/preparation, identity matching, image/report integrity, emergency abort safety, contrast reaction handling, radiologist review, publish/retract/correction, patient visibility, insurance/cash settlement and secure media storage.

No Phase 0 remediation was made.
