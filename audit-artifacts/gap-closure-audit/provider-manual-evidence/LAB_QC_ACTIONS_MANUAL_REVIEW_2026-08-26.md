# Provider LabQcActions: manual semantic review

## scope

تمت قراءة `src/screens/lab/LabQcActions.tsx` كاملًا، 1–158، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

| ID | evidence | gap / defect | closure requirement |
|---|---|---|---|
| P-LAB-001 | lines 24–35 | all QC actions are a generic client-post route with no visible version/idempotency/state transition/result checks | reconcile every action to distinct backend state rules, sample/technician/lab ownership, expected-state conflict handling, immutable audit and replay prevention |
| P-LAB-002 | lines 77–85 | `double_verify` checks only that a `verified_by` value exists; it cannot establish that the second verifier is distinct, qualified or independent | server must enforce two distinct authorized actors with timestamps and no self-double-verification |
| P-LAB-003 | lines 104–127 | critical value accepts free-text note and states patient/referring doctor will be notified, without analyte/result/callback/read-receipt/escalation data | use structured result reference and critical thresholds; server-driven notification/escalation/read acknowledgement/audit required before this claim is shown |
| P-LAB-004 | lines 129–149 | rejection may submit a blank reason substituted locally as `unsuitable_sample` | controlled reason code, evidence/chain-of-custody, recollection order/payment policy and patient notification are required |
| P-LAB-005 | lines 37–40 | priority/verification status is trusted from passed `booking` props rather than confirmed state after each action | refresh server authoritative sample/booking state, handle concurrent updates and avoid stale button enablement |

The UI is a partial QC control surface, not a proof that lab quality workflows are complete or safe.
