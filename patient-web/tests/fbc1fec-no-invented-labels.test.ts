// fbc1fec (REVIEW_P13): the neighbourhood doctors page invented labels for
// nameless records ("منشأة معتمدة" / "Verified facility") and a "best doctors"
// claim in its meta description. PRODUCT.md: never fabricate ratings, "best/top"
// claims or placeholder records. Nameless records are skipped, the claim is gone.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(__dirname, "../app/[locale]/doctors/[specialty]/[city]/[neighborhood]/page.tsx"), "utf8");

describe("fbc1fec: neighbourhood page invents nothing", () => {
  it("no placeholder name for a nameless facility or doctor", () => {
    expect(src).not.toMatch(/"منشأة معتمدة"|"Verified facility"|"طبيب معتمد"|"Verified doctor"/);
  });
  it("no invented rating fallback", () => {
    expect(src).not.toMatch(/rating[^\n]*\?\?\s*\d|rating[^\n]*\|\|\s*\d|:\s*4\.9/);
  });
  it("no best/top claim", () => {
    expect(src).not.toMatch(/أفضل أطباء|Best .* doctors|Top .* doctors/);
  });
});
