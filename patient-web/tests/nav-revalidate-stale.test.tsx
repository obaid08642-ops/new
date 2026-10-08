import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, prefetch: vi.fn(), push: vi.fn() }) }));

import { RevalidateStale, needsRevalidation } from "@/components-next/nav/revalidate-stale";
import { StaleWhileRevalidate } from "@/components-next/nav/stale-while-revalidate";

describe("StaleWhileRevalidate", () => {
  it("renders nothing, and does not refresh while rendering on the server", () => {
    expect(renderToStaticMarkup(<StaleWhileRevalidate />)).toBe("");
    expect(renderToStaticMarkup(<RevalidateStale renderedAt={Date.now() - 60_000} />)).toBe("");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("needsRevalidation", () => {
  const now = 1_000_000;
  it("keeps a page that was just rendered", () => {
    expect(needsRevalidation(now, now)).toBe(false);
    expect(needsRevalidation(now - 4_000, now)).toBe(false);
  });
  it("revalidates a page that sat in the router cache", () => {
    expect(needsRevalidation(now - 6_000, now)).toBe(true);
    expect(needsRevalidation(now - 120_000, now)).toBe(true);
  });
  // F82-3: on a static/ISR page `renderedAt` is the time the cached copy was GENERATED, and Next keeps it for its `revalidate`
  // window; the page passes that window, so a copy within it is as fresh as the server would give.
  it("uses the page's own window for a static/ISR page: a copy younger than the window stays, an older one is revalidated", () => {
    const window = 60_000;
    expect(needsRevalidation(now - 30_000, now, window)).toBe(false);
    expect(needsRevalidation(now - 59_000, now, window)).toBe(false);
    expect(needsRevalidation(now - 61_000, now, window)).toBe(true);
    expect(needsRevalidation(now - 3_600_000, now, window)).toBe(true);
    // the default window (a page rendered per request) is unchanged
    expect(needsRevalidation(now - 30_000, now)).toBe(true);
  });
  it("turns the seconds a static page passes into the client window", () => {
    const html = renderToStaticMarkup(<StaleWhileRevalidate maxAgeSeconds={3600} />);
    expect(html).toBe("");
  });
  it("tolerates a client clock a little behind the server, and revalidates when it is far behind", () => {
    expect(needsRevalidation(now + 1_000, now)).toBe(false);
    expect(needsRevalidation(now + 5_000, now)).toBe(true);
  });
});
