import { afterEach, describe, expect, it, vi } from "vitest";
import { MOTION } from "@/lib/motion/motion";
import { flyToBasket } from "@/lib/motion/fly-to-basket";

afterEach(() => vi.unstubAllGlobals());

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height });

describe("labs/radiology/nursing basket flight", () => {
  it("with prefers-reduced-motion nothing is created, flown or popped", () => {
    const animate = vi.fn();
    const timers: Array<() => void> = [];
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }), setTimeout: (fn: () => void) => timers.push(fn) });
    vi.stubGlobal("document", { createElement: vi.fn(), querySelector: () => ({ animate }) });
    flyToBasket({ getBoundingClientRect: () => rect(0, 0, 40, 40) } as unknown as HTMLElement);
    timers.forEach((fn) => fn());
    expect(animate).not.toHaveBeenCalled();
    expect(timers).toHaveLength(0);
  });

  it("copies the pressed button to the basket bar in the flight time, then pops the bar", () => {
    const flights: Array<{ frames: unknown; options: { duration: number } }> = [];
    const bar = { getBoundingClientRect: () => rect(100, 600, 200, 48), animate: vi.fn() };
    const clone = {
      style: {}, setAttribute: vi.fn(), removeAttribute: vi.fn(), remove: vi.fn(),
      animate: (frames: unknown, options: { duration: number }) => { flights.push({ frames, options }); return {}; },
    };
    const appended: unknown[] = [];
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }), setTimeout: (fn: () => void) => fn() });
    vi.stubGlobal("document", { querySelector: (sel: string) => (sel.includes("basket-bar") ? bar : null), body: { appendChild: (n: unknown) => appended.push(n) } });
    const from = { getBoundingClientRect: () => rect(20, 100, 40, 40), cloneNode: () => clone } as unknown as HTMLElement;
    flyToBasket(from);
    expect(appended).toEqual([clone]);
    expect(flights).toHaveLength(1);
    expect(flights[0].options.duration).toBe(MOTION.flight);
    expect(flights[0].options.duration).toBeGreaterThanOrEqual(300);
    expect(flights[0].options.duration).toBeLessThanOrEqual(450);
    expect(clone.setAttribute).toHaveBeenCalledWith("aria-hidden", "true");
    expect(bar.animate).toHaveBeenCalledTimes(1);
    expect((bar.animate.mock.calls[0][1] as { duration: number }).duration).toBe(MOTION.pop);
  });

  it("does nothing when the basket bar is not on the page (and never throws)", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }), setTimeout: (fn: () => void) => fn() });
    vi.stubGlobal("document", { querySelector: () => null });
    expect(() => flyToBasket({ getBoundingClientRect: () => rect(0, 0, 40, 40) } as unknown as HTMLElement)).not.toThrow();
  });
});
