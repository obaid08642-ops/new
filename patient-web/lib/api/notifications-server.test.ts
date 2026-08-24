import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
import { getPatientNotifications } from "./notifications-server";

describe("notifications server boundary", () => {
  beforeEach(() => callPatientApi.mockReset());
  it("uses the notifications list path and server token", async () => {
    const response = new Response(null, { status: 200 });
    callPatientApi.mockResolvedValue(response);
    await getPatientNotifications("server-token");
    expect(callPatientApi).toHaveBeenCalledWith("/notifications", {}, "server-token");
  });
});
