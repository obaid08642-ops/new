# Provider FacilityUnifiedCalendarScreen: manual semantic review

## reviewed source

`src/screens/facility/FacilityUnifiedCalendarScreen.tsx`, lines 1–58, baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

| ID | evidence | gap | required closure |
|---|---|---|---|
| P-FAC-004 | 15–18 | failed calendar load becomes an empty schedule | distinguish network/authorization/backend failure from truly no events |
| P-FAC-005 | 33–53 | events are list cards with no date range/navigation, timezone, filters, detail/permission, conflict states, resource capacity or action model | build a server-authoritative facility calendar with date-range pagination, timezone policy, resource/provider visibility scopes, booking locks and conflict resolution |
| P-FAC-006 | 37–45 | patient/provider/resource data are all shown without static proof of facility-role data minimization | enforce staff assignment/organization authorization and display only necessary identifiers; audit calendar access |

The display list may be retained as a presentation starting point but cannot be called a unified calendar or evidence that facility scheduling works.
