# Provider FacilityInvitationScreen: manual semantic review

Reviewed `src/screens/facility/FacilityInvitationScreen.tsx`, lines 1–147.

| ID | evidence | gap / defect | closure requirement |
|---|---|---|---|
| P-FAC-026 | 20–31 | sensitive permissions default to true, including pricing, schedule, insurance, availability, catalog and clinical delivery types | least-privilege defaults and server-issued role templates required; facility client must never be authority for a permission grant |
| P-FAC-027 | 46–67 | client submits arbitrary `role`/`permissions` object to invitation route | backend must validate inviter authority, provider credentials/type, allowed role-permission combinations, organization capacity and invitation lifecycle; audit every grant/change |
| P-FAC-028 | 70–89 | success screen states notification was sent and implies acceptance lifecycle based only on a successful submit call | show server-returned invitation ID/status/channel/expiry; distinguish created from delivered/accepted and support revoke/resend/expire |
| P-FAC-029 | 98–100 | identifier lookup behavior exposes a specific `404 no provider account` outcome | prevent account enumeration through consistent responses/rate limits and safe invitation flow |
