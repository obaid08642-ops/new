import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PulseShieldMark } from "../components-next/pulse-shield-mark";

describe("premium Nabd brand assets", () => {
  it("renders a scalable pulse-and-shield vector without embedded text", () => {
    const markup = renderToStaticMarkup(createElement(PulseShieldMark, { decorative: true }));
    expect(markup).toContain("viewBox=\"0 0 32 32\"");
    expect(markup).toContain("<path");
    expect(markup).not.toContain("<text");
  });

  it("uses the shared vector mark in the protected patient dashboard", () => {
    const page = readFileSync(resolve(process.cwd(), "app/[locale]/dashboard/page.tsx"), "utf8");
    expect(page).toContain('from "@/components-next/pulse-shield-mark"');
    expect(page).toContain("<PulseShieldMark decorative />");
  });
});
