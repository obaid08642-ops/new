import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let identity: { status: string; id?: string; isGuest?: boolean } = { status: "anonymous" };
vi.mock("@/lib/auth/session-identity", () => ({ getSessionIdentity: () => Promise.resolve(identity) }));
// no DOM here: the effects run at once during a server render, which is enough to see which requests they make
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), useEffect: (effect: () => void) => { effect(); } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { WishlistHeart } from "@/components-next/pharmacy/wishlist-heart";
import { SaveArticleButton } from "@/components-next/articles/save-article-button";

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response("[]", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function mount(node: React.ReactElement) {
  renderToStaticMarkup(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("public pages never call /api/patient for a signed-out visitor", () => {
  it("the product heart", async () => {
    identity = { status: "anonymous" };
    await mount(<WishlistHeart itemId="m1" locale="en" />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("the product heart asks once for a patient", async () => {
    identity = { status: "user", id: "p1", isGuest: false };
    await mount(<WishlistHeart itemId="m1" locale="en" />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("the save-article button", async () => {
    identity = { status: "anonymous" };
    await mount(<SaveArticleButton slug="a" locale="en" />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("the save-article button asks for a patient", async () => {
    identity = { status: "user", id: "p1", isGuest: false };
    await mount(<SaveArticleButton slug="a" locale="en" />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
