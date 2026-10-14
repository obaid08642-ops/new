import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ thread: vi.fn(), messages: vi.fn(), permissions: vi.fn(), api: vi.fn(), requirePatientAccess: vi.fn() }));

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("not-found"); },
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/chat-server", () => ({ getPatientChatThread: state.thread, getPatientChatMessages: state.messages, getPatientChatPermissions: state.permissions }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.api }));

vi.mock("@/components-next/core/core-shell", async () => {
  const { createElement } = await import("react");
  return { CoreShell: ({ children, backHref }: { children: unknown; backHref?: string }) => createElement("div", { "data-shell": true }, createElement("a", { href: backHref }, "back"), children as never) };
});

import ChatPage from "./page";
import ChatThreadPage from "./[threadId]/page";

const threadId = "91047ef2-ad36-422a-a184-629693e7c729";
const bookingId = "11111111-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-chat-token-never-in-html";
const attachmentUrl = "https://example.test/private-attachment";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("the doctor thread of a booking (decision 24)", () => {
  beforeEach(() => {
    state.thread.mockReset();
    state.messages.mockReset();
    state.permissions.mockReset().mockResolvedValue(json({}, 404));
    state.api.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("the chat list is gone: it goes to the bookings list", async () => {
    await expect(ChatPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("redirect:/en/appointments");
  });

  it("shows the activity and the emergency number only: no text, names, attachments or token", async () => {
    state.thread.mockResolvedValue(json({ id: threadId, type: "booking", booking_kind: "consultation", booking_id: bookingId, is_active: true, name: "private-name" }));
    state.messages.mockResolvedValue(json({ messages: [{ id: threadId, sender_role: "provider", type: "text", body: "private-message", createdAt: "2026-08-20T10:00:00.000Z", attachment_url: attachmentUrl }] }));
    const html = renderToStaticMarkup(await ChatThreadPage({ params: Promise.resolve({ locale: "en", threadId }) }));
    expect(html).toContain('href="tel:997"');
    expect(html).toContain("messageTypes.text");
    expect(html).not.toContain("bookFollowUp");
    for (const secret of [serverToken, "private-name", "private-message", attachmentUrl]) expect(html).not.toContain(secret);
    expect(html).toContain(`href="/en/appointments/${bookingId}"`);
  });

  it("a thread the server closed is read-only with the follow-up button to the booking with the original appointment", async () => {
    state.thread.mockResolvedValue(json({ id: threadId, type: "booking", booking_kind: "consultation", booking_id: bookingId, is_active: false }));
    state.messages.mockResolvedValue(json({ messages: [] }));
    state.api.mockResolvedValue(json({ id: bookingId, doctor_id: "doc-1" }));
    const html = renderToStaticMarkup(await ChatThreadPage({ params: Promise.resolve({ locale: "en", threadId }) }));
    expect(html).toContain("closed");
    expect(html).toContain(`/en/consultations/book/doc-1?followUp=${bookingId}`);
    expect(html).toContain('href="tel:997"');
  });

  it("the server's permissions drive the banner, the read-only notice and the follow-up (ids only in the link)", async () => {
    state.thread.mockResolvedValue(json({ id: threadId, type: "booking", booking_kind: "consultation", booking_id: bookingId, is_active: true }));
    state.messages.mockResolvedValue(json({ messages: [] }));
    state.permissions.mockResolvedValue(json({ status_code: "closed", can_chat: false, can_call: false, can_upload: false, can_voice: false, online: true, emergency_line: "997", read_only: true, remaining_hours: 0, book_follow_up: { action: "book_follow_up", doctor_id: "doc-9", doctor_user_id: "u-9", specialty: "cardiology" } }));
    const html = renderToStaticMarkup(await ChatThreadPage({ params: Promise.resolve({ locale: "en", threadId }) }));
    expect(html).toContain("window.closed");
    expect(html).toContain("closed");
    expect(html).toContain(`/en/consultations/book/doc-9?followUp=${bookingId}`);
    expect(html).not.toContain("cardiology");
    expect(state.api).not.toHaveBeenCalled();
    expect(html).toContain('href="tel:997"');
  });

  it("a follow-up window shows its state and the time left, and no follow-up button while chat is open", async () => {
    state.thread.mockResolvedValue(json({ id: threadId, type: "booking", booking_kind: "consultation", booking_id: bookingId, is_active: true }));
    state.messages.mockResolvedValue(json({ messages: [] }));
    state.permissions.mockResolvedValue(json({ status_code: "follow_up", can_chat: true, can_call: false, can_upload: true, can_voice: true, online: true, remaining_hours: 5.2 }));
    const html = renderToStaticMarkup(await ChatThreadPage({ params: Promise.resolve({ locale: "en", threadId }) }));
    expect(html).toContain("window.follow_up");
    expect(html).toContain("window.hoursLeft");
    expect(html).not.toContain("bookFollowUp");
  });

  describe("the text composer (issue 806)", () => {
    const open = (over: Record<string, unknown> = {}) => state.permissions.mockResolvedValue(json({ status_code: "active", can_chat: true, can_call: true, can_upload: true, can_voice: true, online: true, read_only: false, ...over }));
    beforeEach(() => {
      state.api.mockResolvedValue(json({}));
      state.thread.mockResolvedValue(json({ id: threadId, type: "booking", booking_kind: "consultation", booking_id: bookingId, is_active: true }));
      state.messages.mockResolvedValue(json({ messages: [] }));
    });
    const page = async () => renderToStaticMarkup(await ChatThreadPage({ params: Promise.resolve({ locale: "en", threadId }) }));

    it("is drawn when the server says the patient may chat, next to the emergency line and the window banner, and carries no token", async () => {
      open();
      const html = await page();
      expect(html).toContain('id="chat-composer-text"');
      expect(html).toContain("composerPlaceholder");
      expect(html).toContain('href="tel:997"');
      expect(html).toContain("window.active");
      expect(html).not.toContain(serverToken);
      expect(html).not.toContain("upload"); // text only: no attachment or voice control
    });

    it("is not drawn when the thread is read-only, chat is not allowed, or the rules could not be read", async () => {
      open({ read_only: true, status_code: "closed" });
      expect(await page()).not.toContain("chat-composer-text");
      open({ can_chat: false, status_code: "upcoming" });
      expect(await page()).not.toContain("chat-composer-text");
      state.permissions.mockResolvedValue(json({}, 404));
      expect(await page()).not.toContain("chat-composer-text");
    });
  });
});
