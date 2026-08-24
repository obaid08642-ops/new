# Phase 0B semantic evidence — medical-profile.schema.ts

**Archive member:** `src/schemas/medical-profile.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–56; full 56-line member covered.

Lines 2–3 import Document/uuid. Lines 5–8 define a BloodType enum with common blood groups plus unknown. Lines 10–13 document that the profile is visible to authorized doctors, pharmacists and labs during consultations, prescribing/refill and lab requests. Lines 14–17 define a timestamped MedicalProfile with generated unique id and required unique indexed patient_id.

Lines 19–29 store optional blood_type, height_cm, weight_kg, birth_date, gender default unspecified, pregnancy flags/weeks, smoking and alcohol flags. Lines 31–44 store chronic_diseases, allergies, surgeries, long_term_medications and family_history as default-empty untyped arrays, with comments describing intended nested structures. Lines 46–50 store optional emergency_contact object and free-form notes. Lines 52–54 store last_updated_at and last_updated_by_id. Line 56 creates the schema.

**Audit judgment:** Unique patient binding and explicit health-domain fields are useful. The documented provider visibility is sensitive and cannot be enforced by this schema. `blood_type` is not visibly wired to the BloodType runtime enum; gender/pregnancy/weeks and all numeric physiology fields lack type/range/cross-field validation. Medical arrays are `any[]` with no nested schemas, bounds, normalization, consent provenance, source/provider, effective dates or deletion history. Emergency contact and notes are unbounded PII/medical text. There is no field-level visibility/access grant, tenant/family-member boundary, encryption/redaction, optimistic version/CAS, append-only history, consent/revocation or retention policy. last_updated_by_id is an informational field only and does not prove authorized modification or audit integrity.

No product code was changed and no tests were executed during this semantic read.
