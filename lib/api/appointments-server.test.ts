import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));

import { getPatientAppointment, getPatientAppointments } from "./appointments-server";

describe("appointment server boundary", () => {
  beforeEach(() => callPatientApi.mockReset());

  it("forwards appointment reads from the server boundary with the received access token only", async () => {
    const response = new Response(null, { status: 200 });
    callPatientApi.mockResolvedValue(response);

    await expect(getPatientAppointments("server-access-token")).resolves.toBe(response);
    await expect(getPatientAppointment("server-access-token", "91047ef2-ad36-422a-a184-629693e7c729")).resolves.toBe(response);

    expect(callPatientApi).toHaveBeenNthCalledWith(1, "/care/appointments", {}, "server-access-token");
    expect(callPatientApi).toHaveBeenNthCalledWith(2, "/care/appointments/91047ef2-ad36-422a-a184-629693e7c729", {}, "server-access-token");
  });
});
