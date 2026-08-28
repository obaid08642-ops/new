import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
import { getPatientPrescriptions } from "./prescriptions-server";

describe("prescriptions server boundary", () => {
  beforeEach(() => callPatientApi.mockReset());
  it("uses the current-patient prescription list path and server token", async () => {
    const response = new Response(null, { status: 200 });
    callPatientApi.mockResolvedValue(response);
    await getPatientPrescriptions("server-token");
    expect(callPatientApi).toHaveBeenCalledWith("/prescriptions/mine", {}, "server-token");
  });
});
