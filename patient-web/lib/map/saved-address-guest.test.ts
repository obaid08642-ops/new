import { describe, expect, it, vi } from "vitest";
import { savedAddressPoint } from "./explorer-browser";

const addresses = [{ id: "a1", is_default: true, lat: 24.7, lng: 46.7, label: "Home" }];

describe("savedAddressPoint on the public map", () => {
  it("requests nothing for a guest, an anonymous visitor or when there is no hint", async () => {
    const doFetch = vi.fn();
    await expect(savedAddressPoint(doFetch as unknown as typeof fetch, { kind: "user", id: "g1", isGuest: true })).resolves.toBeNull();
    await expect(savedAddressPoint(doFetch as unknown as typeof fetch, { kind: "anonymous" })).resolves.toBeNull();
    await expect(savedAddressPoint(doFetch as unknown as typeof fetch, null)).resolves.toBeNull();
    expect(doFetch).not.toHaveBeenCalled();
  });

  it("reads the addresses for a signed-in patient", async () => {
    const doFetch = vi.fn(async (..._args: unknown[]) => new Response(JSON.stringify(addresses), { status: 200 }));
    await savedAddressPoint(doFetch as unknown as typeof fetch, { kind: "user", id: "p1", isGuest: false });
    expect(doFetch).toHaveBeenCalledTimes(1);
    expect(String(doFetch.mock.calls[0][0])).toContain("/api/patient/users/me/addresses");
  });
});
