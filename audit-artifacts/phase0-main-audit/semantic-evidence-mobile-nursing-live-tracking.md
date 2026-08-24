# Semantic evidence — Mobile Nursing Live Tracking

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/nursing/live-tracking.tsx:80–95` polls `/nursing/visits/{bookingId}/tracking` every 15 seconds and updates `trackingData`/ETA. A request failure is silently ignored (`:83–90`), leaving the last known data visible with no stale timestamp, error banner, retry action, timeout or offline state. `bookingId` is taken from route params without visible identifier validation or owner/visit authorization handling.

The UI branches only on `trackingData.status === 'COMPLETED'` (`:99–137`); all other or unknown states render “nurse is coming”/“go to hospital” based only on the unvalidated route `type` (`:75,97,199–222`). No explicit assigned/accepted/en-route/arrived/in-progress/cancelled/no-show/failed/expired state contract is shown. Completed state claims that a medical report was uploaded and offers rating/medical-record access, but the button only navigates to tabs (`:106–133`).

Coordinates, ETA, nurse name/title/phone and vitals/notes are rendered directly from the response without schema/range/freshness/consent or PHI minimization validation (`:143–173,204–243`). The map exposes current and destination coordinates; the call action opens `tel:` directly and the navigation action opens an external Google Maps URL without number/coordinate validation, confirmation, audit, privacy disclosure or fallback (`:246–273`). No end-visit/arrival/acknowledgment mutation or live-location consent/retention semantics are visible. No Phase 0 remediation was made.
