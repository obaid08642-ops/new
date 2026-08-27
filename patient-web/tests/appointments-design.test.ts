import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/appointments/appointments.module.css"), "utf8");

describe("appointments design", () => {
  it("keeps an accessible care-card hierarchy and truthful empty state", () => {
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
    expect(css).toContain(".card:focus-visible");
    expect(css).toContain("minmax(17rem, 1fr)");
  });

  it("limits hover motion to appropriate pointers and honours reduced motion", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
