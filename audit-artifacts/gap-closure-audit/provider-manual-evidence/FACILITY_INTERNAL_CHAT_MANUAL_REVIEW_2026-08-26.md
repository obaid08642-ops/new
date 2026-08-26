# Provider FacilityInternalChatScreen: manual semantic review

Reviewed `src/screens/facility/FacilityInternalChatScreen.tsx`, lines 1–126.

| ID | evidence | gap | required closure |
|---|---|---|---|
| P-FAC-014 | 21–33 and 35–50 | thread/message failures become empty lists with no loading/error/access-denied state | distinguish no data from 401/403/404/network failure and preserve safe retry behavior |
| P-FAC-015 | 52–60 | a message is appended optimistically with a locally generated ID after POST, without server acknowledgement, delivery status, dedupe or conflict handling | use server-assigned message/event IDs and delivery/read/failed states; prevent duplicate sends |
| P-FAC-016 | 22–55 | source has no evidence of facility/department membership, thread participant scope, retention, attachment/PHI policy or audit | reconcile to exact backend authorization and clinical/internal communication governance before treating this as safe |
| P-FAC-017 | 25–30 | unread value is forced to zero irrespective of server state | false unread/notification state; source an authoritative unread count and mark-read lifecycle |
