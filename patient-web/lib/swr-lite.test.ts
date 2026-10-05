import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { clearSwr, peekSwr, putSwr } from "./swr-lite";

describe("swr-lite", () => {
  beforeEach(() => clearSwr());

  it("returns the last stored value for a key and nothing for an unknown key", () => {
    expect(peekSwr("/api/patient/providers/map?radius=25")).toBeUndefined();
    putSwr("/api/patient/providers/map?radius=25", [{ id: "1" }]);
    expect(peekSwr("/api/patient/providers/map?radius=25")).toEqual([{ id: "1" }]);
    putSwr("/api/patient/providers/map?radius=25", [{ id: "2" }]);
    expect(peekSwr<Array<{ id: string }>>("/api/patient/providers/map?radius=25")?.[0].id).toBe("2");
  });

  it("clearSwr empties it (sign-out)", () => {
    putSwr("k", 1);
    clearSwr();
    expect(peekSwr("k")).toBeUndefined();
  });

  it("holds memory only: no browser storage, no cookie", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/swr-lite.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
  });

  it("sign-out clears it", () => {
    expect(readFileSync(resolve(process.cwd(), "components-next/session-actions.tsx"), "utf8")).toContain("clearSwr()");
  });
});
