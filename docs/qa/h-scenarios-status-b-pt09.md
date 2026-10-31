# H scenarios, status B: PT-09

| ID | Scenario | Status after | Evidence | Notes |
|---|---|---|---|---|
| PT-09 | Reports (lab, radiology) viewed and downloaded | COVERED (client) | `patient-app/src/__tests__/orders/report-download.test.tsx` (new, 9 tests); `patient-app/src/utils/shareFile.test.ts` (new); `src/__tests__/orders/orders-screens.test.tsx` results tab (existing) | Live journey `j_lab_result_push.py` not run; the share sheet itself cannot be driven in jest |

## What exists
- `src/components/orders/ResultsPanel.tsx`: cards from GET `/lab-results/mine` and `/radiology/reports/mine`; actions view, PDF (lab booking report file only), share with doctor, book.
- `app/diagnostics/order/[id].tsx` `handleDownload`: lab report file via `downloadProtected` (`/labs/bookings/:id/reports/:reportId`) then share; radiology opens `/reports/view-report?id=`; otherwise the no-report alert.

## What I tested (new)
- PDF action only for a lab booking's report file (not for a result without file, not for radiology).
- PDF: downloads through the protected API path with the report file name, then shares as `application/pdf`; a refused download shows the no-report alert and shares nothing.
- Radiology result opens its order; booking screen: lab download+share, lab with no report file (alert, no download), lab refused download (alert, no share), radiology with a report id (opens the report view), radiology without one (alert).

## What I fixed
- `ResultsPanel.tsx:62` and `app/diagnostics/order/[id].tsx:119`: `shareAsync` was awaited without a catch, so a share sheet that refused (no target, no sharing on device) became an unhandled promise rejection from `void pdf(item)` / the section action. Both now call the new `src/utils/shareFile.ts`, which logs and never throws. No user-visible text added.

## Backend gaps (not changed)
- None found for this path.

## Not verified
- Real file download and share on a device; `tools/live/j_lab_result_push.py` (no backend here). `shareFile.test.ts` exercises the failure branch through the jest limitation on dynamic imports (the import itself fails), not through a real refusing share sheet.
- `app/diagnostics/lab-result.tsx` (the lab result detail screen) was not tested here.
