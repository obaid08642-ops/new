# Provider FacilityResourcesScreen: manual semantic review

Reviewed `src/screens/facility/FacilityResourcesScreen.tsx`, lines 1–150.

| ID | evidence | gap | closure requirement |
|---|---|---|---|
| P-FAC-030 | 31–35 | error becomes empty resource list | distinguish failure from no resources and expose safe retry/access state |
| P-FAC-031 | 40–65 | provider UI creates resources and toggles active/maintenance without capacity, effective interval, reason, maintenance approval, booking impact or expected version | backend must enforce facility roles, resource taxonomy/capacity, scheduling conflict control, state/maintenance policy and immutable audit |
| P-FAC-032 | 56–65, 137–143 | active/maintenance status has no lock/rebooking/cancellation path for existing appointments or operations | link resource lifecycle to booking locks, staff/patient notifications and safe change policy |
| P-FAC-033 | 8–13 and 103–108 | resource types are hardcoded coarse UI literals | use shared server-managed capability/resource model rather than arbitrary client types |
