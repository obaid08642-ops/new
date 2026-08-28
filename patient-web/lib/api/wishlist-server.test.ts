import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ callPatientApi: vi.fn() }));
vi.mock("./upstream", () => ({ callPatientApi: state.callPatientApi }));
import { getPatientWishlist } from "./wishlist-server";

describe("wishlist server boundary", () => {
  beforeEach(() => state.callPatientApi.mockReset());
  it("forwards only the patient-owned read route with server access", async () => {
    await getPatientWishlist("server-access");
    expect(state.callPatientApi).toHaveBeenCalledWith("/users/me/wishlist", {}, "server-access");
  });
});
