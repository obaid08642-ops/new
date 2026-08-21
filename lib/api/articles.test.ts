import { describe, expect, it } from "vitest";
import { articleSlug, parseArticle, parseArticleList } from "./articles";

describe("article response guards", () => {
  it("keeps safe article metadata and drops body/user tracking fields", () => {
    expect(parseArticle({ data: [{ id: "a1", slug: "healthy-reading", title_en: "Healthy", excerpt_en: "Short", category: "Health", body_en: "private html", user_id: "private", views: 99 }] })).toEqual({ id: "a1", slug: "healthy-reading", titleEn: "Healthy", excerptEn: "Short", category: "Health" });
  });
  it("rejects unsafe slugs and ignores malformed rows", () => {
    expect(articleSlug("valid_slug-1")).toBe(true);
    expect(articleSlug("../private")).toBe(false);
    expect(parseArticleList([{ slug: "valid", title_en: "ok" }, { slug: "bad slug" }])).toEqual([{ slug: "valid", titleEn: "ok" }]);
  });
});
