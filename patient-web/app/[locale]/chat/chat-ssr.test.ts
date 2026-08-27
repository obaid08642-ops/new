import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPatientChatThreads: vi.fn(), requirePatientAccess: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/chat-server", () => ({ getPatientChatThreads: state.getPatientChatThreads }));

import ChatPage from "./page";

const threadId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-chat-token-never-in-html";
const attachmentUrl = "https://example.test/private-attachment";

describe("chat list SSR boundary", () => {
  beforeEach(() => {
    state.getPatientChatThreads.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("renders type and activity only without thread id, message preview, names, participants, attachments, or token", async () => {
    state.getPatientChatThreads.mockResolvedValue(new Response(JSON.stringify({ threads: [{ id: threadId, type: "booking", last_message_at: "2026-08-20T10:00:00.000Z", name: "private-name", last_message: "private-message", participant_ids: ["private-participant"], avatar_url: attachmentUrl, unread_counts: { private: 4 }, booking_id: "private-booking" }] }), { status: 200 }));

    const html = renderToStaticMarkup(await ChatPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(state.getPatientChatThreads).toHaveBeenCalledWith(serverToken);
    expect(html).toContain("types.booking");
    for (const secret of [serverToken, threadId, "private-name", "private-message", "private-participant", attachmentUrl, "private-booking"]) expect(html).not.toContain(secret);
    expect(html).not.toMatch(/href="[^"]*(private|attachment)/i);
  });
});
