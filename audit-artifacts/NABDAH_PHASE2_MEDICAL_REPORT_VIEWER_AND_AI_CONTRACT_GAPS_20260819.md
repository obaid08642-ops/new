# Phase 2 Patient — medical report viewer and AI-analysis contract gaps

## Confirmed working Backend controls

The canonical report API is protected by JWT and returns a report only to its patient (or an administrator): `GET /medical-reports/:id`. `POST /ai/analyze-report` loads the report server-side and verifies the same patient ownership before transmitting report text to the AI gateway. This is the correct fail-closed ownership model.

## Confirmed Patient application defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Report viewer calls a non-existent route | `app/reports/view-report.tsx` requests `GET /reports/:id`; the only protected report Controller is `GET /medical-reports/:id`. The report hub correctly uses `/medical-reports/mine`, so selecting a real report then opening it will fail. | Replace the fetch with the canonical API path; add contract test for report hub → viewer success and unrelated-patient rejection. |
| **P0** | Deep links and diagnostic history use a parameter the viewer ignores | Notifications and diagnostic results route with `reportId`; viewer and AI screen only read `params.id`. Those entry paths show “unable to load report” or “report not specified.” | Normalize on a single route parameter and accept validated legacy `reportId` only during migration; test hub, notification, laboratory, radiology, and health-report entry paths. |
| **P1** | Medical share action exposes PHI without a purpose-specific confirmation | One icon tap exports title, facility/doctor, summary, diagnosis, and recommendations to the operating-system share sheet. | Present an explicit medical-information sharing confirmation that identifies the fields and offers a minimal export; retain no public/shareable report URL unless a separately approved consent contract is implemented. |
| **P1** | Report and AI screens are Arabic-only | Type labels, headings, actions, errors, disclaimer fallback, urgency notice, and content headings are raw Arabic strings. | Move all UI copy and report-type labels to six locale dictionaries; use selected-locale formatting and test RTL/LTR paths. |
| **P1** | AI analysis does not distinguish service failure from a report/authorization error | Any failure maps to one generic retry message, preventing a patient from knowing whether the report is unavailable, unauthorized, malformed, or the AI service is temporarily unavailable. | Map safely sanitized Backend error categories to clear retry/back actions; never expose medical-report contents or raw Backend error details. |
| **P2** | No explicit treatment of report fields not represented in the viewer | The viewer supports selected textual fields/categories but has no deliberate presentation for report attachments, external diagnostic files, or a no-content-but-attachment report. | Define a secure authenticated attachment-view/download contract and a truthful “available as attachment” state before exposing the action. |

## Safety and privacy decision

The existing server ownership checks are **PASS**. The Patient report-viewer workflow is **FIX/BLOCKED** until its canonical route/parameter handling works across every entry point and it meets the required multilingual, disclosure, and secure-attachment requirements. AI analysis remains advisory only; its Arabic disclaimer is present but must be localized and shown with accurate error handling.
