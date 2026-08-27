import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicMedicines } from "./public-medicines-server";

describe("public medicine server", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("converts a public upstream network failure into a null result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect timeout")));
    await expect(getPublicMedicines({ page: 1 })).resolves.toBeNull();
  });
});
