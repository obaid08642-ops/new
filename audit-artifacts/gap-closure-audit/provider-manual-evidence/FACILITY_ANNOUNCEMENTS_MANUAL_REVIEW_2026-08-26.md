# Provider FacilityAnnouncementsScreen: manual semantic review

## reviewed source

`src/screens/facility/FacilityAnnouncementsScreen.tsx`, lines 1–98, baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

| ID | evidence | gap | closure requirement |
|---|---|---|---|
| P-FAC-011 | 19–24 | loading failure becomes an empty announcements list | distinguish authorization/network failure from no announcements |
| P-FAC-012 | 28–39 | any visible user can post generic text to a facility-wide broadcast endpoint; static source shows no audience selection, privilege/capability, moderation, expiry, draft or audit state | backend must enforce authorized organization roles and scoped recipients; add lifecycle, immutable author/time, delete/correction policy and delivery/read receipts as appropriate |
| P-FAC-013 | 52–68 | unrestricted free text is posted without visible length/content/PHI safeguards | validate/sanitize server-side, apply approved templates/priority classes where required and prevent misuse for clinical alerts |

The list/publish calls are contract anchors; they do not establish facility broadcast authorization or notification delivery.
