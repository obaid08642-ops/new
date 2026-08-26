import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appointmentCss = readFileSync(resolve(process.cwd(), "app/[locale]/appointments/[appointmentId]/appointment-detail.module.css"), "utf8");
const diagnosticCss = readFileSync(resolve(process.cwd(), "app/[locale]/diagnostics/[domain]/[bookingId]/diagnostic-detail.module.css"), "utf8");

describe("care-detail design", () => {
  it.each([appointmentCss, diagnosticCss])("provides accessible, responsive information surfaces", (css) => {
    expect(css).toContain(".back:focus-visible");
    expect(css).toContain("repeat(2, minmax(0, 1fr))");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it.each([appointmentCss, diagnosticCss])("limits motion to fine pointers and honours user preference", (css) => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
