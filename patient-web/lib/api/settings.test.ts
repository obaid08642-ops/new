import { describe, expect, it } from "vitest";
import { parsePrivacySettings, parseSecuritySettings, parseSessions, parseStorageSummary } from "./settings";

describe("settings response guards", () => {
  it("keeps safe privacy/security booleans only", () => {
    expect(parsePrivacySettings({ data: { profile_visible: true, share_data: false, patient_id: "private" } })).toEqual({ profileVisible: true, shareData: false });
    expect(parseSecuritySettings({ biometric: true, two_factor: false, secret: "private" })).toEqual({ biometric: true, twoFactor: false });
  });
  it("drops session ids while keeping device and expiry metadata", () => {
    expect(parseSessions([{ id: "private-jti", device: "web", expires_in_seconds: 86400, access_token: "private" }])).toEqual([{ device: "web", expiresInSeconds: 86400 }]);
  });
  it("keeps storage metadata and drops unknown fields", () => {
    expect(parseStorageSummary({ used: "1 MB", total: "5 GB", items: [{ label: "Reports", val: "1 MB", pct: 2, base64: "private" }], patient_id: "private" })).toEqual({ used: "1 MB", total: "5 GB", items: [{ label: "Reports", value: "1 MB", percent: 2 }] });
  });
});
