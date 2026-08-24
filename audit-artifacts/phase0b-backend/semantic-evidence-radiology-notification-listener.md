# Phase 0B semantic evidence — radiology-notification.listener.ts

**Archive member:** `src/modules/radiology/listeners/radiology-notification.listener.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–52; full 52-line member covered.

Lines 2–12 define an injectable listener with a `ProviderNotification` Mongoose model. Lines 14–22 subscribe to `radiology.doctor_notify` and type a payload containing doctor ID, patient ID/name, report ID, and optional PDF/DICOM viewer URLs. Lines 23–46 log receipt, create an in-app provider notification addressed to `doctorId`, include Arabic/English text, an action URL `/provider/radiology/{reportId}`, patient/report metadata and the optional artifact URLs, mark it unread, and log success. Lines 48–50 catch any error and log it without rethrowing.

**Security/privacy:** notification metadata stores `pdf_url` and `dicom_viewer_url` without visible private/signed/expiry enforcement. Patient name and ID are included in notification body/metadata. The action URL and report identifiers require downstream authorization; this listener does not enforce it. No tenant/provider relationship verification, deduplication, rate limit, or audit trail is visible.

**Truthfulness/integration:** the listener subscribes to `radiology.doctor_notify`, but the service evidence showed an emitted payload with doctorId/patientId/pdfUrl/dicomUrl and no visible patientName/reportId fields in that emission path. This creates a payload contract mismatch risk: notification text may contain `undefined`, action URL may be malformed, or the listener may fail depending on runtime data. The listener logs “Successfully dispatched” after database create only; it does not prove delivery to the doctor UI or push channel.

**Reliability:** any notification-model error is swallowed after logging. There is no retry, outbox, dead-letter, idempotency key, or alerting. Duplicate events can create duplicate notifications; no unique event ID is persisted.

**State/transitions:** report-ready event → in-app notification create; failure → error log only.

**Price/payment/insurance source:** none visible.

**Test implications:** require payload contract tests against all emitters, artifact access tests, patient/doctor tenant authorization, notification dedupe/idempotency, retry/outbox/alerting, sensitive-field redaction, malformed payload handling, and delivery verification. No tests executed during this semantic read.
