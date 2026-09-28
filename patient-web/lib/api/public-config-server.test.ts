import { describe, expect, it } from "vitest";
import { isWebMaintenance, selectHomeSections } from "./public-config-server";

describe("web app gate (R6-5)", () => {
  it("honours the admin maintenance flag for the web app only", () => {
    expect(isWebMaintenance({ app_versions: { apps: { web: { maintenance: true, message_en: "Down" } } } }))
      .toEqual({ maintenance: true, message: "Down" });
    expect(isWebMaintenance({ app_versions: { apps: { web: { maintenance: false } } } }).maintenance).toBe(false);
    expect(isWebMaintenance({ app_versions: { apps: { patient: { maintenance: true } } } }).maintenance).toBe(false);
    expect(isWebMaintenance(null).maintenance).toBe(false);
  });

  it("selects enabled sections with items in position order", () => {
    const sections = selectHomeSections({ sections: [
      { id: "b", position: 2, enabled: true, items: [{ id: "i" }] },
      { id: "a", position: 1, enabled: false, items: [{ id: "i" }] },
      { id: "c", position: 0, enabled: true, items: [] },
      { id: "d", position: 0, enabled: true, items: [{ id: "i" }] },
    ] });
    expect(sections.map((s) => s.id)).toEqual(["d", "b"]);
  });
});
