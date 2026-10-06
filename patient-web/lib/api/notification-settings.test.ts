import { describe, expect, it } from "vitest";
import { extractNotificationSettings } from "./notification-settings";

describe("notification settings response guard", () => {
  it("keeps known booleans and drops unknown or non-boolean values", () => {
    expect(extractNotificationSettings({ data: { general: true, emergency: false, sound: "true", patient_id: "private", unknown: true } })).toEqual({ general: true, emergency: false });
    expect(extractNotificationSettings(null)).toEqual({});
  });
});
