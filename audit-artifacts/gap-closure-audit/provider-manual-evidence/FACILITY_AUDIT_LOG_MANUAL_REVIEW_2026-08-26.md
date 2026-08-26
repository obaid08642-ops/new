# Provider FacilityAuditLogScreen: manual semantic review

## reviewed source

`src/screens/facility/FacilityAuditLogScreen.tsx`, lines 1–59, baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

| ID | evidence | gap | closure requirement |
|---|---|---|---|
| P-FAC-001 | 15–18 | audit retrieval errors are silently converted to an empty log; there is no loading/error/empty distinction | show controlled failure state and never represent unavailable audit evidence as no activity |
| P-FAC-002 | 33–53 | renders mutable-looking fields only, with no event ID, actor role, timestamp standard, source IP/device, old/new values, correlation ID or integrity proof | expose a permissioned, paginated audit view sourced from immutable backend audit events; preserve minimization and no PHI leakage |
| P-FAC-003 | whole file | no date/action/actor/target filtering, export policy, access logging or role checks are present | define facility admin role, audit access audit, retention/export/redaction policy and exact authorization contract |

The client endpoint is an anchor only; it does not prove audit completeness or tamper resistance.
