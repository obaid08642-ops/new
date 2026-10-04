import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const onlineState = vi.hoisted(() => ({ online: true }));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/lib/api/net/online", () => ({
  getOnlineSnapshot: () => onlineState.online,
  subscribeOnline: () => () => {},
}));

/**
 * P15.4 — cached data stays visible offline, with an "offline" banner and a
 * "last updated" time. The timestamp is the network layer's last settled
 * response (15.1), so it survives the outage it describes.
 *
 * Each test re-imports the modules fresh (vi.resetModules) because last-sync
 * is process-wide module state — without isolation, one test's markSynced
 * would leak into the next.
 */

beforeEach(() => {
  onlineState.online = true;
  vi.resetModules();
});

async function renderBanner() {
  const { OfflineBanner } = await import("../components-next/network/offline-banner");
  return renderToStaticMarkup(<OfflineBanner />);
}

describe("P15.4 — offline banner", () => {
  it("renders nothing while online", async () => {
    onlineState.online = true;
    expect(await renderBanner()).toBe("");
  });

  it("renders the offline banner with the last-updated time when offline", async () => {
    onlineState.online = false;
    const { markSynced } = await import("../lib/api/net/last-sync");
    // 2026-10-01T12:00:00Z — a fixed instant, so the assertion is exact.
    markSynced(Date.parse("2026-10-01T12:00:00.000Z"));
    const html = await renderBanner();
    expect(html).toContain('role="status"');
    expect(html).toContain("banner.offline");
    expect(html).toContain("lastUpdated");
    expect(html).toContain('dateTime="2026-10-01T12:00:00.000Z"');
    // The banner formats the synced instant (not Date.now()) in the page locale.
    const expected = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date("2026-10-01T12:00:00.000Z"),
    );
    expect(html).toContain(expected);
  });

  it("renders the banner even when nothing has ever synced", async () => {
    onlineState.online = false;
    const html = await renderBanner();
    expect(html).toContain('role="status"');
    expect(html).toContain("banner.offline");
    expect(html).not.toContain("lastUpdated");
  });
});
