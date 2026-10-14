import { describe, expect, it, vi } from "vitest";
import { shareOrCopy } from "./share";

const data = { title: "Offer", url: "https://example.test/en/offers/1" };

describe("sharing a page", () => {
  it("uses the share sheet when the browser has one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const copy = vi.fn();
    expect(await shareOrCopy(data, { share, copy })).toBe("shared");
    expect(share).toHaveBeenCalledWith(data);
    expect(copy).not.toHaveBeenCalled();
  });

  it("closing the sheet is not an error and copies nothing", async () => {
    const copy = vi.fn();
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("closed"), { name: "AbortError" }));
    expect(await shareOrCopy(data, { share, copy })).toBe("cancelled");
    expect(copy).not.toHaveBeenCalled();
  });

  it("copies the link when there is no share sheet, and says so only when the copy worked", async () => {
    expect(await shareOrCopy(data, { share: undefined, copy: vi.fn().mockResolvedValue(true) })).toBe("copied");
    expect(await shareOrCopy(data, { share: undefined, copy: vi.fn().mockResolvedValue(false) })).toBe("failed");
  });

  it("a share sheet that errors falls back to the copy", async () => {
    const copy = vi.fn().mockResolvedValue(true);
    expect(await shareOrCopy(data, { share: vi.fn().mockRejectedValue(new TypeError("not allowed")), copy })).toBe("copied");
    expect(copy).toHaveBeenCalledWith(data.url);
  });
});
