import { describe, expect, it } from "vitest";
import { extractPatientNotifications } from "./notifications";

const notificationId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("notification response guards", () => {
  it("keeps only safe presentation fields and excludes owner, keys, payload, and delivery metadata", () => {
    const notifications = extractPatientNotifications({ notifications: [{ id: notificationId, title: "Title", body: "Body", priority: "HIGH", createdAt: "2026-08-20T10:00:00.000Z", read: false, user_id: "private", title_key: "raw", body_key: "raw", action: { route: "/private" }, delivery: { token: "private" } }] });
    expect(notifications).toEqual([{ id: notificationId, title: "Title", body: "Body", priority: "HIGH", createdAt: "2026-08-20T10:00:00.000Z", read: false }]);
  });
});
