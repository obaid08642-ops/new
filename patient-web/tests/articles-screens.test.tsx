import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({ list: vi.fn(), categories: vi.fn(), article: vi.fn(), bookmarks: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
  notFound: () => { throw new Error("not-found"); },
}));
vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return { useTranslations: (namespace?: string) => actual.createTranslator({ locale: "en", messages: messages as never, namespace: namespace as never, onError: (error) => { throw error; } }), useLocale: () => "en" };
});
vi.mock("next-intl/server", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return {
    getTranslations: async (arg: string | { locale?: string; namespace?: string }) =>
      actual.createTranslator({ locale: "en", messages: messages as never, namespace: (typeof arg === "string" ? arg : arg.namespace) as never, onError: (error) => { throw error; } }),
    setRequestLocale: vi.fn(),
  };
});
vi.mock("@/components-next/core/core-shell", () => ({
  CoreShell: ({ children, title, backHref }: { children: ReactNode; title?: string; backHref?: string }) => <div data-shell data-title={title} data-back={backHref}>{children}</div>,
}));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-article-token" }));
vi.mock("@/lib/api/articles-server", () => ({
  getPublicArticles: server.list,
  getPublicArticleCategories: server.categories,
  getPublicArticle: server.article,
  getPatientArticleBookmarks: server.bookmarks,
}));

import ArticlesPage from "@/app/[locale]/articles/page";
import ArticlePage from "@/app/[locale]/articles/[slug]/page";
import BookmarksRedirect from "@/app/[locale]/articles/bookmarks/page";
import CommunityRedirect from "@/app/[locale]/community/page";
import CommunityPostRedirect from "@/app/[locale]/community/[postId]/page";
import { extractSearchResults } from "@/lib/api/search";

const render = (node: ReactNode) => renderToStaticMarkup(node);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const page = (query: Record<string, string> = {}) => ({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve(query) });

/**
 * Batch 10: the articles list (tabs All and Saved in `?tab=`), the article detail and the removal of the community. Every value is a
 * TEST value. What is proved: All lists the public articles with the search and the categories and says so when there is nothing;
 * Saved reads the bookmarks with the patient's token; the author is text (the article has no doctor id, so no profile or booking link)
 * and there is no comment form; the old bookmarks and community routes redirect; a community search result is not drawn.
 */
const first = { id: "a1", slug: "healthy-sleep", title_en: "Healthy sleep", title_ar: "نوم صحي", excerpt_en: "How to sleep well", category: "Wellness", author_name: "Dr Test", author_title: "Internist", published_at: "2026-09-20T09:00:00Z" };

beforeEach(() => {
  server.list.mockReset();
  server.categories.mockReset();
  server.article.mockReset();
  server.bookmarks.mockReset();
  server.categories.mockResolvedValue(json(["Wellness", "Nutrition"]));
});

describe("the articles list", () => {
  it("lists the public articles with the tabs, the search and the categories", async () => {
    server.list.mockResolvedValue(json({ data: [first] }));
    const html = render(await ArticlesPage(page({ category: "Wellness", q: "sleep" })));
    expect(server.list).toHaveBeenCalledWith({ q: "sleep", category: "Wellness" });
    expect(html).toContain("Healthy sleep");
    expect(html).toContain("/en/articles/healthy-sleep");
    expect(html).toContain("/en/articles?tab=all");
    expect(html).toContain("/en/articles?tab=saved");
    expect(html).toContain('name="q"');
    expect(html).toContain('name="category" value="Wellness"');
    expect(html).toContain("/en/articles?category=Nutrition");
    expect(html).toContain('data-back="/en"');
  });

  it("says so when nothing matches and when the backend is down", async () => {
    server.list.mockResolvedValue(json([]));
    expect(render(await ArticlesPage(page({ q: "zzz" })))).toContain("No matching articles");
    expect(render(await ArticlesPage(page()))).toContain("No published articles are available.");
    server.list.mockResolvedValue(json({}, 503));
    expect(render(await ArticlesPage(page()))).toContain("Unable to load articles");
  });

  it("ignores a tab the screen does not have", async () => {
    server.list.mockResolvedValue(json([first]));
    expect(render(await ArticlesPage(page({ tab: "bogus" })))).toContain("Healthy sleep");
  });
});

describe("the Saved tab", () => {
  it("reads the bookmarks with the patient's token and lists them", async () => {
    server.bookmarks.mockResolvedValue(json([first]));
    const html = render(await ArticlesPage(page({ tab: "saved" })));
    expect(server.bookmarks).toHaveBeenCalledWith("server-only-article-token");
    expect(server.list).not.toHaveBeenCalled();
    expect(html).toContain("Healthy sleep");
    expect(html).not.toContain("server-only-article-token");
  });

  it("has an empty state that points to the list, and sends a signed-out reader to the login", async () => {
    server.bookmarks.mockResolvedValue(json([]));
    const html = render(await ArticlesPage(page({ tab: "saved" })));
    expect(html).toContain("No saved articles");
    expect(html).toContain("Articles you save in the app appear here.");
    server.bookmarks.mockResolvedValue(json({}, 401));
    await expect(ArticlesPage(page({ tab: "saved" }))).rejects.toThrow("redirect:/en/login");
  });
});

describe("the article", () => {
  it("draws the category, the author as text, the date and the summary, with no comment form and no profile link", async () => {
    server.article.mockResolvedValue(json(first));
    const html = render(await ArticlePage({ params: Promise.resolve({ locale: "en", slug: "healthy-sleep" }) }));
    expect(html).toContain("Healthy sleep");
    expect(html).toContain("Dr Test — Internist");
    expect(html).toContain("Wellness");
    expect(html).toContain("How to sleep well");
    expect(html).toContain("/en/articles");
    expect(html).not.toMatch(/<textarea|comment/i);
    expect(html).not.toContain("/consultations/doctors");
  });

  it("is a not-found for an article the server does not have", async () => {
    server.article.mockResolvedValue(json({}, 404));
    await expect(ArticlePage({ params: Promise.resolve({ locale: "en", slug: "gone" }) })).rejects.toThrow("not-found");
  });
});

describe("redirects and the removed community", () => {
  it("sends the old bookmarks page to the Saved tab and the community pages to the articles", async () => {
    await expect(BookmarksRedirect({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("redirect:/en/articles?tab=saved");
    await expect(CommunityRedirect({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("redirect:/en/articles");
    await expect(CommunityPostRedirect({ params: Promise.resolve({ locale: "en", postId: "p1" }) })).rejects.toThrow("redirect:/en/articles");
  });

  it("does not draw a community result of the search answer", () => {
    const rows = extractSearchResults([
      { id: "c1", type: "مجتمع", typeEn: "Community", name: "منشور", nameEn: "Post" },
      { id: "a1", type: "مقال", typeEn: "Article", name: "مقال", nameEn: "Article" },
    ], "en");
    expect(rows.map((row) => row.id)).toEqual(["a1"]);
  });
});
