import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viteServerSource = readFileSync(resolve(process.cwd(), "server/_core/vite.ts"), "utf8");

describe("Express 5 fallback routing", () => {
  it("uses regular-expression fallbacks instead of the legacy star route", () => {
    expect(viteServerSource).toContain("app.use(/.*/");
    expect(viteServerSource).not.toContain('app.use("*"');
  });
});
