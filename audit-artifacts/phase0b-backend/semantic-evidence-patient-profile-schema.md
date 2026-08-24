# Phase 0B semantic evidence — patient-profile.schema.ts

**Archive member:** `src/schemas/patient-profile.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–81; full 81-line member covered.

Lines 2–5 import Document/uuid and define a timestamped `patient_profiles` collection. Lines 7–8 store generated id and required indexed user_id. Lines 9–16 store optional age, gender enum male/female, blood_type, weight, height and string arrays for allergies, chronic diseases and current medications. Lines 17–18 define typed emergency_contacts subdocuments without subdocument IDs. Lines 19–26 store full_name, phone, email, dob, national_id and arbitrary notification/privacy/security settings. Lines 28–49 define address subdocuments with id, label, street, city, optional lat/lng and default flag. Lines 50–78 define an insurance subdocument containing provider/policy/network/class/expiry/member/national_id/verification/PDF/OCR/NPHIES fields. Lines 80–81 define the document type and create the schema.

**Audit judgment:** Required indexed user_id, some typed nested emergency/address/insurance shapes and gender enum are useful structure. However user_id has no unique constraint or canonical User reference; age/weight/height/blood_type/dob have no runtime type/range/consistency validation, and allergies/conditions/medications are unconstrained strings. Emergency contacts and addresses lack phone/ID uniqueness, count/length/coordinate bounds, geocoding provenance or ownership safeguards. Full name, phone, email, DOB, national_id, policy/member/national IDs and PDF URL are sensitive PII/health/insurance data with no encryption, field-level projection, consent/revocation, retention, access grant or redaction policy. notification/privacy/security settings are arbitrary objects and can become an unsafe client-controlled policy surface. Insurance has no provider/policy format/expiry validation, uniqueness or verified-state transition. No version/CAS, update actor, immutable history or audit linkage is present.

No product code was changed and no tests were executed during this semantic read.
