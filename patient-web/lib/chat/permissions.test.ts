import { describe, expect, it } from "vitest";
import { followUpTarget, parseThreadPermissions, windowBanner } from "./permissions";

const base = { can_chat: true, can_call: false, can_upload: true, can_voice: true, online: true, status_code: "follow_up" };

describe("thread permissions (decision 24)", () => {
  it("maps the server answer, bare or wrapped in data", () => {
    const p = parseThreadPermissions({ data: { ...base, remaining_hours: 3.4, emergency_line: "997" } });
    expect(p).toMatchObject({ canChat: true, canCall: false, canUpload: true, canVoice: true, status: "follow_up", readOnly: false, emergencyLine: "997" });
    expect(parseThreadPermissions(base)?.remainingHours).toBeUndefined();
  });
  it("rejects anything that is not a permissions answer", () => {
    expect(parseThreadPermissions(null)).toBeNull();
    expect(parseThreadPermissions({ ...base, status_code: "weird" })).toBeNull();
    expect(parseThreadPermissions({ status_code: "active" })).toBeNull();
  });
  it("a missing flag is not allowed; a non-numeric emergency line falls back to 997", () => {
    const p = parseThreadPermissions({ can_chat: true, status_code: "active", emergency_line: "javascript:1" });
    expect(p).toMatchObject({ canVoice: false, canCall: false, online: false, emergencyLine: "997" });
  });
  it("banner: state plus hours, or minutes under an hour, only in the follow-up window", () => {
    expect(windowBanner(parseThreadPermissions({ ...base, remaining_hours: 5.4 }))).toEqual({ statusKey: "follow_up", remaining: { key: "hoursLeft", count: 5 } });
    expect(windowBanner(parseThreadPermissions({ ...base, remaining_hours: 0.5 }))).toEqual({ statusKey: "follow_up", remaining: { key: "minutesLeft", count: 30 } });
    expect(windowBanner(parseThreadPermissions({ ...base, status_code: "active" }))).toEqual({ statusKey: "active" });
    expect(windowBanner(null)).toBeNull();
  });
  it("follow-up target uses ids only: doctor_id first, then the route id, then the account id", () => {
    const p = parseThreadPermissions({ ...base, status_code: "closed", read_only: true, book_follow_up: { action: "book_follow_up", doctor_id: "d1", doctor_user_id: "u1", specialty: "x" } });
    expect(followUpTarget(p, "route", "appt")).toEqual({ doctorId: "d1", appointmentId: "appt" });
    const q = parseThreadPermissions({ ...base, status_code: "closed", read_only: true, book_follow_up: { action: "book_follow_up", doctor_id: null, doctor_user_id: "u1" } });
    expect(followUpTarget(q, "route", "appt")?.doctorId).toBe("route");
    expect(followUpTarget(q, "", "appt")?.doctorId).toBe("u1");
    expect(followUpTarget(q, "", "")).toBeNull();
  });
});
