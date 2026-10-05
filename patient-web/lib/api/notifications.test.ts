import { describe, expect, it } from "vitest";
import { extractPatientNotifications, webRouteForNotification } from "./notifications";

const notificationId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("notification response guards", () => {
  it("keeps only safe presentation fields and excludes owner, keys, payload, and delivery metadata", () => {
    const notifications = extractPatientNotifications({ notifications: [{ id: notificationId, title: "Title", body: "Body", priority: "HIGH", createdAt: "2026-08-20T10:00:00.000Z", read: false, user_id: "private", title_key: "raw", body_key: "raw", action: { route: "/private", payload: { secret: "x" } }, delivery: { token: "private" } }] });
    expect(notifications).toEqual([{ id: notificationId, title: "Title", body: "Body", priority: "HIGH", createdAt: "2026-08-20T10:00:00.000Z", read: false, route: "/private" }]);
  });

  it("suppresses backend translation keys rather than presenting technical text to the patient", () => {
    const notifications = extractPatientNotifications({ data: [{ id: notificationId, title: "notif.service.confirmed.title", body: "notif.service.confirmed.body", priority: "normal" }] });
    expect(notifications).toEqual([{ id: notificationId, priority: "normal" }]);
  });
});

describe("webRouteForNotification", () => {
  const id = "6e317348-1c49-4828-ae70-f3a08f8d23c1";
  it("opens only the pages that exist on the web, under the page's locale", () => {
    expect(webRouteForNotification(`/orders/${id}`, "en")).toBe(`/en/orders/${id}`);
    expect(webRouteForNotification(`/orders/${id}/tracking`, "ar")).toBe(`/ar/orders/${id}/tracking`);
    expect(webRouteForNotification(`/reports/${id}`, "ur")).toBe(`/ur/reports/${id}`);
    expect(webRouteForNotification("/consultations/appointments", "hi")).toBe("/hi/appointments");
  });
  it("returns null for app-only routes, other schemes and malformed ids", () => {
    for (const route of ["/provider/job/abc", "/tracking/lab/abc", "https://example.test/x", "//example.test", "/orders/../admin", `/orders/${id}/../../x`, "javascript:alert(1)", "", undefined]) {
      expect(webRouteForNotification(route, "en")).toBeNull();
    }
  });
});
