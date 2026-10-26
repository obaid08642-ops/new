import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { countUpValue } from "@/components-next/motion/count-up";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("the shared motion rules are off with reduced motion", () => {
  const css = read("app/motion.css");
  it("every animation and transition sits inside the no-preference media query", () => {
    const outside = css.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}\n/, "");
    // what is left outside is only @keyframes (they run only when a rule inside the query uses them)
    expect(outside.replace(/@keyframes[^{]+\{[\s\S]*?\n\}/g, "")).not.toMatch(/animation\s*:|transition\s*:/);
  });
  it("covers press feedback (0.97), the skeleton shimmer, the empty-state fade and the success check", () => {
    expect(css).toContain("scale(0.97)");
    expect(css).toContain("nabd-shimmer");
    expect(css).toContain("nabd-fade-in");
    expect(css).toContain("nabd-check-pop");
  });
  it("the durations and the easing are the design tokens, not numbers of its own", () => {
    expect(css).toContain("var(--nabd-motion-duration-press)");
    expect(css).toContain("var(--nabd-motion-duration-skeleton)");
    expect(css).toContain("var(--nabd-motion-duration-enterMax)");
    expect(css).toContain("var(--nabd-motion-easing-enter)");
    expect(css).not.toMatch(/\d+ms/);
  });
});

describe("lists stagger and a picked slot pops", () => {
  const css = read("app/motion.css");
  it("each row waits one token step (stagger.min) more than the one before, up to a cap", () => {
    expect(css).toContain("var(--nabd-motion-stagger-min) * 1");
    expect(css).toContain("var(--nabd-motion-stagger-min) * 7");
    expect(css).toMatch(/nth-child\(n \+ 9\)/);
  });
  it("the nursing catalogue list and the booking slot buttons carry the hooks the CSS uses", () => {
    expect(read("components-next/nursing/nursing-parts.tsx")).toContain("data-stagger");
    expect(read("components-next/appointment-booking-form.tsx")).toContain("data-slot-chip");
    expect(read("components-next/appointment-booking-form.tsx")).toContain("nabd-pop-in");
  });
});

describe("the product page's sections open and close smoothly", () => {
  const css = read("components-next/pharmacy/product-detail.module.css");
  it("animate the row height, leave the accessibility tree when closed, and do not move with reduced motion", () => {
    expect(css).toContain("grid-template-rows: 0fr");
    expect(css).toMatch(/\.section\[data-open="false"\] \.sectionBody \{[^}]*visibility: hidden/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.sectionBody[^}]*transition: none/);
  });
});

describe("the cart total counts up", () => {
  it("eases from the old value to the new one and ends exactly on it", () => {
    expect(countUpValue(2, 10, 0)).toBe(2);
    expect(countUpValue(2, 10, 1)).toBe(10);
    const mid = countUpValue(2, 10, 0.5);
    expect(mid).toBeGreaterThan(2);
    expect(mid).toBeLessThan(10);
    expect(countUpValue(10, 3, 1)).toBe(3);
    expect(countUpValue(2, 10, 5)).toBe(10); // past the end stays on the end
  });
});
