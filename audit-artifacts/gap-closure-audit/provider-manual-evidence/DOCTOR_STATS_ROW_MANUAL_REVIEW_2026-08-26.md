# Provider DoctorStatsRow: manual semantic review

Reviewed `src/screens/doctor/components/DoctorStatsRow.tsx`, lines 1–61.

This is a presentation component; it does not itself perform a request or state mutation. It remains a **data-source dependency**, not closure evidence.

| ID | evidence | required closure |
|---|---|---|
| P-DOC-012 | 7–43 | parent must supply server-authoritative today appointment, pending-request and revenue values with date/timezone/currency/status definitions; a zero fallback must not mask failed loading |
| P-DOC-013 | 37–43 | revenue card must be sourced from settled/recognized ledger policy, not gross bookings, pending payments or arbitrary provider totals; contract and permissions required |
