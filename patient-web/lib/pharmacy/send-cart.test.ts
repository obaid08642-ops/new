import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCartStore, type StorageLike } from "@/lib/cart/cart-store";
import { createBroadcastAttempt, type BroadcastRequest } from "./broadcast";
import { sendCartRequest } from "./send-cart";

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
  dump() { return Object.fromEntries(this.data); }
}

const ORDER = "761e9693-e517-4ad6-ae20-330363005b28";
const address = { id: "a1", label: "Home", street: "12 King Fahd Rd", city: "Riyadh", district: "Olaya", lat: 24.7, lng: 46.7, isDefault: true };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** The checkout's own steps with the real cart store and the real broadcast attempt; only the network is replaced. */
function setup() {
  const storage = new MemoryStorage();
  const cart = createCartStore(() => storage);
  cart.add({ id: "m1", name: "Paracetamol 500", rx: false, qty: 2 });
  cart.add({ id: "m2", name: "Amoxicillin", rx: true });
  const request = (): BroadcastRequest => ({
    kind: "cart",
    lines: cart.getSnapshot().items.map((item) => ({ name: item.name, qty: item.qty, sku: item.id })),
    paymentMode: "cash",
    fulfillment: "delivery",
  });
  const attempt = createBroadcastAttempt();
  const clearCart = vi.fn(() => cart.clear());
  const send = () => sendCartRequest(attempt, request(), address, clearCart);
  return { storage, cart, send, clearCart, before: { items: structuredClone(cart.getSnapshot().items), stored: storage.dump() } };
}

describe("sending the cart is the only step that needs the backend", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => vi.unstubAllGlobals());

  const unchanged = (s: ReturnType<typeof setup>) => {
    expect(s.cart.getSnapshot().items).toEqual(s.before.items);
    expect(s.storage.dump()).toEqual(s.before.stored);
    expect(s.clearCart).not.toHaveBeenCalled();
  };

  it("backend down (the request cannot be made): a network error is shown and the cart is exactly as it was", async () => {
    fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
    const s = setup();
    expect(await s.send()).toEqual({ status: "failed", failure: "network" });
    unchanged(s);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // one send, and it was the create call: nothing was asked for the items
  });

  it("a 5xx at creation is a server failure (not 'check your connection') and the cart is exactly as it was", async () => {
    fetchSpy.mockResolvedValue(json({ message: "boom" }, 503));
    const s = setup();
    expect(await s.send()).toEqual({ status: "failed", failure: "server" });
    unchanged(s);
  });

  it("a 4xx at creation is a refusal and the cart is exactly as it was", async () => {
    fetchSpy.mockResolvedValue(json({ message: "invalid" }, 422));
    const s = setup();
    expect(await s.send()).toEqual({ status: "failed", failure: "send" });
    unchanged(s);
  });

  it("a 403 and a lost session (401) are told apart, and keep the cart", async () => {
    fetchSpy.mockResolvedValueOnce(json({}, 403));
    const s = setup();
    expect(await s.send()).toEqual({ status: "failed", failure: "forbidden" });
    fetchSpy.mockResolvedValueOnce(json({}, 401));
    expect(await s.send()).toEqual({ status: "failed", failure: "session" });
    unchanged(s);
  });

  it("created but the submit fails (5xx or no connection): the cart is kept, and the retry is the same order, not a second one", async () => {
    fetchSpy
      .mockResolvedValueOnce(json({ id: ORDER }, 201))
      .mockResolvedValueOnce(json({}, 502))
      .mockResolvedValueOnce(json({ id: ORDER }, 200))
      .mockRejectedValueOnce(new TypeError("down"))
      .mockResolvedValueOnce(json({ id: ORDER }, 200))
      .mockResolvedValueOnce(json({}, 200));
    const s = setup();
    expect(await s.send()).toEqual({ status: "failed", failure: "server" }); // create 201, submit 502
    expect(await s.send()).toEqual({ status: "failed", failure: "network" }); // no answer
    unchanged(s);
    const createKeys = fetchSpy.mock.calls.filter(([url]) => !String(url).endsWith("/submit")).map(([, init]) => (init as RequestInit).headers as Record<string, string>);
    expect(new Set(createKeys.map((headers) => headers["idempotency-key"])).size).toBe(1); // same key until the server answered
    expect(await s.send()).toEqual({ status: "sent", orderId: ORDER });
  });

  it("an answer that names no order is a failure, not a success: the cart is kept", async () => {
    fetchSpy.mockResolvedValue(json({ id: "cart" }, 201));
    const s = setup();
    expect((await s.send()).status).toBe("failed");
    unchanged(s);
  });

  it("success (created and submitted) clears the cart, in memory and in storage, and returns the order", async () => {
    fetchSpy.mockResolvedValueOnce(json({ id: ORDER }, 201)).mockResolvedValueOnce(json({}, 200));
    const s = setup();
    expect(await s.send()).toEqual({ status: "sent", orderId: ORDER });
    expect(s.clearCart).toHaveBeenCalledTimes(1);
    expect(s.cart.getSnapshot().items).toEqual([]);
    expect(JSON.parse(s.storage.dump()["nabd_cart_v2:guest"])).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("sends names, quantities and product ids only: the request carries no price", async () => {
    fetchSpy.mockResolvedValueOnce(json({ id: ORDER }, 201)).mockResolvedValueOnce(json({}, 200));
    const s = setup();
    await s.send();
    const body = String((fetchSpy.mock.calls[0][1] as RequestInit).body);
    expect(body).toContain("Paracetamol 500");
    expect(body).not.toMatch(/price|subtotal|total/i);
  });

  it("a second press while one send is in flight sends nothing and clears nothing", async () => {
    let release: (response: Response) => void = () => {};
    fetchSpy.mockReturnValueOnce(new Promise<Response>((resolve) => { release = resolve; }));
    const s = setup();
    const first = s.send();
    expect(await s.send()).toEqual({ status: "busy" });
    release(json({}, 500));
    await first;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    unchanged(s);
  });
});
