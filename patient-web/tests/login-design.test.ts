import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const formCss = readFileSync(resolve(process.cwd(), "components-next/login-form.module.css"), "utf8");
const pageCss = readFileSync(resolve(process.cwd(), "app/[locale]/login/login.module.css"), "utf8");

describe("patient login design", () => {
  it("keeps an accessible, high-clarity input and submit treatment", () => {
    expect(formCss).toContain("min-block-size: 3.25rem");
    expect(formCss).toContain(".field input:focus");
    expect(formCss).toContain(".submit:focus-visible");
    expect(formCss).toContain("var(--color-danger-surface)");
  });

  it("uses the shared visual tokens and reduced-motion treatment", () => {
    expect(pageCss).toContain("var(--radius-2xl)");
    expect(pageCss).toContain("var(--shadow-lg)");
    expect(formCss).toContain("prefers-reduced-motion: reduce");
  });
});
