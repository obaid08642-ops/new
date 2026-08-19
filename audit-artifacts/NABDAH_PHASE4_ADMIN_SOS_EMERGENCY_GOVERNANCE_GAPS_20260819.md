# Phase 4 Admin Dashboard — SOS monitor governance gaps

## Governing decision

SOS, emergency location, QR and consent contracts remain **fail-closed** pending owner legal/product approval. This Admin screen must not be treated as a permitted production emergency-dispatch capability.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Dashboard exposes active SOS monitoring, hospital assignment and resolution despite unapproved governance | It polls `/emergency/active` every ten seconds, shows patient contact/location, assigns hospital ID and resolves incidents. | Disable all production SOS data/mutation functions with an approved unavailable state until the separate emergency, consent, location, dispatch, legal-record and audit contracts are accepted. |
| **P0** | Hospital assignment uses arbitrary free-text identifier | Operator manually enters a hospital ID; UI has no verified facility selector, capacity/acceptance confirmation, branch scope, receiving contact or assignment acknowledgement. | Implement an approved owned dispatch workflow with eligible facility list, availability/capacity, recipient acceptance, immutable assignment history and role/branch enforcement. |
| **P0** | Resolution is an optional-note local action without verified outcome/handover evidence | “Resolve” submits unrestricted notes, then refreshes. No required coded outcome, receiver, clinical/legal attestation, timestamped handover, callback evidence or maker-checker exists in UI. | Require approved structured incident-state machine and legal/clinical evidence before resolution; do not allow final closure without accountable receiver/outcome/audit. |
| **P1** | Full patient phone, address and GPS are displayed/opened in an external map without visible consent/minimum-data controls | Case cards reveal contact, address and precise coordinates and launch Google Maps. | Keep unavailable pending consent policy; then apply least-precision, purpose/role/time-bound access, map-processor disclosure, view audit and safe external-link confirmation. |
| **P1** | “No active cases — safe” and fallback patient/time values can be misleading | Empty queue is described as system safety; missing name/date falls back to generic patient/current time. | Use neutral, source-status-aware language and explicit unavailable/stale/error states; never fabricate patient/time data. |
| **P1** | SOS monitor is Arabic-only and has no high-risk action safeguards | Assignment/resolution controls lack six-language accessibility, warning/checklist or step-up confirmation. | Apply approved multilingual accessible emergency UI only after activation policy, with high-risk step-up and action audit. |

## Decision

Admin SOS monitoring is **P0 BLOCKED/FAIL-CLOSED**. No deployment or E2E activation is authorized until the owner accepts the required emergency governance contracts and their source/runtime gates.
