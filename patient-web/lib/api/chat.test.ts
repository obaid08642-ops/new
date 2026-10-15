import { describe, expect, it } from "vitest";
import { extractChatMessageSummaries, extractChatThreadSummaries } from "./chat";

const threadId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("chat response guards", () => {
  it("keeps thread type and activity time only, excluding names, messages, participants, attachments, and unread maps", () => {
    const threads = extractChatThreadSummaries({ threads: [{ id: threadId, type: "booking", last_message_at: "2026-08-20T10:00:00.000Z", name: "private", last_message: "private", participant_ids: ["private"], avatar_url: "https://example.test/private", unread_counts: { private: 4 }, booking_id: "private" }] });
    expect(threads).toEqual([{ id: threadId, type: "booking", lastActivityAt: "2026-08-20T10:00:00.000Z" }]);
  });
  it("keeps the doctor's reply text (B27) and the activity metadata while dropping sender IDs, attachments, and reactions", () => {
    expect(extractChatMessageSummaries({ messages: [{ id: threadId, sender_role: "provider", type: "text", body: " the reply ", sender_id: "private", attachment_url: "private", reactions: { "❤": ["private"] }, createdAt: "2026-08-20T10:00:00.000Z" }] })).toEqual([{ id: threadId, senderRole: "provider", type: "text", createdAt: "2026-08-20T10:00:00.000Z", edited: false, deleted: false, hasAttachment: true, text: "the reply" }]);
  });
  it("shows no text for a deleted message or a role outside the patient and the doctor", () => {
    const rows = extractChatMessageSummaries({ messages: [
      { id: threadId, sender_role: "doctor", type: "text", body: "gone", is_deleted: true },
      { id: threadId, sender_role: "system", type: "text", body: "internal" },
    ] });
    expect(rows.map((row) => row.text)).toEqual([undefined, undefined]);
  });
});
