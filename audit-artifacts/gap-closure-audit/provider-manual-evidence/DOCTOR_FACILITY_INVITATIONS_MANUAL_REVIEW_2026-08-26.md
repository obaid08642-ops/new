# Provider FacilityInvitationsScreen: manual semantic review

Reviewed `src/screens/doctor/FacilityInvitationsScreen.tsx`, lines 1–133.

| ID | evidence | gap | closure requirement |
|---|---|---|---|
| P-DOC-017 | 33–48 | inbox failure becomes a no-pending-invitations result | provide error/retry/authorization states and do not hide invitation delivery failures |
| P-DOC-018 | 53–73 | accept/reject updates local status and declares the doctor linked to facility immediately after a generic respond call | backend must enforce target identity, pending/expiry state, invitation signature, credential validity, organization conflict and atomic role/permission creation; refresh signed user context |
| P-DOC-019 | 9–21, 113–118 | permissions are rendered from client label map and may include unknown strings | source role/capability descriptions and effective permissions from backend; show expiry and minimum-necessary implications before acceptance |
| P-DOC-020 | 61 | acceptance claim omits facility verification, required onboarding, schedule/credential restrictions and a leave option | add activation conditions, acceptance audit and unlink/transfer policy |
