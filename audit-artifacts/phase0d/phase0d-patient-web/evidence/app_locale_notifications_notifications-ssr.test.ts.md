# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/notifications/notifications-ssr.test.ts`
- **Member SHA-256:** `d5079f3a1cef945d081d7d7ff701825ee06e37d421404308119c2064c22fdff0`
- **Line count:** 38
- **Read range:** `1-38`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import NotificationsPage from "./page";`
- `25: state.getPatientNotifications.mockResolvedValue(new Response(JSON.stringify({ notifications: [{ id: notificationId, title: "Visible title", body: "Visible body", priority: "HIGH", createdAt: "2026-08-20T10:00:00.000Z", read: false, user_id:`
- `27: const html = renderToStaticMarkup(await NotificationsPage({ params: Promise.resolve({ locale: "en" }) }));`
- `36: expect(html).not.toMatch(/href="[^"]*private-action/i);`
### backend_consumers_or_contracts
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/notifications-server", () => ({ getPatientNotifications: state.getPatientNotifications }));`
### auth_ownership
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `15: const serverToken = "server-only-notification-token-never-in-html";`
- `21: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `24: it("renders presentation fields only without token, user id, action URL, or delivery metadata", async () => {`
- `29: expect(state.getPatientNotifications).toHaveBeenCalledWith(serverToken);`
- `32: expect(html).not.toContain(serverToken);`
### state_transitions
- `4: const state = vi.hoisted(() => ({ getPatientNotifications: vi.fn(), requirePatientAccess: vi.fn() }));`
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/notifications-server", () => ({ getPatientNotifications: state.getPatientNotifications }));`
- `20: state.getPatientNotifications.mockReset();`
- `21: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `25: state.getPatientNotifications.mockResolvedValue(new Response(JSON.stringify({ notifications: [{ id: notificationId, title: "Visible title", body: "Visible body", priority: "HIGH", createdAt: "2026-08-20T10:00:00.000Z", read: false, user_id:`
- `29: expect(state.getPatientNotifications).toHaveBeenCalledWith(serverToken);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
