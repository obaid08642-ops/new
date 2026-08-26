# Patient Mobile: Video room, reviews, public links and service directory — final manual review

## Scope boundary

This read-only source review covers the final four Mobile inventory routes. It does not validate live video-media security, call-token issuance/expiry, booking ownership, review moderation/anonymity, SEO resolver authorization, deep-link integrity, service availability, pricing or backend runtime behavior.

| Reviewed source | Scope |
|---|---|
| `app/room/[id].tsx` | LiveKit video room entry and client media controls |
| `app/reviews/index.tsx` | Booking review submission |
| `app/s/[type]/[slug].tsx` | Public SEO/deep-link resolver |
| `app/services/index.tsx` | Static all-services directory |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-ROOM-001 | `STATIC_MATCHED_PARTIAL` | `room/[id].tsx:5–26, 45–47, 145–209` | Room protects Expo Go from a native-module crash and requires a Redux user before requesting `/calls/{id}/join`. Static source cannot prove appointment ownership, call entitlement, one-time/expiry semantics, role-specific token grants, LiveKit room isolation or media-session audit. | Server call-token/room authorization chain with owner/stranger/replay/expired-token tests; media/privacy/audit policy and native runtime verification. |
| PM-ROOM-002 | `CONFIRMED_DEFECT` | `room/[id].tsx:65–75, 171–208` | End-call only navigates back; mic/camera state is local optimistic state. There is no explicit server leave/end event, session duration/outcome/reconciliation or UI recovery for a failed toggle/disconnect. | Call lifecycle/ledger/events and disconnection/retry state model; verified native device tests. |
| PM-REV-001 | `STATIC_MATCHED_PARTIAL` | `reviews/index.tsx:49–82, 84–93, 171–229` | Review POST includes a route-provided booking kind/ID and displays a local success after any resolved request. Static review cannot prove completed-service eligibility, booking/provider ownership, duplicate/replay rules, anonymous projection, moderation or publication state. | Owner/eligible-completed-booking review contract, idempotency/moderation/anonymity audit and runtime tests. |
| PM-LINK-001 | `STATIC_MATCHED_PARTIAL` | `s/[type]/[slug].tsx:14–49` | Resolver obtains an entity ID then routes by type. Static source cannot prove resolver authorization/publication state, canonical/deep-link integrity or ID-type correspondence. Failure falls back to a search query, possibly masking unavailable/revoked content. | Resolver status/publish/revocation contract, type/ID validation and invalid/expired-link tests. |
| PM-SVC-001 | `CONFIRMED_DEFECT` | `services/index.tsx:18–67, 83–110` | Service directory is fully hard-coded and advertises broad operational capabilities/routes. Several route targets are generic hubs, not service-specific selection. It cannot show catalog availability or qualified services, and discovery context is lost. | Server-authoritative service catalog/capabilities; typed service handoff and downstream readiness checks. |

## Conclusion

The final four routes are complete for source review. They do not validate video, review, deep-link or service discovery production readiness; confirmed defects include video lifecycle omission and static service-capability directory claims.
