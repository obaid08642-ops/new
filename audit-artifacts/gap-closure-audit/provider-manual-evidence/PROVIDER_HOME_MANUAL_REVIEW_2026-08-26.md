# ProviderHome: manual semantic review

## reviewed source

`src/screens/shared/ProviderHome.tsx`, lines 1–88, baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

| ID | evidence | finding | closure |
|---|---|---|---|
| P-HOME-001 | 17–23 | a provider type has only two coarse branches: pharmacist receives pending orders; every other role receives waiting-room calls | missing role-specific operational routing. Lab/radiology/nursing/facility/ambulance roles cannot be assumed to have a valid home/queue/authorization model |
| P-HOME-002 | 24–27 | errors are swallowed and shown as an empty list | false-empty operational state; provider cannot distinguish no work from authorization/network/backend failure |
| P-HOME-003 | 33–39 | actions handle only `call` and `chat`; any other fetched work item has no explicit state/action | incomplete queue state machine and unsupported work types; needs typed action map and unavailable/error disposition |
| P-HOME-004 | 34–38 combined with LiveKit review | call/chat navigation trusts item route fields client-side; no static proof of booking/order membership or preflight authorization | backend authorization, typed IDs and negative tests required before call/chat access can be treated as safe |
| P-HOME-005 | 62 | presentation uses literal emoji for health workflow categories, conflicting with the required premium vector UI system | replace with the approved icon library and accessible labels; this is a design-system issue, not only cosmetic |

The API paths are evidence anchors only and do not prove endpoint existence or authorization. `ProviderHome` must be superseded or role-gated by a shared provider shell that resolves role, organization, credential state, queue counts, access denials, and safe deep links.
