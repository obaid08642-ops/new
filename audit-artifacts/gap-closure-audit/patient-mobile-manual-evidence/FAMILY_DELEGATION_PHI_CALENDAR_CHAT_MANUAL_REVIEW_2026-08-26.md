# Patient Mobile: Family delegation / PHI / calendar / chat — manual semantic review

## Scope and review boundary

This is a read-only static review of all 12 `family` inventory routes. It identifies UI/client request and locally-derived state only. It does not prove family-group ownership, consent, guardian/minor rules, PHI access control, invite TTL/revocation, message confidentiality, calendar ACLs, provider booking authority, notification delivery, or backend audit trails.

| Reviewed source | Scope |
|---|---|
| `app/family/calendar.tsx` | Shared-event read/create/delete |
| `app/family/chat.tsx` | Family-message polling/send |
| `app/family/emergency-contacts.tsx` | Family emergency contact list/SOS handoff |
| `app/family/hub.tsx` | Family member hub and PHI navigation |
| `app/family/index.tsx` | Redirect to legacy Health family hub |
| `app/family/invite.tsx` | Invite-code generation/share/QR |
| `app/family/join.tsx` | Invite-code acceptance |
| `app/family/member-health.tsx` | Relative PHI bundle display |
| `app/family/permission-request.tsx` | Permission request response |
| `app/family/permissions.tsx` | Grant/revoke/remove-member management |
| `app/family/scan.tsx` | QR invite parsing/handoff |
| `app/family/shared-calendar.tsx` | Redirect to canonical calendar |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-FAM-001 | `CONFIRMED_DEFECT` | `family/join.tsx:39–70, 72–101` | `lookupCode` performs `POST /family/join` immediately with a fixed display name before any real invite/group/permission review. On success it fabricates group name and empty permission data; the later accept action is local-only. This reverses a consent/review boundary and hides actual requested scope. | Invite preview/read and explicit accept/reject state machine; scoped permission consent; TTL/revocation/single-use policy; participant identity/relationship validation and audit. |
| PM-FAM-002 | `CONFIRMED_DEFECT` | `family/invite.tsx:23–45, 76–142` | Invite creation posts without the optional entered member name/relation, but the UI presents those fields as member data. The raw code/URL is shared and encoded in QR with no visible expiry, recipient binding, revoke, rotation or disclosure warning. | Authoritative invite DTO including intended relation/recipient scope; expiry/revocation/single-use/abuse protections; controlled sharing and audit model. |
| PM-FAM-003 | `CONFIRMED_DEFECT` | `family/permissions.tsx:115–172, 174–200, 326–370` | The screen first tries direct PATCH replacement of the member’s full PHI/payment/location permission set, then silently falls back to an approval request on any error. Its success notice always says a request was sent even after direct mutation; removal catches any error and navigates back as if complete. | Explicit owner/member authorization outcomes; one unambiguous consent model; grant/revoke version/audit; high-risk permission safeguards for payment/location/booking; removal confirmation and failure behavior. |
| PM-FAM-004 | `CONFIRMED_DEFECT` | `family/permission-request.tsx:23–64, 69–76` | Permission-response route selects the requested ID but falls back to the first pending request when no match is passed, allowing response context to drift. It locally toggles permissions and shows success after request call without proof of caller/target/decision ownership or resulting grants. | Request-ID-only response API with owner/recipient checks; immutable request scope/version; explicit pending/expired/already-responded states; audit and notification evidence. |
| PM-FAM-005 | `RUNTIME_REQUIRED` | `family/member-health.tsx:34–118, 147–161, 276–289`; `family/hub.tsx:151–204` | Relative PHI is loaded by route `memberId` and displayed as vitals, medicines and appointments. On any request failure the UI renders a benign empty profile using route name/relation, obscuring authorization versus network failure. Booking “on behalf” routes generically to consultations without conveying member ID/permission grant. | Owner/stranger/guest/minor access tests; scoped PHI DTO; distinct forbidden/error UX; delegated booking identity/consent/financial responsibility contract and audit. |
| PM-FAM-006 | `STATIC_MATCHED_PARTIAL` | `family/calendar.tsx:57–118, 194–266`; `family/shared-calendar.tsx:1–8` | Calendar performs read/create/delete with a member ID selected from the group, and only displays delete when server supplies `can_delete`. Static review cannot prove event/member relationship, ACLs, timezone/recurrence, notification delivery or whether medical events expose too much PHI. The alternate route is only a redirect. | Calendar event schema/ACL/audit, owner/member authorization and event-notification model; timezone/recurrence handling; PHI minimization policy. |
| PM-FAM-007 | `RUNTIME_REQUIRED` | `family/chat.tsx:43–104, 106–175` | Family chat polls every five seconds and appends a sent message from client response/fallback values. Static source cannot prove membership enforcement, message confidentiality/encryption, retention/deletion, rate limiting, media/PHI policy, ordering/deduplication or notification delivery. | Chat authorization/retention/audit model, event ordering/deduplication, safety/rate limits, upload policy and user-visible delivery/error semantics. |
| PM-FAM-008 | `MISSING_CAPABILITY` | `family/emergency-contacts.tsx:34–52, 81–176` | Emergency contacts are read from family membership and the UI asserts SOS will notify family with current location, but this screen contains no notification dispatch, location acquisition, consent/status, alert acknowledgement, escalation or delivery confirmation. | SOS event/location/consent/notification state machine; recipient policy and delivery/acknowledgement/escalation evidence; emergency-service disclaimer and runtime tests. |
| PM-FAM-009 | `INSUFFICIENT_EVIDENCE` | `family/scan.tsx:11–40`; `family/index.tsx:1–5` | QR scan validates only a broad code format then routes to join; it performs no signature/origin/expiry validation locally. Family index redirects to legacy `/health/family-hub`, creating duplicate entry points that require routing/authorization reconciliation. | Server verification of signed/opaque code; user-visible invalid/expired/revoked distinctions; canonical route and deep-link policy. |

## Review conclusion

The Family surface exposes sensitive delegated PHI, booking, payment, location and emergency concepts, but the client sources contain a confirmed join-before-consent flow, ambiguous direct-vs-request permission behavior, stale/fallback permission-request selection, raw invite sharing, and a generic delegated booking handoff. Completion of source reading means only that these routes were manually reviewed with findings/contract gaps recorded; it does not establish family/PHI safety or production readiness.
