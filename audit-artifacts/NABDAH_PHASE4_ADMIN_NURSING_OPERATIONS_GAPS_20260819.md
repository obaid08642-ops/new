# Phase 4 Admin Dashboard — nursing operations gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Admin assigns a nurse by free-text licence/phone through a direct mutation | No owned eligible-nurse selector, credential/availability/service-area/capacity check, assignment confirmation, reallocation policy, patient notification or audit/reason is shown. | Use a server-issued eligible provider list and an approved assignment/reassignment state machine with credentials, capacity, location consent, acceptance, reason, audit and patient-visible status. |
| **P1** | Nursing request card fabricates patient, service and address values | Missing values render “patient,” generic home nursing and Riyadh address, obscuring source/data-quality failure. | Render only minimum-necessary verified visit data and explicit unavailable/malformed states; do not fabricate PHI/location. |
| **P1** | Request-load failure becomes an empty pending queue | Catch clears requests and UI reports no pending nursing requests. | Show source error/stale/retry state and last verified timestamp; avoid operational false-negative queue status. |
| **P1** | Direct assignment control has no high-risk confirmation or localization/privacy safeguards | Prompt/alert UI lacks six-language accessibility, role/branch scope, PHI warning, dispatch policy or step-up confirmation. | Add reviewed multilingual accessible assignment interface after server scope/governance controls exist. |

## Decision

Admin nursing operations are **P0 FIX/BLOCKED**. Direct assignment cannot be used safely until provider eligibility, consented location, audited reassignment and truthful queue data are implemented.
