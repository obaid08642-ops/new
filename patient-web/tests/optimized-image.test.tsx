import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { optimizedImageSrc } from "@/lib/media/optimized-image";
import { CatalogImage } from "@/components-next/pharmacy/catalog-image";

describe("P14.20 media through the optimizer", () => {
  it("sends an allowed host's picture through /_next/image, at twice the box (a doctor card's 128 px box -> 256)", () => {
    const src = optimizedImageSrc("https://cdn.nabd.plus/doctors/a.jpg", 128)!;
    expect(src.startsWith("/_next/image?url=")).toBe(true);
    expect(src).toContain(encodeURIComponent("https://cdn.nabd.plus/doctors/a.jpg"));
    expect(src).toMatch(/[?&]w=256\b/);
    expect(src).toMatch(/[?&]q=75\b/);
  });

  it("keeps another host's address as it is, and none as none", () => {
    expect(optimizedImageSrc("https://example.org/a.jpg", 256)).toBe("https://example.org/a.jpg");
    expect(optimizedImageSrc(undefined, 256)).toBeUndefined();
    expect(optimizedImageSrc("", 256)).toBeUndefined();
  });

  it("the LCP picture is announced with a preload in the head, a below-the-fold one is lazy", () => {
    const lcp = renderToStaticMarkup(
      <html><head /><body><CatalogImage src="https://cdn.nabd.plus/p/1.jpg" alt="x" sizes="100vw" className="c" priority /></body></html>,
    );
    expect(lcp).toMatch(/<link rel="preload" as="image"[^>]*imageSrcSet="[^"]*_next\/image/i);
    expect(lcp).toMatch(/fetchPriority="high"/i);
    const lazy = renderToStaticMarkup(<CatalogImage src="https://cdn.nabd.plus/p/2.jpg" alt="y" sizes="76px" className="c" width={76} height={76} />);
    expect(lazy).toContain('loading="lazy"');
    expect(lazy).not.toContain("preload");
  });
});
