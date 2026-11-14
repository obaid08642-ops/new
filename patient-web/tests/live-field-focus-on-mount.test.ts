import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The three "live" search fields replace a plain field on its first focus (hero-search, suggest-input, catalog-search). The replacement takes focus when it mounts.
 * In a passive effect that happens after the paint: a key pressed between the removal of the old input and that focus goes to <body> and is lost (live gate #2480
 * shard 4: typing "بر" sent q=ر). A layout effect focuses in the same task as the commit, so no key event can come in between. This pins the choice (no DOM test
 * library here): the focus must be in useLayoutEffect, and these files must not use a passive effect for it.
 */
const FILES = [
  "components-next/home/hero-search-live.tsx",
  "components-next/search/suggest-input-live.tsx",
  "components-next/pharmacy/catalog-search-live.tsx",
];

describe("live search fields take focus in a layout effect", () => {
  for (const file of FILES) {
    it(file, () => {
      const src = readFileSync(file, "utf8");
      const code = src.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
      expect(code).toMatch(/useLayoutEffect\(\(\) => \{[\s\S]*?\.focus\(\)/);
      expect(code.replace(/useLayoutEffect/g, "")).not.toMatch(/useEffect/);
    });
  }
});
