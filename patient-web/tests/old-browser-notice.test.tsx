import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

import { OldBrowserNotice } from "../components-next/old-browser-notice";

/**
 * P15.10 — older devices get a clear message instead of a broken app.
 * The verdict matrix lives in lib/device-support.test.ts; here: the notice
 * never flashes during SSR (there is no navigator there — a server/client
 * mismatch would show it to everyone), and the live-UA wiring is pinned by
 * source assertion, the same technique login-form.test.tsx uses.
 */

describe("P15.10 — old-browser notice", () => {
  it("renders nothing on the server, so supported browsers never see a flash", () => {
    expect(renderToStaticMarkup(<OldBrowserNotice />)).toBe("");
  });

  it("reads the live user agent and gates on the verdict after mount", () => {
    const source = readFileSync(resolve(process.cwd(), "components-next/old-browser-notice.tsx"), "utf8");
    expect(source).toContain("navigator.userAgent");
    expect(source).toContain("isSupportedBrowser(navigator.userAgent).supported");
    expect(source).toContain("oldBrowser.title");
    expect(source).toContain("oldBrowser.body");
  });
});
