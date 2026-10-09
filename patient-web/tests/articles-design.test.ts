import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "components-next/articles/articles.module.css"), "utf8");
const kit = readFileSync(resolve(process.cwd(), "components-next/articles/article-kit.tsx"), "utf8");
const page = readFileSync(resolve(process.cwd(), "app/[locale]/articles/page.tsx"), "utf8");
const detail = readFileSync(resolve(process.cwd(), "app/[locale]/articles/[slug]/page.tsx"), "utf8");

describe("articles design", () => {
  it("provides an accessible search, category chips with 44 px targets and honest states", () => {
    expect(css).toContain(".search:focus-within");
    expect(css).toContain('.chip[aria-current="true"]');
    expect(css).toContain("min-block-size: 44px");
    expect(kit).toContain('role="search"');
    expect(page).toContain('kind="empty"');
    expect(page).toContain('kind="error"');
  });

  it("keeps external category and title text readable across mixed directions and mirrors the caret", () => {
    expect(kit).toContain('dir="auto"');
    expect(kit).toContain('getDirection(locale) === "rtl" ? "caret-left" : "caret-right"');
  });

  it("uses tokens only: no colour, no inline style, no raw hex in the styles or the pages", () => {
    for (const source of [css, kit, page, detail]) {
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/\bstyle=\{/);
      expect(source).not.toMatch(/rgba?\(/);
    }
  });

  it("has no comment form and no community code left", () => {
    expect(existsSync(resolve(process.cwd(), "components-next/community-comment-form.tsx"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "app/api/community"))).toBe(false);
    expect(detail).not.toMatch(/<textarea|CommentForm|comment-form/i);
  });
});
