# Provider FacilityLeaveRequestsScreen: manual semantic review

Reviewed `src/screens/facility/FacilityLeaveRequestsScreen.tsx`, lines 1–105.

| ID | evidence | gap | closure requirement |
|---|---|---|---|
| P-FAC-022 | 30–39 and 96–100 | load error leaves the prior/default empty list and UI states no leave requests | error must be distinguished from no requests and must support retry/authorization diagnostics safely |
| P-FAC-023 | 42–49 | approve/reject updates local status directly after a generic action mutation, with no version/race/expected-state handling | backend must enforce facility manager scope, pending-only state, conflict/replay response and audit reason/actor/time; UI must refresh authoritative state |
| P-FAC-024 | 57–94 | no workforce/resource/booking impact or alternative coverage is displayed before approval | decision workflow must expose or validate schedule/resource/appointment conflicts and required patient/provider notifications |
| P-FAC-025 | 1–19 | unused `ProviderApi` import and broad `Alert` import indicate duplicated/unresolved implementation pathways | remove dead path and use one typed provider API layer under contract tests |
