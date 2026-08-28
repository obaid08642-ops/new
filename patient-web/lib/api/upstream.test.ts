import { afterEach, describe, expect, it, vi } from "vitest";
import { callPatientApi, patientApiUrl } from "./upstream";

describe("patient upstream BFF boundary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("converts a network failure to a generic unavailable response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network timeout")));

    const response = await callPatientApi("/health/vitals/summary", {}, "server-only-token");

    expect(response.status).toBe(503);
    expect(response.statusText).toBe("upstream_unavailable");
  });

  it("rejects malformed paths before calling the network", () => {
    expect(() => patientApiUrl("health/vitals/summary")).toThrow("invalid_patient_api_path");
    expect(() => patientApiUrl("/health/../vitals")).toThrow("invalid_patient_api_path");
  });
});
