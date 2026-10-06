import { describe, expect, it } from "vitest";
import { extractNotificationPreferences, extractNotificationSettings } from "./notification-settings";

describe("notification settings response guard", () => {
  it("keeps known booleans and drops unknown or non-boolean values", () => {
    expect(extractNotificationSettings({ data: { general: true, emergency: false, sound: "true", patient_id: "private", unknown: true } })).toEqual({ general: true, emergency: false });
    expect(extractNotificationSettings(null)).toEqual({});
  });
});

describe("notification preferences response guard", () => {
  it("reads the channels and categories the API really returns and drops everything else", () => {
    expect(extractNotificationPreferences({
      channels: { push: true, email: false, sms: "yes", pager: true },
      categories: { appointments: true, marketing: false, secret: true },
      user_id: "private",
    })).toEqual({ channels: { push: true, email: false }, categories: { appointments: true, marketing: false } });
    expect(extractNotificationPreferences({ data: { categories: { chat: true } } })).toEqual({ channels: {}, categories: { chat: true } });
    expect(extractNotificationPreferences(null)).toEqual({ channels: {}, categories: {} });
  });
});
