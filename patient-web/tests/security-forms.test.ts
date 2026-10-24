import { describe, expect, it } from "vitest";
import { passwordProblem } from "@/components-next/settings/security-forms";

describe("passwordProblem", () => {
  it("asks for the current password first", () => {
    expect(passwordProblem("", "a-long-new-pass", "a-long-new-pass")).toBe("currentRequired");
  });
  it("rejects a short new password", () => {
    expect(passwordProblem("old", "short", "short")).toBe("passwordTooShort");
  });
  it("rejects a repeat that differs", () => {
    expect(passwordProblem("old", "a-long-new-pass", "a-long-new-pasz")).toBe("passwordMismatch");
  });
  it("accepts matching long passwords", () => {
    expect(passwordProblem("old", "a-long-new-pass", "a-long-new-pass")).toBeNull();
  });
});
