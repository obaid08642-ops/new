import { describe, expect, it } from "vitest";
import { articleTitle, parseMaternityContent, pickWeekText } from "./week";

const answer = {
  week: 12,
  week_content: { week: 12, size_ar: "بحجم الليمونة", size_en: "About the size of a lime", development_ar: "نص عربي", development_en: "", image_url: "https://cdn.nabd.plus/weeks/12.jpg", updated_at: "2026-10-01T00:00:00.000Z" },
  read_this_week: [{ id: "a1", slug: "week-12", title_ar: "مقال", title_en: "Article" }, { slug: "bad slug", title_ar: "x" }, { slug: "untitled" }],
};

describe("maternity week content", () => {
  it("reads the week entry in the page language with the other language as fallback", () => {
    const en = parseMaternityContent(answer, "en");
    expect(en.entry).toEqual({ week: 12, size: "About the size of a lime", development: "نص عربي", image: "https://cdn.nabd.plus/weeks/12.jpg" });
    expect(parseMaternityContent({ data: answer }, "ar").entry?.size).toBe("بحجم الليمونة");
    expect(parseMaternityContent(answer, "ur").entry?.size).toBe("About the size of a lime");
  });

  it("keeps only valid article rows and titles them by language", () => {
    const view = parseMaternityContent(answer, "ar");
    expect(view.articles.map((a) => a.slug)).toEqual(["week-12"]);
    expect(articleTitle("ar", view.articles[0]!)).toBe("مقال");
    expect(articleTitle("hi", view.articles[0]!)).toBe("Article");
  });

  it("drops an image that is not https on the CDN and an entry without its texts", () => {
    expect(parseMaternityContent({ ...answer, week_content: { ...answer.week_content, image_url: "http://cdn.nabd.plus/x.jpg" } }, "en").entry?.image).toBeNull();
    expect(parseMaternityContent({ ...answer, week_content: { ...answer.week_content, image_url: "https://evil.example/x.jpg" } }, "en").entry?.image).toBeNull();
    expect(parseMaternityContent({ ...answer, week_content: { week: 12, size_ar: "", development_ar: "" } }, "ar").entry).toBeNull();
  });

  it("answers an honest empty view for an unfilled week, no week or a malformed answer", () => {
    expect(parseMaternityContent({ week: 30, week_content: null, read_this_week: [] }, "ar")).toEqual({ week: 30, entry: null, articles: [] });
    expect(parseMaternityContent({ week: null, week_content: null, read_this_week: [{ slug: "x", title_ar: "x" }] }, "ar")).toEqual({ week: null, entry: null, articles: [] });
    expect(parseMaternityContent(null, "ar")).toEqual({ week: null, entry: null, articles: [] });
    expect(pickWeekText("ar", " ", null)).toBeNull();
  });
});
