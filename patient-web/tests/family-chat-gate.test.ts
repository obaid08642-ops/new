import { describe, expect, it } from "vitest";
import { parseFamilyChatGate } from "../components-next/family/family-chat";

describe("parseFamilyChatGate (LJ-10)", () => {
  it("treats a 403/not_active_family_member reply as the create-or-join state", () => {
    expect(parseFamilyChatGate(403, { message: "not_active_family_member" })).toBe("no-group");
    expect(parseFamilyChatGate(403, { error: "Forbidden", message: "not_active_family_member" })).toBe("no-group");
  });

  it("treats other failures as errors", () => {
    expect(parseFamilyChatGate(403, { message: "forbidden" })).toBe("error");
    expect(parseFamilyChatGate(500, null)).toBe("error");
    expect(parseFamilyChatGate(401, null)).toBe("error");
  });

  it("passes successful replies through", () => {
    expect(parseFamilyChatGate(200, { data: [] })).toBe("ok");
  });
});
