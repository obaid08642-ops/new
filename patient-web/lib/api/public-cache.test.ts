import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicDoctors } from "./doctors-server";
import { getHomeContent, getPublicConfig } from "./public-config-server";

/*
 * F82-1: public, credential-free reads go through the Next data cache; anything free-form or carrying
 * a credential does not. These tests pin which is which.
 */
describe("public data cache (F82-1)", () => {
  const original = globalThis.fetch;
  const fetchMock = () => globalThis.fetch as ReturnType<typeof vi.fn>;
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  });
  afterEach(() => {
    globalThis.fetch = original;
    vi.restoreAllMocks();
  });

  it("caches the public config and home content for a minute and sends no credential", async () => {
    await getPublicConfig();
    await getHomeContent();
    for (const [, init] of fetchMock().mock.calls) {
      expect(init.next).toEqual({ revalidate: 60 });
      expect(init.cache).toBeUndefined();
      expect(init.headers).toEqual({ Accept: "application/json" });
      expect(init.credentials).toBeUndefined();
    }
  });

  it("caches the unfiltered doctor list", async () => {
    await getPublicDoctors();
    await getPublicDoctors({ sort: "rating" });
    for (const [, init] of fetchMock().mock.calls) {
      expect(init.next).toEqual({ revalidate: 60 });
      expect(init.cache).toBeUndefined();
    }
  });

  it("never caches a free-form search or specialty text", async () => {
    await getPublicDoctors({ search: "heart" });
    await getPublicDoctors({ specialty: "cardiology" });
    for (const [, init] of fetchMock().mock.calls) {
      expect(init.cache).toBe("no-store");
      expect(init.next).toBeUndefined();
    }
  });
});
