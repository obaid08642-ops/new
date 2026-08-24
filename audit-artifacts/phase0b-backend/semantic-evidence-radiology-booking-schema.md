# Phase 0B semantic evidence — radiology-booking.schema.ts

**Archive member:** `src/modules/radiology/schemas/radiology-booking.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–67; full 67-line member covered.

Lines 6–66 define a timestamped `RadiologyBooking` Mongoose schema. A public UUID `id` is unique/indexed and intended for app/provider references while Mongo `_id` remains internal (8–10). The booking optionally references a parent appointment (12–13), requires a patient User ObjectId (15–16), and optionally binds a radiology center User ObjectId (18–20). Delivery mode is required and limited to `IN_CENTER` or `MOBILE_HOME_VISIT` (22–23). A referring doctor ID, required scan code and Arabic/English scan names are stored (25–33). Machine allocation is nullable (35–36).

The `status` field is indexed, defaults to `PENDING_ACCEPTANCE`, and accepts both center vocabulary and full operations vocabulary: pending/accepted/check-in/scanning/report/cancel plus new request, insurance, copay, confirmed, arrived, in scanning, draft, review, ready and aborted (38–50). Clinical impression, scanned S3 URL array, signed report PDF URL, report storage object ID and scan storage object IDs are stored (52–65).

**Security/privacy:** patient and center references/indexes do not enforce authorization. Public UUID uniqueness helps reference stability but does not provide ownership. `signed_report_pdf_url` and `scanned_files_s3_urls` can expose clinical artifacts if consumers return them directly; no private/signed/expiry policy is present in the schema. Doctor and machine IDs have no referential/authorization constraint.

**State integrity:** a single field accepts two state vocabularies from distinct booking systems, with no schema-level transition guard, version, CAS marker, timestamps per stage, or cancellation/refund reason. This broad enum enables cross-flow states unless service-level maps remain consistent.

**Truthfulness/data quality:** scanned files are represented as S3 URL strings despite service-level secure storage-object behavior; this creates legacy/public-URL drift risk. Report URL and storage object ID coexist, allowing ambiguous source-of-truth unless consumers enforce one. Scan names/codes are required but not normalized or tied to a catalog record. No modality/body part, provider/lab license, report author/signature, report version, result timestamp, currency, price, payment intent, insurance approval, copay, or ledger fields are present.

**Price/payment/insurance source:** none in this schema.

**Test implications:** require tests for public UUID vs internal ID isolation, patient/center ownership, private artifact access, no URL leakage, state transition/CAS/versioning, cross-collection vocabulary mapping, report source exclusivity, catalog identity, stage timestamps, and payment/insurance linkage at consumer level. No tests executed during this semantic read.
