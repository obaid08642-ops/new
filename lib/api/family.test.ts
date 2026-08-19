import { describe, expect, it } from "vitest";
import { extractFamilyMembers } from "./family";

describe("family response guards", () => {
  it("keeps role and join date only, excluding member identifier and permissions from display data", () => {
    const members = extractFamilyMembers({ members: [{ user_id: "member_123", role: "owner", joined_at: "2026-08-20T10:00:00.000Z", permissions: ["view_health"] }] });
    expect(members).toEqual([{ id: "member_123", role: "owner", joinedAt: "2026-08-20T10:00:00.000Z" }]);
  });
});
