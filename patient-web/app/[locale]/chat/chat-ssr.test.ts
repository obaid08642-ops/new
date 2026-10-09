import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ thread: vi.fn(), messages: vi.fn(), api: vi.fn(), requirePatientAccess: vi.fn() }));

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("not-found"); },
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/chat-server", () => ({ getPatientChatThread: state.thread, getPatientChatMessages: state.messages }));
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
});
