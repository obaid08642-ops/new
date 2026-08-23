import { describe, expect, it, vi } from "vitest";
import { extractNursingVisits } from "./nursing-visits";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn() }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
import { getPatientNursingVisits } from "./nursing-visits-server";

describe("nursing visits parser", () => {
  it("extracts bounded patient-safe visit fields", () => {
    expect(extractNursingVisits({ data: [{ id: "visit-1", status: "scheduled", scheduled_at: "2026-08-25T10:00:00Z", provider_name: "Nurse A", patient_id: "private", gps: { lat: 1 } }, { status: "missing-id" }] })).toEqual([{ id: "visit-1", status: "scheduled", scheduledAt: "2026-08-25T10:00:00Z", providerName: "Nurse A", serviceName: undefined, addressLabel: undefined }]);
  });
  it("returns empty for malformed or absent payloads", () => { expect(extractNursingVisits({ data: [{ id: "" }] })).toEqual([]); expect(extractNursingVisits(null)).toEqual([]); });
  it("calls only the verified protected route with no-store", () => { getPatientNursingVisits("server-token"); expect(state.callPatientApi).toHaveBeenCalledWith("/nursing/visits", expect.objectContaining({ method: "GET", cache: "no-store" }), "server-token"); });
});
