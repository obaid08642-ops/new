import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import { redirectKeepingQuery } from "./redirect-keep-query";

describe("redirectKeepingQuery", () => {
  it("keeps the query and sets the tab", () => {
    expect(() => redirectKeepingQuery("/ar/maternity", { ref: "n1", tab: "old" }, { tab: "baby" })).toThrow("redirect:/ar/maternity?ref=n1&tab=baby");
  });

  it("keeps repeated values and goes bare without a query", () => {
    expect(() => redirectKeepingQuery("/ar/mental-health", { a: ["1", "2"], b: undefined })).toThrow("redirect:/ar/mental-health?a=1&a=2");
    expect(() => redirectKeepingQuery("/ar/mental-health", {})).toThrow("redirect:/ar/mental-health");
  });
});
