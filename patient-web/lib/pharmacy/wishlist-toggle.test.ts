import { describe, expect, it, vi } from "vitest";
import { requestWishlistToggle } from "./wishlist-toggle";

const answer = (status: number, body: unknown) => vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }));

describe("15.3 wishlist toggle", () => {
  it("sends one POST with the idempotency key and takes the server's word for the new state", async () => {
    const fetcher = answer(200, { in_wishlist: true });
    expect(await requestWishlistToggle("med 1", false, "key-1", fetcher as never)).toEqual({ state: "ok", inList: true });
    expect(fetcher).toHaveBeenCalledWith("/api/patient/users/me/wishlist/med%201", expect.objectContaining({ method: "POST", headers: { "idempotency-key": "key-1" } }));
  });

  it("without a state in the answer, the press flips what it was", async () => {
    expect(await requestWishlistToggle("m", true, "k", answer(200, {}) as never)).toEqual({ state: "ok", inList: false });
    expect(await requestWishlistToggle("m", false, "k", answer(200, null) as never)).toEqual({ state: "ok", inList: true });
  });

  it("a forced 500 is a failure: the heart goes back", async () => {
    expect(await requestWishlistToggle("m", false, "k", answer(500, { message: "boom" }) as never)).toEqual({ state: "failed" });
  });

  it("a network error is a failure too, never a throw", async () => {
    const fetcher = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    expect(await requestWishlistToggle("m", false, "k", fetcher as never)).toEqual({ state: "failed" });
  });

  it("a 401 sends the visitor to sign in", async () => {
    expect(await requestWishlistToggle("m", false, "k", answer(401, {}) as never)).toEqual({ state: "signed_out" });
  });
});
