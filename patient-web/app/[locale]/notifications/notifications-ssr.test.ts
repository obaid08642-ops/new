import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPatientNotifications: vi.fn(), requirePatientAccess: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/notifications-server", () => ({ getPatientNotifications: state.getPatientNotifications }));

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
    state.getPatientNotifications.mockResolvedValue(new Response(JSON.stringify({ notifications: [{ id: notificationId, title: "Visible title", body: "Visible body", priority: "HIGH", createdAt: "2026-08-20T10:00:00.000Z", read: false, user_id: "private-user", action: { route: actionUrl }, delivery: { provider: "private" }, title_key: "private-key" }] }), { status: 200 }));

    const html = renderToStaticMarkup(await NotificationsPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(state.getPatientNotifications).toHaveBeenCalledWith(serverToken);
    expect(html).toContain("Visible title");
    expect(html).toContain("Visible body");
    expect(html).not.toContain(serverToken);
    expect(html).not.toContain("private-user");
    expect(html).not.toContain(actionUrl);
    expect(html).not.toContain("private-key");
    expect(html).not.toMatch(/href="[^"]*private-action/i);
  });
});
