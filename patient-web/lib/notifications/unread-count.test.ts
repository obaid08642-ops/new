import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUnreadCount, parseUnreadCount } from "./unread-count";

describe("issue 1819 bell unread count", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("reads only a real non-negative number", () => {
    expect(parseUnreadCount({ unread: 3 })).toBe(3);
    expect(parseUnreadCount({ unread: 0 })).toBe(0);
    expect(parseUnreadCount({ unread: -1 })).toBeNull();
    expect(parseUnreadCount({ unread: "3" })).toBeNull();
    expect(parseUnreadCount(null)).toBeNull();
  });
  it("is null when the request fails or is refused", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await fetchUnreadCount()).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await fetchUnreadCount()).toBeNull();
  });
  it("returns the count the server sent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ unread: 2 }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchUnreadCount()).toBe(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/patient/notifications/unread-count");
  });
});
