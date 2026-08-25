# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/chat.test.ts`
- **Member SHA-256:** `4569ec5a04ac9e6b131373f4ccc971f7b26cba024eeb8aadced43850affd4391`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: const threads = extractChatThreadSummaries({ threads: [{ id: threadId, type: "booking", last_message_at: "2026-08-20T10:00:00.000Z", name: "private", last_message: "private", participant_ids: ["private"], avatar_url: "https://example.test/p`
- `9: expect(threads).toEqual([{ id: threadId, type: "booking", lastActivityAt: "2026-08-20T10:00:00.000Z" }]);`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: expect(extractChatMessageSummaries({ messages: [{ id: threadId, sender_role: "provider", type: "text", body: "private", sender_id: "private", attachment_url: "private", reactions: { "❤": ["private"] }, createdAt: "2026-08-20T10:00:00.000Z" `
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
