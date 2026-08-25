# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/chat.ts`
- **Member SHA-256:** `fcac417363ea88ed7b1c4a1acfcb95c00683be652792e97641358e6722182bfd`
- **Line count:** 45
- **Read range:** `1-45`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: const allowedThreadTypes = ["direct", "group", "booking"] as const;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `35: export type ChatMessageSummary = { id: string; senderRole: string; type: string; createdAt?: string; edited: boolean; deleted: boolean; hasAttachment: boolean };`
- `42: if (!id.success || typeof record?.sender_role !== "string" || typeof record?.type !== "string") return [];`
- `43: return [{ id: id.data, senderRole: record.sender_role.slice(0, 40), type: record.type.slice(0, 20), createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined, edited: record.is_edited === true, deleted: record.is_delete`
### state_transitions
- `23: if (!id.success || !record || !allowedThreadTypes.includes(type as ChatThreadSummary["type"])) return null;`
- `42: if (!id.success || typeof record?.sender_role !== "string" || typeof record?.type !== "string") return [];`
### payment_insurance_relevance
- `12: function listFrom(payload: unknown): unknown[] {`
- `13: if (Array.isArray(payload)) return payload;`
- `14: const root = asRecord(payload);`
- `28: export function extractChatThreadSummaries(payload: unknown) {`
- `29: return listFrom(payload).flatMap((item) => {`
- `36: export function extractChatMessageSummaries(payload: unknown): ChatMessageSummary[] {`
- `37: const root = asRecord(payload);`
- `38: const list = Array.isArray(root?.messages) ? root.messages : listFrom(payload);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
