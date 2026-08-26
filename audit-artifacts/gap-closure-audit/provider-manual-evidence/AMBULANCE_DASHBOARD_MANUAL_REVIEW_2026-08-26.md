# Provider AmbulanceDashboard: manual semantic review

## scope

تمت قراءة `src/screens/ambulance/AmbulanceDashboard.tsx` كاملًا، 1–461، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

## confirmed defects

| ID | evidence | defect | required correction |
|---|---|---|---|
| P-AMB-001 | lines 361–375 | missions history calls wallet ledger, ignores its response, then explicitly `setRows([])` | confirmed false-empty history; query a scoped missions history source or remove this route |
| P-AMB-002 | lines 397–407 | mission loader falls back to `{id}` if loading fails, then opens an active mission screen without verified assignment/details | error/authorization/not-found is converted to a potentially actionable mission shell; show typed 401/403/404/network state and never allow operational actions on fallback data |
| P-AMB-003 | lines 260–289 | handover records only free-text hospital and notes despite calling it a legal record | require authorized receiving facility/clinician, timestamp/location, patient/crew/vehicle identifiers, recipient acceptance/signature, immutable audit and controlled corrections |
| P-AMB-004 | lines 308–355 | completion accepts a small free-text report and optional unvalidated vitals; outcome values are UI literals | state transition must enforce mission phase, clinical minimum data, units/ranges, refusal/consent policy, attachment/audit and payment/claim effects as applicable |

## contract and operational gaps

| ID | evidence | required proof |
|---|---|---|
| P-AMB-005 | 40–75 and 120–141 | mission pool/claim must be server-scoped to online eligible ambulance/crew, geo/dispatch priority and one-winner concurrency; prove race/timeout/decline/escalation behavior |
| P-AMB-006 | 169–198 | location tracking uses permission/current location but silently drops failures and lacks explicit background/consent/retention/offline policy | define operational GPS policy, patient visibility, dispatch monitoring, least retention and reliable event delivery |
| P-AMB-007 | 229–244 | active mission allows navigation to handover/complete without visible client state guard | server must be source of truth for allowed transitions; client needs explicit expected-state/409 handling |

No comment asserting live APIs is used as evidence. Ambulance must be treated as high-risk provider workflow requiring specialized safety/compliance review before production.
