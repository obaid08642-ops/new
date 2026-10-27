import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(f, "utf8");
const msg = (l: string) => JSON.parse(read(`messages/${l}.json`)) as { OrderingFlow: Record<string, string> };

describe("render check fixes of the labs hub (2026-10-27)", () => {
  it("the phone header gives the title its own line when the results button is there", () => {
    expect(read("components-next/core/core-shell.tsx")).toContain("styles.barDense");
    expect(read("components-next/core/core-shell.tsx")).toContain("styles.toolsStart");
    expect(read("components-next/core/core.module.css")).toMatch(/\.barDense \.phoneTitle \{[^}]*flex: 1 1 100%/);
  });
  it("the single-item basket has no Add more link", () => {
    expect(read("components-next/ordering/basket-client.tsx")).toContain('isSingle ? null : <Link href={hubHref} className={styles.linkBtn}>{t("addMore")}</Link>');
  });
  it("counts of items and providers have plural forms in en, ar and ur", () => {
    for (const l of ["en", "ar", "ur"]) {
      const o = msg(l).OrderingFlow;
      for (const k of ["gHome", "matchBasket", "gCentre", "splitItems", "whenTabHome", "altCentre"]) expect(o[k], `${l}.${k}`).toContain("plural");
    }
  });
});
