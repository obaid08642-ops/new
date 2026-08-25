# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/chat/chat-ssr.test.ts`
- **Member SHA-256:** `6ca2a8b1e0b7512af5fd3bc84f819a1115ceafd1af0cbb1c40b66c10155c9e72`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import ChatPage from "./page";`
- `25: state.getPatientChatThreads.mockResolvedValue(new Response(JSON.stringify({ threads: [{ id: threadId, type: "booking", last_message_at: "2026-08-20T10:00:00.000Z", name: "private-name", last_message: "private-message", participant_ids: ["pr`
- `27: const html = renderToStaticMarkup(await ChatPage({ params: Promise.resolve({ locale: "en" }) }));`
- `30: expect(html).toContain("types.booking");`
- `31: for (const secret of [serverToken, threadId, "private-name", "private-message", "private-participant", attachmentUrl, "private-booking"]) expect(html).not.toContain(secret);`
- `32: expect(html).not.toMatch(/href="[^"]*(private|attachment)/i);`
### backend_consumers_or_contracts
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/chat-server", () => ({ getPatientChatThreads: state.getPatientChatThreads }));`
### auth_ownership
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `15: const serverToken = "server-only-chat-token-never-in-html";`
- `21: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `24: it("renders type and activity only without thread id, message preview, names, participants, attachments, or token", async () => {`
- `29: expect(state.getPatientChatThreads).toHaveBeenCalledWith(serverToken);`
- `31: for (const secret of [serverToken, threadId, "private-name", "private-message", "private-participant", attachmentUrl, "private-booking"]) expect(html).not.toContain(secret);`
### state_transitions
- `4: const state = vi.hoisted(() => ({ getPatientChatThreads: vi.fn(), requirePatientAccess: vi.fn() }));`
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/chat-server", () => ({ getPatientChatThreads: state.getPatientChatThreads }));`
- `20: state.getPatientChatThreads.mockReset();`
- `21: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `25: state.getPatientChatThreads.mockResolvedValue(new Response(JSON.stringify({ threads: [{ id: threadId, type: "booking", last_message_at: "2026-08-20T10:00:00.000Z", name: "private-name", last_message: "private-message", participant_ids: ["pr`
- `29: expect(state.getPatientChatThreads).toHaveBeenCalledWith(serverToken);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
