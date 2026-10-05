import { describe, expect, it } from "vitest";
import { afterEach, vi } from "vitest";
import { getHomeContent, isWebMaintenance, readHomeContent, readPublicConfig, selectHomeSections } from "./public-config-server";

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

describe("maintenance message language", () => {
  const config = { app_versions: { apps: { web: { maintenance: true, message_ar: "رسالة", message_en: "Message" } } } };
  it("returns the admin's message only for the language it was written in", () => {
    expect(isWebMaintenance(config, "ar").message).toBe("رسالة");
    expect(isWebMaintenance(config, "en").message).toBe("Message");
    for (const locale of ["ur", "hi", "bn", "fil"]) expect(isWebMaintenance(config, locale)).toEqual({ maintenance: true, message: undefined });
  });
});

describe("public reads tell a failure from an empty answer", () => {
  afterEach(() => vi.unstubAllGlobals());
  const answer = (status: number, body: unknown = {}) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

  it("flags a 5xx and a network error as a failure", async () => {
    answer(500);
    expect(await readPublicConfig()).toEqual({ data: null, failed: true });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await readHomeContent()).toEqual({ data: null, failed: true });
  });

  it("does not flag a 404 or an empty answer", async () => {
    answer(404);
    expect(await readPublicConfig()).toEqual({ data: null, failed: false });
    answer(200, { sections: [] });
    expect(await readHomeContent()).toEqual({ data: { sections: [] }, failed: false });
    expect(await getHomeContent()).toEqual({ sections: [] });
  });
});
