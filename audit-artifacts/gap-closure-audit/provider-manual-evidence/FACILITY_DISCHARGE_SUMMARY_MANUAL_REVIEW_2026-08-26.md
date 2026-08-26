# Provider DischargeSummaryScreen: manual semantic review

Reviewed `src/screens/facility/DischargeSummaryScreen.tsx`, lines 1–171.

| ID | evidence | gap | closure requirement |
|---|---|---|---|
| P-FAC-034 | 23–31 and 73–78 | admission query failure becomes no admitted patients | distinguish error/authorization from zero admissions; do not mask clinical workflow outage |
| P-FAC-035 | 34–57 | free-text diagnosis/medications/instructions are submitted and UI states patient discharged, with no visible clinician authority, admission expected state, medication reconciliation, signature, review or result | server must enforce assigned qualified clinician, active admission state, controlled clinical record structure/versioning, medication safety checks, required sign-off, audit and discharge transition |
| P-FAC-036 | 80–109 | any selected admission passed from UI is displayed; no encounter/facility/care-team authorization evidence | enforce encounter-level access and minimum disclosure; no fallback patient identity on an unavailable record |
| P-FAC-037 | 128–158 | medications are unstructured free text | build/formulary linkage, dosage/frequency/duration, contraindication/allergy checks, patient-readable instructions and pharmacy/prescription contract are required |
