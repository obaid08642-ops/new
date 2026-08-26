import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));

import { getDiagnosticBooking, getDiagnosticBookings } from "./diagnostics-server";

describe("diagnostic server boundary", () => {
  beforeEach(() => callPatientApi.mockReset());

  it("forwards bounded diagnostic reads with the server access token only", async () => {
    const response = new Response(null, { status: 200 });
    callPatientApi.mockResolvedValue(response);
    await getDiagnosticBookings("server-token", "labs");
    await getDiagnosticBooking("server-token", "radiology", "91047ef2-ad36-422a-a184-629693e7c729");
    expect(callPatientApi).toHaveBeenNthCalledWith(1, "/labs/bookings/mine", {}, "server-token");
    expect(callPatientApi).toHaveBeenNthCalledWith(2, "/radiology/bookings/91047ef2-ad36-422a-a184-629693e7c729", {}, "server-token");
  });
});
