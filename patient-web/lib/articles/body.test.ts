import { describe, expect, it } from "vitest";
import { articleBlocks, articleBodyHtml } from "./body";

describe("article body (10-web#2)", () => {
  it("reads headings, paragraphs and list items as plain text", () => {
    const html = "<h2>النوم</h2><p>نم <strong>ثماني</strong> ساعات &amp; اشرب الماء.</p><ul><li>أولاً</li><li>ثانياً</li></ul><p>سطر<br>وسطر</p>";
    expect(articleBlocks(html)).toEqual([
      { kind: "h2", text: "النوم" },
      { kind: "p", text: "نم ثماني ساعات & اشرب الماء." },
      { kind: "li", text: "أولاً" },
      { kind: "li", text: "ثانياً" },
      { kind: "p", text: "سطر" },
      { kind: "p", text: "وسطر" },
    ]);
  });

  it("drops scripts, styles, frames, handlers and links' markup; nothing stays HTML", () => {
    const html = '<p onclick="steal()">Hi<script>alert(1)</script><style>p{}</style><iframe src="x"></iframe> <a href="javascript:x">there</a><img src=x onerror=alert(1)></p>';
    const blocks = articleBlocks(html);
    expect(blocks).toEqual([{ kind: "p", text: "Hi there" }]);
    expect(JSON.stringify(blocks)).not.toMatch(/script|alert|onerror|onclick|javascript|</);
  });

  it("inline tags take no space of their own (a full stop stays against its word)", () => {
    expect(articleBlocks("<p>نم ثماني ساعات <strong>كل ليلة</strong>.</p>")).toEqual([{ kind: "p", text: "نم ثماني ساعات كل ليلة." }]);
  });

  it("drops a script whose end tag has attributes, a comment closed by --!>, and broken tags", () => {
    expect(articleBlocks("<p>a</p><script>alert(1)</script foo><p>b</p>")).toEqual([{ kind: "p", text: "a" }, { kind: "p", text: "b" }]);
    expect(articleBlocks("<p>a<!-- hidden --!>b</p>")).toEqual([{ kind: "p", text: "ab" }]);
    expect(articleBlocks("<p><scr<b>ipt>x</p>").every((b) => !b.text.includes("<") && !b.text.includes(">"))).toBe(true);
  });

  it("chooses the body in the page language, with the other as the fallback", () => {
    const row = { slug: "a", body_ar: "<p>عربي</p>", body_en: "<p>English</p>" };
    expect(articleBodyHtml(row, "ar")).toBe("<p>عربي</p>");
    expect(articleBodyHtml({ data: row }, "en")).toBe("<p>English</p>");
    expect(articleBodyHtml({ slug: "a", body_ar: "<p>عربي</p>" }, "ur")).toBe("<p>عربي</p>");
    expect(articleBlocks(undefined)).toEqual([]);
  });
});
