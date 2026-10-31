import { describe, expect, it } from "vitest";
import { codeRequestFailure, isNoChannel, usableIdentifier } from "@/lib/auth/otp-flow";

describe("usableIdentifier", () => {
  it("trims and accepts an e-mail or a phone", () => {
    expect(usableIdentifier("  a@b.co ")).toBe("a@b.co");
    expect(usableIdentifier("+966509999999")).toBe("+966509999999");
  });
  it("refuses an empty or too short value", () => {
    expect(usableIdentifier("")).toBeNull();
    expect(usableIdentifier("  ab ")).toBeNull();
  });
});

describe("isNoChannel", () => {
  it("reads the backend's otp_no_channel from message or code", () => {
    expect(isNoChannel({ message: "otp_no_channel" })).toBe(true);
    expect(isNoChannel({ code: "otp_no_channel" })).toBe(true);
    expect(isNoChannel({ message: "otp_request_failed" })).toBe(false);
    expect(isNoChannel(null)).toBe(false);
    expect(isNoChannel("otp_no_channel")).toBe(false);
  });
});

describe("codeRequestFailure", () => {
  it("names otp_no_channel whatever the status, so it never shows as a generic error", () => {
    expect(codeRequestFailure(503, { message: "otp_no_channel" })).toBe("noChannel");
  });
  it("maps throttling, outage and everything else", () => {
    expect(codeRequestFailure(429, null)).toBe("rateLimited");
    expect(codeRequestFailure(503, { message: "otp_request_failed" })).toBe("unavailable");
    expect(codeRequestFailure(500, null)).toBe("failed");
    expect(codeRequestFailure(400, {})).toBe("failed");
  });
});
