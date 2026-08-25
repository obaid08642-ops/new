# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/notifications.test.ts`
- **Member SHA-256:** `47374d20bf4d5be4f2be74692bbf4c19efba43f6e13d730e83af66a8d048448e`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: const notifications = extractPatientNotifications({ notifications: [{ id: notificationId, title: "Title", body: "Body", priority: "HIGH", createdAt: "2026-08-20T10:00:00.000Z", read: false, user_id: "private", title_key: "raw", body_key: "r`
### backend_consumers_or_contracts
- `2: import { extractPatientNotifications } from "./notifications";`
### auth_ownership
- `7: it("keeps only safe presentation fields and excludes owner, keys, payload, and delivery metadata", () => {`
- `8: const notifications = extractPatientNotifications({ notifications: [{ id: notificationId, title: "Title", body: "Body", priority: "HIGH", createdAt: "2026-08-20T10:00:00.000Z", read: false, user_id: "private", title_key: "raw", body_key: "r`
### state_transitions
- `13: const notifications = extractPatientNotifications({ data: [{ id: notificationId, title: "notif.service.confirmed.title", body: "notif.service.confirmed.body", priority: "normal" }] });`
### payment_insurance_relevance
- `7: it("keeps only safe presentation fields and excludes owner, keys, payload, and delivery metadata", () => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
