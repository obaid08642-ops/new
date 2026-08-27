import { describe, expect, it } from "vitest";
import { parseFamilyGroup } from "./family-group";
describe("family group response guards", () => {
  it("keeps group name/count and drops invite, permissions, and ids", () => {
    expect(parseFamilyGroup({ id: "private", name: "Home", owner_id: "owner", invite_code: "secret", members: [{ user_id: "u1", permissions: ["*"] }, { user_id: "u2", permissions: ["vitals"] }] }, "owner")).toEqual({ name: "Home", memberCount: 2, viewerIsOwner: true });
  });
});
