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

  it("labels a string body as JSON so the API parses it (fetch would send text/plain)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await callPatientApi("/home-care/bookings", { method: "POST", body: JSON.stringify({ service_id: "s1" }) }, "t");
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("content-type")).toBe("application/json");

    await callPatientApi("/storage/upload", { method: "POST", headers: { "content-type": "text/csv" }, body: "a,b" }, "t");
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get("content-type")).toBe("text/csv");
  });

  it("rejects malformed paths before calling the network", () => {
    expect(() => patientApiUrl("health/vitals/summary")).toThrow("invalid_patient_api_path");
    expect(() => patientApiUrl("/health/../vitals")).toThrow("invalid_patient_api_path");
  });
});
