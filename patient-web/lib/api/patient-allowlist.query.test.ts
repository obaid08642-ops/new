import { describe, expect, it } from "vitest";
import { isAllowedPatientApiTarget } from "./patient-allowlist";

// Q35: the proxy checked the allowlist against the path only, so entries that pin a query string
// (search, pharmacy chat threads, sleep/vitals/mood, chat messages) could never match → 404 resource_not_found.
describe("patient proxy allowlist — routes with a query string", () => {
  const order = "6e317348-1c49-4828-ae70-f3a08f8d23c1";
  it("allows the pinned query forms the website calls", () => {
    expect(isAllowedPatientApiTarget("/home/search", "?q=%D8%A8%D9%86%D8%A7%D8%AF%D9%88%D9%84", "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/pharmacy/chat/threads", `?order_id=${order}`, "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/mental-health/mood", "?days=30", "GET")).toBe(true);
  });
  it("still refuses those paths without the pinned query, with another query, or with another method", () => {
    expect(isAllowedPatientApiTarget("/home/search", "", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/pharmacy/chat/threads", "", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/pharmacy/chat/threads", "?order_id=not-a-uuid", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/mental-health/mood", "?days=30&user=other", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/home/search", "?q=x", "POST")).toBe(false);
  });
  it("keeps plain paths working as before", () => {
    expect(isAllowedPatientApiTarget("/orders/mine", "", "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/admin/users", "", "GET")).toBe(false);
  });
});
