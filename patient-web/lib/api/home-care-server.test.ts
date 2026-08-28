import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));

import { getPatientHomeCareBookings } from "./home-care-server";

describe("home-care server boundary", () => {
  beforeEach(() => callPatientApi.mockReset());
  it("uses the bounded home-care list path and server token", async () => {
    const response = new Response(null, { status: 200 });
    callPatientApi.mockResolvedValue(response);
    await getPatientHomeCareBookings("server-token");
    expect(callPatientApi).toHaveBeenCalledWith("/unified-bookings/mine", { method: "GET", cache: "no-store" }, "server-token");
  });
});
