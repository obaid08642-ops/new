import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CiteThis } from "@/components-next/cite-this";
import { buildCitation, citationAccessDate } from "@/lib/citation";

/**
 * 13.R16: CiteThis is a client component. It must not read the clock while
 * rendering, or the server HTML and the hydrated client differ (hydration
 * mismatch). The access date comes from the server page as a prop.
 */
describe("CiteThis", () => {
  afterEach(() => vi.useRealTimers());

  const props = {
    title: "Heart health", uri: "https://nabd.plus/en/articles/heart", author: "Dr Sara",
    publishedAt: "2025-03-04T10:00:00Z", locale: "en", accessedAt: "2026-10-05",
  };

  it("renders identical markup whatever the clock says (no hydration mismatch)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T23:59:59Z"));
    const server = renderToStaticMarkup(<CiteThis {...props} />);
    vi.setSystemTime(new Date("2031-01-01T00:00:01Z"));
    const client = renderToStaticMarkup(<CiteThis {...props} />);
    expect(client).toBe(server);
    expect(server).toContain("urldate = {2026-10-05}");
    expect(server).toContain("Accessed 10/5/2026.");
  });

  it("formats dates in UTC so the server time zone cannot shift the day", () => {
    const { plain, bibtex } = buildCitation({ ...props, publishedAt: "2025-12-31T23:30:00Z" });
    expect(plain).toContain(", 12/31/2025.");
    expect(bibtex).toContain("year = {2025}");
  });

  it("the server computes the access date once as YYYY-MM-DD", () => {
    expect(citationAccessDate(new Date("2026-10-05T12:00:00Z"))).toBe("2026-10-05");
  });
});
