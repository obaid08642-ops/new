import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPatientNotifications: vi.fn(), requirePatientAccess: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
// The rows are a client list (tap to mark as read): it reads the real English messages.
vi.mock("next-intl", async () => (await import("@/tests/helpers/intl")).nextIntlMock("en"));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/notifications-server", () => ({ getPatientNotifications: state.getPatientNotifications }));
// The shell is a client frame (router, intl hooks, language and theme controls); this test is about the page's data boundary.
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: unknown }) => children }));
vi.mock("@/components-next/core/core-states", () => ({ RetryErrorState: () => null }));

import NotificationsPage from "./page";

const notificationId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-notification-token-never-in-html";
const actionUrl = "https://example.test/private-action";

describe("notifications SSR boundary", () => {
  beforeEach(() => {
    state.getPatientNotifications.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("renders presentation fields only without token, user id, action URL, or delivery metadata", async () => {
    state.getPatientNotifications.mockResolvedValue(new Response(JSON.stringify({ notifications: [{ id: notificationId, title: "Visible title", body: "Visible body", priority: "HIGH", type: "order", createdAt: "2026-08-20T10:00:00.000Z", read: false, user_id: "private-user", action: { route: actionUrl }, delivery: { provider: "private" }, title_key: "private-key" }] }), { status: 200 }));

    const html = renderToStaticMarkup(await NotificationsPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(state.getPatientNotifications).toHaveBeenCalledWith(serverToken);
    expect(html).toContain("Visible title");
    expect(html).toContain("Visible body");
    // the populated layout of canvas/Notifications: an "earlier" group (the fixture is old), the order icon, the unread dot
    expect(html).toContain('data-icon="moped"');
    expect(html).toContain('aria-label="Unread"');
    expect(html).toContain(">earlier<");
    expect(html).not.toContain(serverToken);
    expect(html).not.toContain("private-user");
    expect(html).not.toContain(actionUrl);
    expect(html).not.toContain("private-key");
    expect(html).not.toMatch(/href="[^"]*private-action/i);
  });

  it("makes an unread row a button that marks it as read, offers mark-all, and opens the web page of an order notification", async () => {
    const orderId = "6e317348-1c49-4828-ae70-f3a08f8d23c1";
    state.getPatientNotifications.mockResolvedValue(new Response(JSON.stringify({ notifications: [
      { id: notificationId, title: "Unread no page", type: "info", createdAt: "2026-08-20T10:00:00.000Z", read: false, action: { route: "/provider/job/x" } },
      { id: "11111111-2222-4333-8444-555555555555", title: "Order ready", type: "order", createdAt: "2026-08-20T10:00:00.000Z", read: false, action: { route: `/orders/${orderId}/tracking` } },
      { id: "22222222-2222-4333-8444-555555555555", title: "Already read", type: "info", createdAt: "2026-08-20T10:00:00.000Z", read: true },
    ] }), { status: 200 }));
    const html = renderToStaticMarkup(await NotificationsPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(html).toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Unread no page/);
    expect(html).toContain(`href="/en/orders/${orderId}/tracking"`);
    expect(html).not.toContain("/provider/job");
    expect(html).toContain("Mark all as read");
    // one unread dot per unread row, none for the read one
    expect((html.match(/aria-label="Unread"/g) ?? []).length).toBe(2);
  });

  it("shows no mark-all control when everything is read", async () => {
    state.getPatientNotifications.mockResolvedValue(new Response(JSON.stringify({ notifications: [{ id: notificationId, title: "Read", createdAt: "2026-08-20T10:00:00.000Z", read: true }] }), { status: 200 }));
    const html = renderToStaticMarkup(await NotificationsPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(html).not.toContain("Mark all as read");
    expect(html).not.toContain("<button");
  });
});
