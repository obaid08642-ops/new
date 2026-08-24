# Semantic evidence — Mobile Reports Hub

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/reports/hub.tsx:68–86` loads `/medical-reports/mine?limit=100`, distinguishes loading, error and empty states, and supports retry/pull-to-refresh. The screen uses the server response list and no hard-coded report array remains according to the source comments (`:2–5,71–77`).

Filtering is local by linkage fields `lab_booking_id` and `radiology_booking_id`, with all other reports classified as notes (`:32–44,88–89`). This classification is not proven against a typed server enum and can misclassify new report kinds. `key={r.id}` and both detail/AI navigation pass `r.id` (`:172–183,232–255`) without explicit non-empty identifier validation, ownership/404 proof, or handling for a malformed report.

The hub displays title, facility/doctor, issued date, critical and unread badges from response fields (`:172–227`). It does not send a mark-read mutation when a report is opened; read state changes are therefore not proven. It exposes an “AI analysis” action to `/reports/ai-analysis` (`:244–255`), but this screen provides no consent, PHI disclosure, model/provenance, async job/status, rate limit, or failure contract for analysis.

The server response is rendered through `pickLocalized` and date formatting, but missing title/date falls back to generic “تقرير طبي”/empty display (`:46–57,212–217`), potentially hiding incomplete source records. The UI has no explicit stale/cache/partial page state and no evidence here for secure document/file access, download controls, redaction, or six-locale/a11y completeness. No Phase 0 remediation was made.
