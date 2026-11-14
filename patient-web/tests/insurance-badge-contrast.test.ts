import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The status badge is micro-size text, so WCAG 2.1 AA asks for 4.5:1 in both themes (the walkthrough's axe run of issue 1830 flagged it).
const tokens = readFileSync(join(__dirname, "../../packages/design-tokens/dist/css/tokens.css"), "utf8");
const css = readFileSync(join(__dirname, "../components-next/insurance/insurance.module.css"), "utf8");
const darkAt = tokens.indexOf('[data-theme="dark"]');
const themes = { light: tokens.slice(0, darkAt), dark: tokens.slice(darkAt) };

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
// A token is an opaque hex, or an rgba laid over the surface the badge sits on (the dark status backgrounds are 14% tints).
const hex = (theme: "light" | "dark", name: string): string => {
  const read = (source: string) => new RegExp(`--nabd-color-${name}:\\s*([^;]+);`).exec(source)?.[1]?.trim();
  const value = read(themes[theme]) ?? read(themes.light);
  if (!value) throw new Error(`no token ${name}`);
  if (value.startsWith("#")) return value;
  const m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(value);
  if (!m) throw new Error(`unreadable token ${name}: ${value}`);
  const under = rgb(hex(theme, "bg-surface"));
  const a = Number(m[4]);
  return toHex([0, 1, 2].map((i) => Number(m[i + 1]) * a + under[i] * (1 - a)));
};
const luminance = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const rule = (selector: string) => {
  const m = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(css);
  if (!m) throw new Error(`no rule ${selector}`);
  return { bg: /background:\s*var\(--nabd-color-([a-z-]+)\)/.exec(m[1])?.[1], fg: /(?<![-\w])color:\s*var\(--nabd-color-([a-z-]+)\)/.exec(m[1])?.[1] };
};

describe("insurance status badge contrast", () => {
  for (const selector of [".badge", ".badgeGood", ".badgeWait", ".badgeBad"]) {
    for (const theme of ["light", "dark"] as const) {
      it(`${selector} is at least 4.5:1 in the ${theme} theme`, () => {
        const base = rule(".badge");
        const { bg, fg } = rule(selector);
        const background = bg ?? base.bg!;
        const foreground = fg ?? base.fg!;
        expect(ratio(hex(theme, foreground), hex(theme, background))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
