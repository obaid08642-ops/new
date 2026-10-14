import { describe, expect, it } from "vitest";
import { isAllowedPatientApiTarget } from "./patient-allowlist";

// Q35: the proxy checked the allowlist against the path only, so entries that pin a query string
// (search, pharmacy chat threads, sleep/vitals/mood, chat messages) could never match → 404 resource_not_found.
describe("patient proxy allowlist — routes with a query string", () => {
  const order = "6e317348-1c49-4828-ae70-f3a08f8d23c1";
  it("allows the pinned query forms the website calls", () => {
    expect(isAllowedPatientApiTarget("/search", "?q=%D8%A8%D9%86%D8%A7%D8%AF%D9%88%D9%84&locale=ar&limit=10", "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/pharmacy/chat/threads", `?order_id=${order}`, "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/mental-health/mood", "?days=30", "GET")).toBe(true);
  });
  it("still refuses those paths without the pinned query, with another query, or with another method", () => {
    expect(isAllowedPatientApiTarget("/search", "", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/pharmacy/chat/threads", "", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/pharmacy/chat/threads", "?order_id=not-a-uuid", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/mental-health/mood", "?days=30&user=other", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/search", "?q=x&locale=en&limit=10", "POST")).toBe(false);
  });
  it("lets the notifications list mark one notification, or all, as read, and nothing else", () => {
    const id = "91047ef2-ad36-422a-a184-629693e7c729";
    expect(isAllowedPatientApiTarget(`/notifications/${id}/read`, "", "POST")).toBe(true);
    expect(isAllowedPatientApiTarget("/notifications/read-all", "", "POST")).toBe(true);
    expect(isAllowedPatientApiTarget(`/notifications/${id}/read`, "", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/notifications/not-an-id/read", "", "POST")).toBe(false);
    expect(isAllowedPatientApiTarget("/notifications/admin/send", "", "POST")).toBe(false);
    expect(isAllowedPatientApiTarget("/notifications/register-token", "", "POST")).toBe(false);
  });
  it("accepts a long Arabic search query: the cap is on the percent-encoded text, so 120 letters must fit", () => {
    const long = encodeURIComponent("ب".repeat(120));
    expect(long.length).toBe(120 * 6);
    expect(isAllowedPatientApiTarget("/search", `?q=${long}&locale=ar&limit=10`, "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/search", `?q=${encodeURIComponent("😀".repeat(120))}&locale=en&limit=10`, "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/search", `?q=${"a".repeat(1441)}&locale=en&limit=10`, "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/search", "?q=a&admin=1", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/search", "?q=a&locale=zz&limit=10", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/home/search", "?q=a", "GET")).toBe(false);
  });
  it("keeps plain paths working as before", () => {
    expect(isAllowedPatientApiTarget("/orders/mine", "", "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/admin/users", "", "GET")).toBe(false);
  });
});
