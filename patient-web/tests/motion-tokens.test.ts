import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MOTION } from "@/lib/motion/motion";

const tokens = JSON.parse(readFileSync(resolve(process.cwd(), "../packages/design-tokens/tokens.json"), "utf8")).motion;
const ms = (value: string) => Number.parseInt(value, 10);

describe("the motion values a script uses are the design tokens", () => {
  it("press, enter, enterMax and the easing repeat motion.* of the tokens", () => {
    expect(MOTION.press).toBe(ms(tokens.duration.press));
    expect(MOTION.pop).toBe(ms(tokens.duration.enter));
    expect(MOTION.toast).toBe(ms(tokens.duration.enterMax));
    expect(MOTION.ease).toBe(tokens.easing.enter);
  });
  it("the flight stays inside the owner's 300 to 450 ms", () => {
    expect(MOTION.flight).toBeGreaterThanOrEqual(300);
    expect(MOTION.flight).toBeLessThanOrEqual(450);
  });
});
