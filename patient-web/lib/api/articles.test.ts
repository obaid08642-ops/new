import { describe, expect, it } from "vitest";
import { articleQuery, articleSlug, parseArticle, parseArticleCategories, parseArticleList } from "./articles";

describe("article response guards", () => {
  it("keeps safe article metadata and drops body/user tracking fields", () => {
    expect(parseArticle({ data: [{ id: "a1", slug: "healthy-reading", title_en: "Healthy", excerpt_en: "Short", category: "Health", body_en: "private html", user_id: "private", views: 99 }] })).toEqual({ id: "a1", slug: "healthy-reading", titleEn: "Healthy", excerptEn: "Short", category: "Health" });
  });
  it("bounds GET query inputs and accepts only safe categories", () => {
    expect(articleQuery({ q: "  blood pressure ", category: "cardio & care", page: 2 })).toBe("/articles?limit=20&page=2&q=blood+pressure&category=cardio+%26+care");
    expect(parseArticleCategories(["Health", "", 1, "Mental"])).toEqual(["Health", "Mental"]);
  });
  it("reads the detail endpoint's bare article object (GET /articles/:slug)", () => {
    // the backend answers the detail call with the article itself, not { data: [...] }; reading only lists made
    // every /articles/[slug] page call notFound()
    const detail = { id: "art_1", slug: "healthy-reading", title_ar: "قراءة", status: "PUBLISHED", body_ar: "<p>x</p>", views: 3, published_at: "2026-10-02T17:37:20.560Z" };
    expect(parseArticle(detail)).toEqual({ id: "art_1", slug: "healthy-reading", titleAr: "قراءة", publishedAt: "2026-10-02T17:37:20.560Z" });
    expect(parseArticle({ data: detail })).toEqual({ id: "art_1", slug: "healthy-reading", titleAr: "قراءة", publishedAt: "2026-10-02T17:37:20.560Z" });
    expect(parseArticle({ message: "not found" })).toBeNull();
  });
  it("rejects unsafe slugs and ignores malformed rows", () => {
    expect(articleSlug("valid_slug-1")).toBe(true);
    expect(articleSlug("../private")).toBe(false);
    expect(parseArticleList([{ slug: "valid", title_en: "ok" }, { slug: "bad slug" }])).toEqual([{ slug: "valid", titleEn: "ok" }]);
  });
});
