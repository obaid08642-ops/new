import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
import { getPatientVitalSummary } from "./vitals-server";

describe("vital summary server boundary", () => {
  beforeEach(() => callPatientApi.mockReset());
  it("uses the summary path and server token", async () => {
    const response = new Response(null, { status: 200 });
    callPatientApi.mockResolvedValue(response);
    await getPatientVitalSummary("server-token");
    expect(callPatientApi).toHaveBeenCalledWith("/health/vitals/summary", {}, "server-token");
  });
});
