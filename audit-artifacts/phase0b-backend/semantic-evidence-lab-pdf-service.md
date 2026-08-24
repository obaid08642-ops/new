# Phase 0B semantic evidence — lab-pdf.service.ts

**Archive member:** `src/modules/labs/lab-pdf.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–66; full 66-line member covered.

Lines 3–6 directly require `pdfkit`. Lines 8–14 define `LabPdfService.generateReport(booking, structuredData)` returning a PDF data-URI string. Lines 15–24 create a PDF stream, collect chunks, resolve on `end`, and reject on stream/try errors. Lines 25–32 render an English header, patient name with fallback `Unknown Patient`, booking ID, and current server date. Lines 34–53 render a simple four-column analyte/result/unit/reference table, color critical results red, and paginate when the vertical position exceeds 750. Lines 56–60 append an English electronic-generation footer and end the document.

**Security/privacy:** patient identity is interpolated into a generated artifact from the caller-provided `booking` object; no authorization, provenance, redaction, consent, signed URL, access expiry, or audit trail is visible. Returning an entire base64 data URI may increase memory and response exposure. No validation or bounds are shown for `structuredData`; arbitrary analyte/value/unit/range strings are rendered.

**Truthfulness/data quality:** missing patient name becomes the literal `Unknown Patient`, which is a placeholder/fallback and must not be mistaken for verified data. The report date is generated from current process time rather than a booking/specimen/report timestamp. The English platform name/footer are hard-coded and no lab branding, locale, clinician sign-off, reference-range provenance, or report status is included. Criticality is trusted from `entry.isCritical` without visible lab/clinician validation.

**Clinical/operational integrity:** no lab result schema validation, units/reference-range consistency, decimal/locale handling, abnormal flags, specimen metadata, report versioning, signature, checksum, or durable storage is visible. The comment says errors reject the Promise rather than throwing into the event loop; this is implementation behavior, not evidence of operational monitoring.

**Price/payment/insurance source:** none visible.

**Test implications:** require tests for authorization and patient isolation, sensitive-data redaction, malformed/oversized values, XSS/control characters, PDF validity and pagination, timestamps/time zones, locale/RTL, verified reference ranges/critical flags, clinician signature, storage/access controls, memory limits, and auditability. No tests executed during this semantic read.
