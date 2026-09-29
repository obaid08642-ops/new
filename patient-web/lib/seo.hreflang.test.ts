import { describe, expect, it } from "vitest";
import { escXml, hreflangLinksPerLocale } from "@/lib/seo";

describe("sitemap hreflang", () => {
  it("escapes quotes and angle brackets in attribute values", () => {
    expect(escXml(`a"b'c<d>&`)).toBe("a&quot;b&apos;c&lt;d&gt;&amp;");
  });

  it("emits each locale's own URL plus x-default, and never a raw quote inside href", () => {
    const xml = hreflangLinksPerLocale((l) => (l === "ar" ? `/p/ar-x"y` : `/p/${l}-x`));
    expect(xml).toContain('hreflang="en" href="');
    expect(xml).toContain("/en/p/en-x");
    expect(xml).toContain('hreflang="x-default"');
    for (const href of xml.match(/href="([^"]*)"/g) || []) expect(href.slice(6, -1)).not.toContain('"');
  });
});
