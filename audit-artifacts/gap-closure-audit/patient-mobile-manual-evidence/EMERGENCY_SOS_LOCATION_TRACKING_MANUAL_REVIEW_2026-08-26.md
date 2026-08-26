# Patient Mobile: Emergency SOS, location and tracking — manual review

## Scope boundary

This is a read-only source review of all four Emergency inventory routes plus the directly relevant push-navigation component. It does **not** establish that an ambulance dispatch exists, that government emergency numbers are correct/current, that location was received by a responder, that alerts were delivered, that ETA is accurate, or that cancellation/operational escalation works in runtime.

| Reviewed source | Scope |
|---|---|
| `app/emergency/index.tsx` | Redirect to SOS |
| `app/emergency/sos.tsx` | SOS trigger, foreground location and direct-phone actions |
| `app/emergency/sos-active.tsx` | Active incident polling, location map and cancellation |
| `app/emergency/tracking.tsx` | Emergency tracking polling and status display |
| `src/components/NotificationHandler.tsx` | Authenticated notification routing to active SOS |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-ER-001 | `CONFIRMED_DEFECT` | `emergency/sos.tsx:35–84` | SOS requests only foreground location. If location is denied, unavailable, API response lacks ID, or request throws, it silently falls back to dialing 997; it does not distinguish a failed platform request from a verified direct phone connection, preserve incident context, offer retry, or communicate what data was sent. | Incident creation state machine; location accuracy/timestamp/consent and fallback policy; explicit request accepted/failed/pending status; audit/delivery/escalation contract and runtime tests. |
| PM-ER-002 | `CONFIRMED_DEFECT` | `emergency/sos-active.tsx:26–60, 62–90, 149–188` | Active-SOS screen ignores the route `emergencyId` and polls generic `/emergency/my/active`. It separately re-requests GPS and displays it as shared, while map permission denial looks indefinitely like “determining location.” The operations-room action only shows a local alert and driver/contact details are not populated from the displayed response mapping. | Incident-ID ownership binding; authoritative incident/location/dispatch/contact read; location denial/stale/accuracy UX; actual operations-call/escalation contract; cancellation state/idempotency/audit. |
| PM-ER-003 | `STATIC_MATCHED_PARTIAL` | `emergency/tracking.tsx:31–45, 47–131` | Tracking polls a generic endpoint every 10 seconds and supports an honest no-active-incident state. It renders only server-returned fields, but static code cannot establish owner authorization, live-unit GPS provenance/freshness, ETA computation, endpoint semantics, dispatch state transitions, or precise map/location rendering. | Emergency tracking controller/service/state-machine evidence; owner/stranger/expired incident tests; location privacy/freshness/accuracy and ETA/delivery validation. |
| PM-ER-004 | `INSUFFICIENT_EVIDENCE` | `NotificationHandler.tsx:28–49, 72–108, 111–159` | Notification handler routes authenticated `emergency_update` messages to SOS active via an allowlist and safe fallback. Static source cannot prove push-token registration success, payload authenticity, recipient authorization, notification delivery/receipt, background reliability or operational notification escalation. | Push registration/delivery/recipient policy, signed payload/incident identity, retry/acknowledgement/escalation evidence and device-runtime tests. |
| PM-ER-005 | `MISSING_CAPABILITY` | `emergency/sos.tsx:22–28, 143–253`; `emergency/index.tsx:1–5` | Phone numbers, quick-call labels and poison center are hard-coded. There is no locale/region validation, availability disclaimer, emergency medical triage/safety policy, confirmation of call initiation/connection, or fallback when `tel:` fails. Index is only a redirect. | Operationally verified emergency directory, supported-region policy and legal review; direct-call failure/connection UX; clinical safety/triage/escalation governance. |

## Conclusion

The Emergency sources contain actual request/polling and native location/phone primitives, but they do not justify an operational emergency-service claim. The client contains confirmed ambiguity between failed backend SOS and telephone fallback, ignores the returned incident ID in the active screen, and exposes local-only operations-call feedback. Manual source review is complete for these four inventory routes only; it is not production validation.
