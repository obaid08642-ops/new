import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./copy-text";

afterEach(() => vi.unstubAllGlobals());

describe("copyText", () => {
  it("sends the exact text to navigator.clipboard and reports true", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("TEST42")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("TEST42");
  });

  it("reports false when the clipboard refuses and there is no fallback", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    vi.stubGlobal("document", undefined);
    await expect(copyText("TEST42")).resolves.toBe(false);
  });

  it("falls back to execCommand when navigator.clipboard is missing, and is honest about its result", async () => {
    const area = { value: "", setAttribute: vi.fn(), style: {} as Record<string, string>, select: vi.fn() };
    const exec = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("document", {
      createElement: () => area,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      execCommand: exec,
    });
    await expect(copyText("TEST42")).resolves.toBe(true);
    expect(area.value).toBe("TEST42");
    expect(exec).toHaveBeenCalledWith("copy");
    exec.mockReturnValue(false);
    await expect(copyText("TEST42")).resolves.toBe(false);
  });

  it("copies nothing for an empty text", async () => {
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("")).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });
});
