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
  it("tolerates a client clock a little behind the server, and revalidates when it is far behind", () => {
    expect(needsRevalidation(now + 1_000, now)).toBe(false);
    expect(needsRevalidation(now + 5_000, now)).toBe(true);
  });
});
