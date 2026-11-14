import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let identity: { status: string; id?: string; isGuest?: boolean } = { status: "anonymous" };
vi.mock("@/lib/auth/session-identity", () => ({ getSessionIdentity: () => Promise.resolve(identity) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/link", () => ({ default: () => null }));
vi.mock("@/components-next/ui-generated/components/FIcon", () => ({ FIcon: () => null }));
vi.mock("@/components-next/orders/local-date", () => ({ LocalDate: () => null }));

import { readLatestOrder } from "@/components-next/pharmacy/order-again-card";

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(JSON.stringify([{ id: "o1", items: [{ n: 1 }], created_at: "2026-10-01T00:00:00Z" }]), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("order-again card: who may ask for orders", () => {
  it("never asks when nobody is signed in", async () => {
    identity = { status: "anonymous" };
    expect(await readLatestOrder()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never asks for a guest account or an unknown answer", async () => {
    for (const who of [{ status: "user", id: "g1", isGuest: true }, { status: "unknown" }]) {
      identity = who;
      expect(await readLatestOrder()).toBeNull();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks once for a signed-in patient and returns the latest order", async () => {
    identity = { status: "user", id: "p1", isGuest: false };
    const latest = await readLatestOrder();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/pharmacy/orders");
    expect(latest?.id).toBe("o1");
  });

  it("a failed request shows nothing", async () => {
    identity = { status: "user", id: "p1", isGuest: false };
    fetchMock.mockResolvedValueOnce(new Response("x", { status: 401 }));
    expect(await readLatestOrder()).toBeNull();
  });
});
