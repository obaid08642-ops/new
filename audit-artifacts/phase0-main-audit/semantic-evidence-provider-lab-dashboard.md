# Semantic evidence — Provider LabDashboard

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/NabdProvider-provider/src/screens/lab/LabDashboard.tsx:2–30` declares an 18-screen Lab/Radiology provider scope. The Lab Orders tab loads `/labs/provider/inbox` (`:49–60`), exposes incoming/scheduled/processing/results tabs, and filters client-side over statuses including insurance, copay, assignment, sample collection/rejection, processing and uploaded result (`:62–70`). Failed fetches are converted to an empty list without a visible unavailable/retry state (`:55–60`, `:94–95`).

The order card displays patient name, insurance/cash, home collection versus lab attendance, total price, technician name and status (`:96–124`). This requires PHI minimization, server-authoritative amount and ownership evidence. The navigator exposes order detail, sample tracking, result entry/review, bundles, custom test, home collection, QR label, wallet, chat, TAT tracker and insurance (`:136–201`). These actions are not yet fully mapped to exact backend routes, schemas, role controls, audit/retention and idempotency.

The provider lab workflow is therefore not proven end-to-end even though its UI state labels resemble a complete lifecycle. Need verify sample identity/QR, chain of custody, result integrity/signing, publish authorization, correction/retraction, patient visibility, home-collection GPS and financial settlement.

No Phase 0 remediation was made.
