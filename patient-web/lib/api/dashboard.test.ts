import { describe, expect, it } from "vitest";
import { parseDashboardAppointment, parseDashboardProfile } from "./dashboard";

describe("dashboard contract parsers", () => {
  it("extracts only approved profile display fields", () => {
    expect(parseDashboardProfile({ display_name: "  Patient  ", health_id: "HP-1", locale: "ar" })).toEqual({ name: "Patient" });
    expect(parseDashboardProfile({ data: { display_name: "Wrapped" } })).toEqual({ name: "Wrapped" });
    expect(parseDashboardProfile({ display_name: "" })).toEqual({ name: null });
    expect(parseDashboardProfile({ data: { clinical_notes: "private", name: "profile document field, not the display name" } })).toEqual({ name: null });
  });

  it("requires a stable appointment id and normalizes documented aliases", () => {
    expect(parseDashboardAppointment({ data: { id: "apt-1", doctor_name: "Dr. Verified", scheduled_at: "2026-08-20T10:00:00Z", status: "CONFIRMED" } })).toEqual({
      id: "apt-1",
      doctorName: "Dr. Verified",
      dateLabel: "2026-08-20T10:00:00Z",
      status: "CONFIRMED",
    });
    expect(parseDashboardAppointment({ data: { doctor_name: "No id" } })).toBeNull();
  });
});
