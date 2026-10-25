import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// No DOM in this suite: the hooks are driven by hand. useEffect callbacks are collected and run after the "render".
const effects: Array<() => void | (() => void)> = [];
const identity = vi.hoisted(() => ({ value: { status: "loading" } as { status: string; id?: string; isGuest?: boolean } }));
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  useEffect: (fn: () => void | (() => void)) => { effects.push(fn); },
  useState: (initial: unknown) => [initial, vi.fn()],
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/link", () => ({ default: () => null }));
vi.mock("@/lib/auth/session-identity", () => ({ useSessionIdentity: () => identity.value }));

import { OrderAgainCard } from "@/components-next/pharmacy/order-again-card";

const ordersCalls = (f: ReturnType<typeof vi.fn>) => f.mock.calls.filter((c) => String(c[0]) === "/api/patient/patient/pharmacy/orders");
function render() {
  effects.length = 0;
  const node = OrderAgainCard({ locale: "en" });
  for (const run of effects) run();
  return node;
}

describe("OrderAgainCard (pharmacy hub, public cached page)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve(new Response("[]", { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["loading", { status: "loading" }],
    ["anonymous", { status: "anonymous" }],
    ["unknown", { status: "unknown" }],
  ])("makes no call to the orders endpoint while the visitor is %s", (_name, value) => {
    identity.value = value;
    expect(render()).toBeNull();
    expect(ordersCalls(fetchMock)).toHaveLength(0);
  });

  it("a signed-in visitor still asks for the orders (once, with cookies, no-store)", () => {
    identity.value = { status: "user", id: "u1", isGuest: false };
    render();
    expect(ordersCalls(fetchMock)).toHaveLength(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "same-origin", cache: "no-store" });
  });
});
