import { describe, expect, it } from "vitest";
import { registerProblem } from "@/lib/auth/password-rule";

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
});
