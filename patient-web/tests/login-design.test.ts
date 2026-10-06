import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The sign-in family's sheet (boards Login, Register, Otp, Welcome, AuthWeb).
const css = readFileSync(resolve(process.cwd(), "components-next/auth/auth.module.css"), "utf8");

describe("patient sign-in design", () => {
  it("keeps an accessible, high-clarity field and error treatment", () => {
    expect(css).toContain("block-size: 56px"); // the boards' field height, above the 44 target
    expect(css).toContain(".control:focus-within"); // a visible focus state on every field
    expect(css).toContain("var(--nabd-color-status-danger-bg)");
  });

  it("uses tokens only, logical properties and the reduced-motion treatment", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/(?:^|[\s;{])(?:left|right|margin-left|margin-right|padding-left|padding-right)\s*:/);
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("draws no decorative shapes behind the form (plain canvas, owner 2026-10-05)", () => {
    expect(css).not.toMatch(/radial-gradient|::before\s*\{[^}]*border-radius: 50%/);
  });
});
