import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { SiteNotice } from "@/components-next/site-notice/site-notice";
import { getSiteNoticeEnabled } from "@/lib/api/public-config-server";

const answer = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

afterEach(() => { vi.unstubAllGlobals(); });

describe("site notice (owner request 2026-11-03)", () => {
  it("renders the text as a plain note that blocks nothing", () => {
    const html = renderToStaticMarkup(<SiteNotice text="Under construction" />);
    expect(html).toContain(">Under construction</div>");
    expect(html).toContain('role="note"');
    expect(html).not.toMatch(/<(button|a|input)\b/);
  });

  it("is ON by default and only the flag set to false switches it off", async () => {
    vi.stubGlobal("fetch", answer({ features: {} }));
    expect(await getSiteNoticeEnabled()).toBe(true);
    vi.stubGlobal("fetch", answer({ features: { site_notice_enabled: true } }));
    expect(await getSiteNoticeEnabled()).toBe(true);
    vi.stubGlobal("fetch", answer({ features: { site_notice_enabled: false } }));
    expect(await getSiteNoticeEnabled()).toBe(false);
  });

  it("stays ON when the config cannot be read", async () => {
    vi.stubGlobal("fetch", answer({}, 503));
    expect(await getSiteNoticeEnabled()).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await getSiteNoticeEnabled()).toBe(true);
  });

  it("has the text in all six languages and uses only action tokens for colour", () => {
    for (const l of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      const m = JSON.parse(readFileSync(`messages/${l}.json`, "utf8")) as { Shared: { siteNotice?: string } };
      expect(m.Shared.siteNotice && m.Shared.siteNotice.length > 20).toBe(true);
    }
    const css = readFileSync("components-next/site-notice/site-notice.css", "utf8");
    expect(css).toContain("--nabd-color-action-primary-bg");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
  });
});
