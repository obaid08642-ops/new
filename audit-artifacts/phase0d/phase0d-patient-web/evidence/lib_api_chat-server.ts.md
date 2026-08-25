# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/chat-server.ts`
- **Member SHA-256:** `255e0bfbb560e904df29aa006ebecbf09e6b802593c45d33be4b529ba4329e66`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
### auth_ownership
- `4: export function getPatientChatThreads(accessToken: string) {`
- `5: return callPatientApi("/chat/threads", {}, accessToken);`
- `7: export function getPatientChatThread(accessToken: string, threadId: string) {`
- `9: return callPatientApi(`/chat/threads/${threadId}`, {}, accessToken);`
- `11: export function getPatientChatMessages(accessToken: string, threadId: string) {`
- `13: return callPatientApi(`/chat/threads/${threadId}/messages?limit=50`, {}, accessToken);`
### state_transitions
- `8: if (!/^[0-9a-f-]{36}$/i.test(threadId)) throw new Error("invalid_chat_thread_id");`
- `12: if (!/^[0-9a-f-]{36}$/i.test(threadId)) throw new Error("invalid_chat_thread_id");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: if (!/^[0-9a-f-]{36}$/i.test(threadId)) throw new Error("invalid_chat_thread_id");`
- `12: if (!/^[0-9a-f-]{36}$/i.test(threadId)) throw new Error("invalid_chat_thread_id");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
