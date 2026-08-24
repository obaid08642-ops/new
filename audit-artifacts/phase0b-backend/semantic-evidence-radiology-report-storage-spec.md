# Phase 0B semantic evidence — radiology.service.report-storage.spec.ts

**Archive member:** `src/modules/radiology/radiology.service.report-storage.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–32; full 32-line member covered.

Lines 4–15 construct a `RadiologyOpsService` with mocked legacy/center booking models, storage model and event dependency. Lines 17–22 verify `uploadReport` rejects a raw external `pdf_url` before changing booking state. Lines 24–31 verify a private provider-owned storage object with PDF MIME is accepted, attaches `report_storage_object_id`, leaves the public URL field undefined, and changes state from `IN_SCANNING` to `REPORT_DRAFT`.

**Security/ownership:** positive unit-level evidence exists for rejecting raw report URLs and requiring a private provider-owned PDF storage record. The test does not verify booking ownership binding (the booking fixture is resolved by ID only), patient access, signed URL delivery, storage object immutability, MIME/content sniffing, malware scanning, expiry, audit logging, or HTTP 401/404 behavior.

**State transitions:** `IN_SCANNING` -> `REPORT_DRAFT` only after accepted private storage object; rejected raw URL leaves state unchanged.

**Truthfulness/data source:** the test uses fixture URL `https://untrusted.example/report.pdf` and a mocked storage object; it does not establish production storage configuration or actual report provenance. Findings text is accepted as a string fixture without clinical validation in this spec.

**Price/payment/insurance source:** none visible.

**Test implications:** add integration tests for provider/booking ownership, patient confidentiality, private-object access, signed/expiring URLs, MIME/content validation, malware scanning, idempotency, replay/concurrency, audit events and controller guards. No tests executed during this semantic read.
