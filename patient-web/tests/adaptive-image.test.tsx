import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const connectionState = vi.hoisted(() => ({ slow: false }));

vi.mock("@/lib/api/net/connection", () => ({
  getConnectionQuality: () => ({ effectiveType: connectionState.slow ? "2g" : "4g", saveData: false, slow: connectionState.slow, rttMs: null }),
  imageQualityFor: (quality: { slow: boolean }) => (quality.slow ? 50 : 75),
  subscribeConnection: () => () => {},
}));
// next/image in this node environment never reads next.config.ts, so its
// default config ([75]) would swallow any other quality and the test could not
// observe the selection. The stub renders quality transparently; the real
// next/image path is covered by production config (qualities: [50, 75]) plus
// the passthrough assertions below.
vi.mock("next/image", () => ({
  default: ({ quality, ...rest }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-quality={quality as number} {...(rest as Record<string, unknown>)} />
  ),
}));

/**
 * P15.4 — lower image quality on slow networks. The wrapper passes every
 * next/image prop through untouched; only `quality` is decided, unless the
 * caller overrides it explicitly.
 */

beforeEach(() => {
  connectionState.slow = false;
  vi.resetModules();
});

async function renderAdaptiveImage(props: Record<string, unknown> = {}) {
  const { AdaptiveImage } = await import("../components-next/network/adaptive-image");
  return renderToStaticMarkup(
    <AdaptiveImage src="https://cdn.nabd.plus/p.jpg" alt="product" width={56} height={56} {...props} />,
  );
}

describe("P15.4 — adaptive image quality", () => {
  it("requests full quality on a fast link", async () => {
    connectionState.slow = false;
    const html = await renderAdaptiveImage();
    expect(html).toContain('data-quality="75"');
  });

  it("downgrades quality on a slow link", async () => {
    connectionState.slow = true;
    const html = await renderAdaptiveImage();
    expect(html).toContain('data-quality="50"');
  });

  it("lets an explicit caller quality win over the connection", async () => {
    connectionState.slow = true;
    const html = await renderAdaptiveImage({ quality: 90 });
    expect(html).toContain('data-quality="90"');
  });

  it("passes alt text and dimensions through untouched", async () => {
    const html = await renderAdaptiveImage();
    expect(html).toContain('alt="product"');
    expect(html).toContain('width="56"');
    expect(html).toContain('src="https://cdn.nabd.plus/p.jpg"');
  });
});
