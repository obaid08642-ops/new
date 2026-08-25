# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_MEDICAL_REPORT_VIEWER_AND_AI_CONTRACT_GAPS_20260819.md`
- **Member SHA-256:** `ab32bace1766c08af2a43614da7dea5c8d15ec28de1e9f3a5551c92c2859de24`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | **P0** | Report viewer calls a non-existent route | `app/reports/view-report.tsx` requests `GET /reports/:id`; the only protected report Controller is `GET /medical-reports/:id`. The report hub correctly uses `/medical-reports/mine`, so s`
- `12: | **P0** | Deep links and diagnostic history use a parameter the viewer ignores | Notifications and diagnostic results route with `reportId`; viewer and AI screen only read `params.id`. Those entry paths show “unable to load report” or “rep`
- `14: | **P1** | Report and AI screens are Arabic-only | Type labels, headings, actions, errors, disclaimer fallback, urgency notice, and content headings are raw Arabic strings. | Move all UI copy and report-type labels to six locale dictionarie`
- `15: | **P1** | AI analysis does not distinguish service failure from a report/authorization error | Any failure maps to one generic retry message, preventing a patient from knowing whether the report is unavailable, unauthorized, malformed, or `
- `16: | **P2** | No explicit treatment of report fields not represented in the viewer | The viewer supports selected textual fields/categories but has no deliberate presentation for report attachments, external diagnostic files, or a no-content-b`
- `20: The existing server ownership checks are **PASS**. The Patient report-viewer workflow is **FIX/BLOCKED** until its canonical route/parameter handling works across every entry point and it meets the required multilingual, disclosure, and sec`
### backend_consumers_or_contracts
- `15: | **P1** | AI analysis does not distinguish service failure from a report/authorization error | Any failure maps to one generic retry message, preventing a patient from knowing whether the report is unavailable, unauthorized, malformed, or `
### auth_ownership
- `5: The canonical report API is protected by JWT and returns a report only to its patient (or an administrator): `GET /medical-reports/:id`. `POST /ai/analyze-report` loads the report server-side and verifies the same patient ownership before t`
- `15: | **P1** | AI analysis does not distinguish service failure from a report/authorization error | Any failure maps to one generic retry message, preventing a patient from knowing whether the report is unavailable, unauthorized, malformed, or `
- `20: The existing server ownership checks are **PASS**. The Patient report-viewer workflow is **FIX/BLOCKED** until its canonical route/parameter handling works across every entry point and it meets the required multilingual, disclosure, and sec`
### state_transitions
- `3: ## Confirmed working Backend controls`
- `7: ## Confirmed Patient application defects`
- `11: | **P0** | Report viewer calls a non-existent route | `app/reports/view-report.tsx` requests `GET /reports/:id`; the only protected report Controller is `GET /medical-reports/:id`. The report hub correctly uses `/medical-reports/mine`, so s`
- `13: | **P1** | Medical share action exposes PHI without a purpose-specific confirmation | One icon tap exports title, facility/doctor, summary, diagnosis, and recommendations to the operating-system share sheet. | Present an explicit medical-in`
- `14: | **P1** | Report and AI screens are Arabic-only | Type labels, headings, actions, errors, disclaimer fallback, urgency notice, and content headings are raw Arabic strings. | Move all UI copy and report-type labels to six locale dictionarie`
- `15: | **P1** | AI analysis does not distinguish service failure from a report/authorization error | Any failure maps to one generic retry message, preventing a patient from knowing whether the report is unavailable, unauthorized, malformed, or `
- `16: | **P2** | No explicit treatment of report fields not represented in the viewer | The viewer supports selected textual fields/categories but has no deliberate presentation for report attachments, external diagnostic files, or a no-content-b`
- `20: The existing server ownership checks are **PASS**. The Patient report-viewer workflow is **FIX/BLOCKED** until its canonical route/parameter handling works across every entry point and it meets the required multilingual, disclosure, and sec`
### payment_insurance_relevance
- `13: | **P1** | Medical share action exposes PHI without a purpose-specific confirmation | One icon tap exports title, facility/doctor, summary, diagnosis, and recommendations to the operating-system share sheet. | Present an explicit medical-in`
### error_empty_loading_retry_cancel
- `14: | **P1** | Report and AI screens are Arabic-only | Type labels, headings, actions, errors, disclaimer fallback, urgency notice, and content headings are raw Arabic strings. | Move all UI copy and report-type labels to six locale dictionarie`
- `15: | **P1** | AI analysis does not distinguish service failure from a report/authorization error | Any failure maps to one generic retry message, preventing a patient from knowing whether the report is unavailable, unauthorized, malformed, or `
- `20: The existing server ownership checks are **PASS**. The Patient report-viewer workflow is **FIX/BLOCKED** until its canonical route/parameter handling works across every entry point and it meets the required multilingual, disclosure, and sec`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
