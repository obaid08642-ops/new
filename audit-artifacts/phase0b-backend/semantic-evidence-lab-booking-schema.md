# Phase 0B semantic evidence — lab-booking.schema.ts

**Archive member:** `src/modules/labs/schemas/lab-booking.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–66; full 66-line member covered.

Lines 6–66 define a timestamped Mongoose `LabBooking` schema. `parent_appointment_id` references Appointment and defaults to null (8–9). `patient_id` and `lab_id` are required indexed User ObjectId references (11–21). Patient name and age are stored directly (14–18). Delivery mode is required and limited to `IN_LAB` or `HOME_COLLECTION`, defaulting to `IN_LAB` (23–24); an optional address object stores latitude/longitude/address/city/district (26). Test code and Arabic/English names are required (28–35). `sample_barcode_token` is nullable and indexed (37–38).

Status is limited to six values and defaults/indexes `PENDING_ACCEPTANCE` (40–46). `entered_metric_results` is an array of objects with parameter name, numeric value, unit, abnormal flag, and NORMAL/HIGH/LOW flag, defaulting to an empty array (48–58). `signed_report_pdf_url` is nullable (60–61). Payment method is limited to cash/card/insurance and defaults to cash; `total_price` defaults to numeric zero (63–64).

**Security/privacy:** schema references and indexes do not implement authorization or ownership. Patient name, age, address coordinates and address text are stored as direct fields; no encryption, minimization, retention, or sensitive-field serialization policy is visible. `signed_report_pdf_url` has no visible access-control, expiry, signature, or storage constraint. Barcode token is indexed but no uniqueness constraint is declared here.

**Truthfulness/data quality:** `patient_name` and `patient_age` are denormalized and optional, creating stale/incorrect identity risk. `address` has no coordinate/range or required-city validation visible. `entered_metric_results` permits free-form array cardinality and lacks schema-level reference-range provenance, critical interpretation, report version, reviewer/signature or timestamp. `total_price` defaults to zero and is writable at model level unless service governance prevents it; no currency is stored. `payment_method` represents a method, not a verified payment/insurance settlement state.

**State transitions:** schema permits any enum value but defines no transition guard; workflow legality must be enforced elsewhere. `timestamps: true` supplies createdAt/updatedAt but no specimen-collected, processed, or report-signed timestamps.

**Price/payment/insurance source:** `payment_method` and `total_price` are the only financial fields; there is no currency, invoice/payment intent, insurance claim status, provider settlement, or ledger reference.

**Test implications:** require schema/service tests for unique barcode, immutable patient/lab ownership, server-authoritative price, currency, payment/claim verification, state CAS, report access controls, PII serialization/retention, address validation, result provenance, reviewer signature, and timestamp semantics. No tests executed during this semantic read.
