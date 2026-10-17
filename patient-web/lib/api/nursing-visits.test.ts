import { describe, expect, it, vi } from "vitest";
import { extractNursingVisits } from "./nursing-visits";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn() }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
import { getPatientNursingVisits } from "./nursing-visits-server";

describe("nursing visits parser", () => {
  it("extracts bounded patient-safe visit fields", () => {
    expect(extractNursingVisits({ data: [{ id: "visit-1", status: "scheduled", scheduled_at: "2026-08-25T10:00:00Z", provider_name: "Nurse A", patient_id: "private", gps: { lat: 1 } }, { status: "missing-id" }] })).toEqual([{ id: "visit-1", status: "scheduled", scheduledAt: "2026-08-25T10:00:00Z", providerName: "Nurse A", serviceName: undefined, addressLabel: undefined }]);
  });
  it("reads the booking model of GET /nursing/bookings/mine (state, service names by language, null fields)", () => {
    const booking = { id: "b-1", state: "NEW_REQUEST", scheduled_at: "2026-10-20T07:00:00.000Z", service_name_ar: "غيار جروح", service_name_en: "Wound dressing", provider_name: null, patient_id: "private" };
    expect(extractNursingVisits([booking], "en")).toEqual([{ id: "b-1", status: "NEW_REQUEST", scheduledAt: "2026-10-20T07:00:00.000Z", providerName: undefined, serviceName: "Wound dressing", addressLabel: undefined }]);
    expect(extractNursingVisits([booking], "ar")[0].serviceName).toBe("غيار جروح");
  });
  it("returns empty for malformed or absent payloads", () => { expect(extractNursingVisits({ data: [{ id: "" }] })).toEqual([]); expect(extractNursingVisits(null)).toEqual([]); });
  it("asks for the patient's own bookings (not the nurse's job list) with no-store", () => { getPatientNursingVisits("server-token"); expect(state.callPatientApi).toHaveBeenCalledWith("/nursing/bookings/mine", expect.objectContaining({ method: "GET", cache: "no-store" }), "server-token"); });
});
