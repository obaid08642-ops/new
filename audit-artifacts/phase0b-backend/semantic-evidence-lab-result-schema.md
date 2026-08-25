# Phase 0B semantic evidence — LabResult schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/lab-result.schema.ts:1–49`

The schema defines LabResultType STRUCTURED, PDF, IMAGE and RADIOLOGY (`6–11`). LabResult has unique ID/tracking, indexed booking_id/patient_id, denormalized patient/service labels, required Arabic service name, optional English/service ID, required type enum, source enum labs/radiology, any-typed structured entries, any-typed attachments, radiology findings/impression/recommendations, report metadata, critical/viewed flags, viewed timestamp and notes (`13–48`). A patient-createdAt index is declared (`46–47`).

The type/source combinations are not cross-validated: a non-radiology source can carry radiology fields and a radiology source can use incompatible result type; `entries` is `[any]` despite a comment-defined shape and lacks value/unit/reference/flag typing, ranges, analyte identity, specimen and method (`23–36`). `critical` is independent from entry flags/findings and has no critical review, acknowledgement, notification or escalation state (`27–44`).

Attachments are raw any/base64 values with no MIME, size, content, malware, OCR/source, object-storage, ACL/signed access or retention metadata (`30–31`). Reported_by and service/booking/patient IDs are plain fields without booking ownership, patient matching, provider authorization, tenant/facility, lab/radiology source or result provenance (`17–22,38–40`). Denormalized names can drift from authoritative records (`19–22,40`).

reported_at/viewed_by_patient/patient_viewed_at have no state invariants: viewed timestamp can exist while flag is false or vice versa, and no actor/device/source is recorded for viewing or reporting (`38–43`). No result correction/version, sign-off, amended report, specimen collection/received/released timestamps, reference-range population context or abnormal-value lifecycle exists (`27–44`).

Lab results are sensitive health data, but no consent/delegation, projection, encryption, access audit, retention, deletion/DSAR or legal-hold controls are declared (`17–44`). No idempotency/duplicate result prevention, immutable report audit, CAS/version, atomic attachment/report publication or notification delivery/retry state is represented. No live result retrieval, critical alert, attachment or index runtime evidence is established by this source read. No code was changed and no build/test/application operation was performed during this read.
