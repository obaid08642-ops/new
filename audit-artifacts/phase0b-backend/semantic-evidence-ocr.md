# Phase 0B semantic evidence — OCR

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/ocr/ocr.service.ts:2–35`

`ocr.service.ts:9–16` constructs a Google Vision client from environment credentials and only logs a warning if initialization fails; calls later fail with `VISION_API_NOT_CONFIGURED`. `:18–33` accepts any `imageUrl`, logs the full URL, passes it directly to `documentTextDetection`, returns raw `fullTextAnnotation.text`, and logs the provider error object before throwing a generic extraction error. No URL allowlist, signed-asset ownership check, scheme restriction, MIME/size/image validation, malware scanning, redaction, retention, consent, correlation/audit policy or language/content safety is visible. The service has no user/actor argument, so access control must be enforced by any caller, but no caller boundary is represented in this member.

## Findings candidates

The read supports: remote URL SSRF/provider-fetch risk, sensitive URL/error logging, raw PHI return without minimization, missing caller ownership/context, unbounded image/document processing and incomplete lifecycle/retention/consent controls.

No product code was changed and no tests/builds were executed during this semantic read.
