import { describe, expect, it } from "vitest";
import { registerErrorMessage } from "@/components-next/register-form";
const t = (key: string) => key;
describe("registerErrorMessage", () => {
  it("names the password rule on a 400 caused by the password length", () => expect(registerErrorMessage(t, 400, true)).toBe("errPassword"));
  it("keeps the generic text for other 400s", () => expect(registerErrorMessage(t, 400)).toBe("invalid"));
});
