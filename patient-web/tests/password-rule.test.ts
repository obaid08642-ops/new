import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, registerProblem } from "@/lib/auth/password-rule";

const ok = { name: "Sara", identifier: "sara@example.com", password: "long-enough-1", confirm: "long-enough-1" };
describe("registerProblem", () => {
  it("accepts a complete form", () => expect(registerProblem(ok, true)).toBeNull());
  it("names the first broken rule", () => {
    expect(registerProblem({ ...ok, name: "S" }, true)).toBe("errName");
    expect(registerProblem({ ...ok, identifier: "ab" }, true)).toBe("errIdentifier");
    expect(registerProblem({ ...ok, password: "short", confirm: "short" }, true)).toBe("errPassword");
    expect(registerProblem({ ...ok, confirm: "different-pass" }, true)).toBe("errMismatch");
    expect(registerProblem(ok, false)).toBe("errAgree");
  });
  it("uses a minimum of 8 (owner decision 2026-10-24), the same everywhere", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(registerProblem({ ...ok, password: "1234567", confirm: "1234567" }, true)).toBe("errPassword");
    expect(registerProblem({ ...ok, password: "12345678", confirm: "12345678" }, true)).toBeNull();
  });
});
