# Phase 0B semantic evidence — Provider operations and provider compatibility

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/provider-ops/provider-ops.module.ts:2–640`

`ProviderOpsService` covers doctor leave/templates/diagnoses/blacklists/CRM, lab QC, nursing checklists/signature/GPS/escalation, ambulance ETA/handover/completion, invoice PDF, availability/settings/consultation completion and wallet ledger (`provider-ops.module.ts:19–38,40–519`). Many operations use raw Mongo collections and user IDs passed from controllers. Doctor leave creation accepts dates/type/note with basic range check, but creation IDs use timestamp/random and cancellation returns success even when no record matched (`40–81`). Templates/diagnoses accept raw item/body objects; diagnosis search interpolates raw regex; blacklist and CRM are scoped by doctor ID but notes/tags are caller supplied and no visible clinical authorization or idempotency exists (`83–171`).

Lab QC validates action name but finds a booking by ID without visible provider/role/ownership scope, updates state/priority/verification and emits critical notifications. The update and subsequent earnings credit are not one transaction, and the service derives fee from booking fields; notification failures are swallowed (`173–235`). Nursing checklist/signature/tracking/escalation update home-care records by booking ID without visible ownership/state/geofence/range validation or idempotency; signing sets completed then separately credits earnings and stores large base64 signature data (`237–290`). Ambulance ETA uses caller coordinates and fixed 40 km/h; handover/completion update emergency records by ID without visible driver assignment/state guards; completion credits earnings separately and can use body amount fallback (`292–327`).

Invoice PDF checks patient/admin/pharmacy identity but returns a document containing patient ID and financial data, dynamically instantiates LegalEnterpriseService and uses simple text rather than visible invoice/ZATCA source-of-truth validation (`329–347`). Availability toggles via upsert based on authenticated identity/provider hints, while settings write arbitrary values. Stats aggregates multiple possibly legacy collections/field names and swallows missing-collection errors; reviews return broad rows and reply is provider-scoped but raw text (`349–445`). Consultation end accepts raw notes/diagnosis/prescription, updates appointment, creates note/prescription and credits earning in separate operations; amount can fall back to body amount (`446–504`). Wallet ledger returns up to 200/500 entries and derives balance from limited rows rather than a canonical ledger balance (`506–518`).

Controllers are JWT guarded but do not visibly enforce provider role/type per route; most mutations lack idempotency. Compatibility routes expose provider wallet, stats, reviews, settings and consultation completion with raw bodies (`521–640`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: provider-scope/ownership gaps, raw clinical/CRM inputs, non-atomic clinical and financial side effects, GPS/signature validation gaps, arbitrary settings, invoice PII, legacy collection drift, bounded-window wallet truth and missing idempotency.
