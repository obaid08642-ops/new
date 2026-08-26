# Provider FleetScreen: manual semantic review

Reviewed `src/screens/shared/FleetScreen.tsx`, lines 1–201.

| ID | evidence | gap | closure requirement |
|---|---|---|---|
| P-AMB-008 | 46–53 and 132–137 | vehicle availability toggles locally after patch without checking approval, crew assignment, maintenance/dispatch state or active mission conflict | server must enforce valid state transitions, approved assets/crew, active mission constraints, idempotency and audit |
| P-AMB-009 | 55–75 | deletion calls a permanent removal path with only device confirmation | define archival/decommission rather than unsafe delete; block deletion for active/history-linked vehicles and retain regulatory audit |
| P-AMB-010 | 155–180 | form accepts mostly free-text vehicle/crew/equipment facts and announces pending approval | require legal plate/registration/inspection/insurance/crew credential evidence, admin review state/reason/expiry and verified base/coverage data |
| P-AMB-011 | 79–86 | UI states that admin approval controls service, but static source cannot prove dispatch eligibility enforcement | reconcile central fleet state with emergency claim dispatch policy; fail closed for pending/rejected/suspended assets |
