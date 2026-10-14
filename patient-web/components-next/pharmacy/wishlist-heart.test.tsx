import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { WishlistHeart } from "./wishlist-heart";

describe("WishlistHeart", () => {
  it("draws one button whose label says what a press does, with no error before anything was pressed", () => {
    const html = renderToStaticMarkup(<WishlistHeart itemId="med-1" locale="en" />);
    expect(html).toContain('aria-label="wishlistAdd"');
    expect(html).not.toContain("wishlistError");
    expect(html.match(/<button/g)?.length).toBe(1);
  });
});
