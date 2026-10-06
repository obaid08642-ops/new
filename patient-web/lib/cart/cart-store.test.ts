import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CART_OWNER_KEY,
  GUEST_CART_KEY,
  LEGACY_CART_KEY,
  createCartStore,
  mergeCarts,
  sanitizeCartItems,
  userCartKey,
  cartAccountId,
  type CartItemInput,
  type StorageLike,
} from "./cart-store";

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
  keys() { return [...this.data.keys()].sort(); }
}

const paracetamol: CartItemInput = { id: "m1", name: "Paracetamol 500", rx: false, slug: "paracetamol-500", form: "Tablets", strength: "500 mg", image: null };
const amoxicillin: CartItemInput = { id: "m2", name: "Amoxicillin", rx: true };
const newStore = (storage: StorageLike | null) => createCartStore(() => storage);

// The backend is DOWN for every test in this file: any request a cart operation made would reject, and the spy would see it.
let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchSpy = vi.fn(() => Promise.reject(new TypeError("backend down")));
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => vi.unstubAllGlobals());

describe("the local-first cart makes no request (backend down)", () => {
  it("add, change, remove, clear, load, sign-in merge and sign-out call fetch zero times and still work", () => {
    const storage = new MemoryStorage();
    const store = newStore(storage);
    store.load();
    store.add({ ...paracetamol, qty: 2 });
    store.add(amoxicillin);
    store.update("m1", 1);
    expect(store.getSnapshot().items.map((line) => [line.id, line.qty])).toEqual([["m1", 3], ["m2", 1]]);
    store.remove("m2");
    expect(store.getSnapshot().items.map((line) => line.id)).toEqual(["m1"]);
    store.adoptUser("u1");
    store.clear();
    store.add(paracetamol);
    store.signOut();
    expect(store.getSnapshot().items).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is ready after the browser's own storage was read, with no session answer needed", () => {
    const store = newStore(new MemoryStorage());
    expect(store.getSnapshot().ready).toBe(false); // the empty state must wait for this
    store.load();
    expect(store.getSnapshot()).toEqual({ items: [], ready: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("a line is a product and a quantity, never a price", () => {
  it("drops a price, a subtotal and a stock figure handed to add()", () => {
    const store = newStore(new MemoryStorage());
    store.add({ ...paracetamol, price: 12.5, subtotal: 25, stock: 4, inStock: true } as unknown as CartItemInput);
    const [line] = store.getSnapshot().items;
    expect(line).toMatchObject({ id: "m1", name: "Paracetamol 500", qty: 1 });
    for (const field of ["price", "subtotal", "stock", "inStock"]) expect(line).not.toHaveProperty(field);
  });

  it("writes none of them to storage either", () => {
    const storage = new MemoryStorage();
    const store = newStore(storage);
    store.add({ ...paracetamol, price: 12.5 } as unknown as CartItemInput);
    expect(storage.getItem(GUEST_CART_KEY)).not.toMatch(/price|subtotal|stock/i);
  });

  it("sanitizing a stored cart strips money fields and keeps only usable lines", () => {
    const kept = sanitizeCartItems([
      { id: "a", name: "A", qty: 2, rx: true, price: 9, stock: 3, subtotal: 18 },
      { id: "b", name: "B", qty: 0 },
      { id: "", name: "C", qty: 1 },
      { id: "d", name: "D", qty: 500 },
      null,
      "x",
    ]);
    expect(kept.map((line) => [line.id, line.qty])).toEqual([["a", 2], ["d", 99]]);
    for (const line of kept) for (const field of ["price", "stock", "subtotal"]) expect(line).not.toHaveProperty(field);
    expect(sanitizeCartItems({ not: "a list" })).toEqual([]);
  });

  it("an invalid line (no name) is ignored and an invalid quantity becomes 1", () => {
    const store = newStore(new MemoryStorage());
    store.add({ id: "x", name: "", rx: false });
    store.add({ ...paracetamol, qty: -3 });
    store.add({ ...amoxicillin, qty: 1.5 });
    expect(store.getSnapshot().items.map((line) => [line.id, line.qty])).toEqual([["m1", 1], ["m2", 1]]);
  });
});

describe("quantities", () => {
  it("add sums the same product and caps a line at 99; update never goes above 99", () => {
    const store = newStore(new MemoryStorage());
    store.add({ ...paracetamol, qty: 98 });
    store.add({ ...paracetamol, qty: 5 });
    expect(store.getSnapshot().items[0].qty).toBe(99);
    store.update("m1", 10);
    expect(store.getSnapshot().items[0].qty).toBe(99);
  });

  it("update to zero or below removes the line", () => {
    const store = newStore(new MemoryStorage());
    store.add({ ...paracetamol, qty: 2 });
    store.update("m1", -2);
    expect(store.getSnapshot().items).toEqual([]);
  });
});

describe("persistence and owners", () => {
  it("a reload (a new store on the same storage) shows the same cart, from the guest key", () => {
    const storage = new MemoryStorage();
    const first = newStore(storage);
    first.add({ ...paracetamol, qty: 2 });
    first.add(amoxicillin);
    expect(storage.keys()).toEqual([GUEST_CART_KEY]);

    const second = newStore(storage);
    second.load();
    expect(second.getSnapshot().items).toEqual(first.getSnapshot().items);
    expect(second.getSnapshot().ready).toBe(true);
  });

  it("a signed-in patient's cart is kept under their own key, apart from the guest's and from another patient's", () => {
    const storage = new MemoryStorage();
    const store = newStore(storage);
    store.adoptUser("u1");
    store.add(paracetamol);
    expect(storage.keys()).toContain(userCartKey("u1"));
    expect(JSON.parse(storage.getItem(userCartKey("u1"))!).map((line: { id: string }) => line.id)).toEqual(["m1"]);

    store.adoptUser("u2"); // another patient on the same device sees their own cart, not u1's
    expect(store.getSnapshot().items).toEqual([]);
    store.add(amoxicillin);
    expect(JSON.parse(storage.getItem(userCartKey("u1"))!).map((line: { id: string }) => line.id)).toEqual(["m1"]);
    expect(JSON.parse(storage.getItem(userCartKey("u2"))!).map((line: { id: string }) => line.id)).toEqual(["m2"]);
  });

  it("the next page load shows the last known owner's cart at once, before any session answer", () => {
    const storage = new MemoryStorage();
    const first = newStore(storage);
    first.adoptUser("u1");
    first.add(paracetamol);

    const reload = newStore(storage);
    reload.load();
    expect(reload.getSnapshot().items.map((line) => line.id)).toEqual(["m1"]);
    expect(storage.getItem(CART_OWNER_KEY)).toBe(userCartKey("u1"));
  });

  it("another tab's change is read again (storage event), also a storage.clear()", () => {
    const storage = new MemoryStorage();
    const tabA = newStore(storage);
    const tabB = newStore(storage);
    tabA.load();
    tabB.load();
    tabA.add(paracetamol);
    tabB.syncFromStorage(GUEST_CART_KEY);
    expect(tabB.getSnapshot().items.map((line) => line.id)).toEqual(["m1"]);
    tabB.syncFromStorage("unrelated-key"); // not a cart key: ignored
    storage.removeItem(GUEST_CART_KEY);
    tabB.syncFromStorage(null);
    expect(tabB.getSnapshot().items).toEqual([]);
  });

  it("with no usable storage (blocked, private window) the cart still works in memory", () => {
    const blocked: StorageLike = {
      length: 0,
      key: () => null,
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    for (const storage of [blocked, null]) {
      const store = newStore(storage);
      store.add({ ...paracetamol, qty: 2 });
      store.update("m1", 1);
      expect(store.getSnapshot().items[0].qty).toBe(3);
      store.adoptUser("u1");
      expect(store.getSnapshot().items[0].qty).toBe(3); // the guest cart in memory still merges
      store.signOut();
      expect(store.getSnapshot().items).toEqual([]);
    }
  });

  it("a corrupt stored cart is an empty cart, not a crash", () => {
    const storage = new MemoryStorage();
    storage.setItem(GUEST_CART_KEY, "{not json");
    const store = newStore(storage);
    store.load();
    expect(store.getSnapshot()).toEqual({ items: [], ready: true });
  });
});

describe("the legacy cart (nabd_patient_cart_v1)", () => {
  it("moves once into the guest cart, without its prices, and the old key is removed", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_CART_KEY, JSON.stringify([{ id: "m1", name: "Paracetamol 500", price: 12.5, qty: 2, rx: false }]));
    const store = newStore(storage);
    store.load();
    expect(store.getSnapshot().items).toMatchObject([{ id: "m1", qty: 2 }]);
    expect(store.getSnapshot().items[0]).not.toHaveProperty("price");
    expect(storage.getItem(LEGACY_CART_KEY)).toBeNull();
    expect(storage.getItem(GUEST_CART_KEY)).not.toMatch(/price/);

    const again = newStore(storage); // a second load does not migrate (or double) anything
    again.load();
    expect(again.getSnapshot().items).toMatchObject([{ id: "m1", qty: 2 }]);
  });

  it("is added to a guest cart that already exists, summing the same product", () => {
    const storage = new MemoryStorage();
    storage.setItem(GUEST_CART_KEY, JSON.stringify([{ id: "m1", name: "Paracetamol 500", qty: 1, rx: false }]));
    storage.setItem(LEGACY_CART_KEY, JSON.stringify([{ id: "m1", name: "Paracetamol 500", price: 1, qty: 2, rx: false }, { id: "m2", name: "Amoxicillin", price: 3, qty: 1, rx: true }]));
    const store = newStore(storage);
    store.load();
    expect(store.getSnapshot().items.map((line) => [line.id, line.qty])).toEqual([["m1", 3], ["m2", 1]]);
    expect(storage.getItem(LEGACY_CART_KEY)).toBeNull();
  });

  it("a corrupt legacy entry is dropped and migrates nothing", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_CART_KEY, "garbage");
    const store = newStore(storage);
    store.load();
    expect(store.getSnapshot().items).toEqual([]);
    expect(storage.getItem(LEGACY_CART_KEY)).toBeNull();
  });
});

describe("signing in merges the guest cart into the account's", () => {
  it("sums quantities by product (99 at most), keeps the account's line data, adds new products, and removes the guest key", () => {
    const storage = new MemoryStorage();
    storage.setItem(userCartKey("u1"), JSON.stringify([
      { id: "m1", name: "Paracetamol 500 (account)", qty: 95, rx: false },
      { id: "m3", name: "Ibuprofen", qty: 1, rx: false },
    ]));
    const store = newStore(storage);
    store.load();
    store.add({ ...paracetamol, qty: 2 });
    store.add(amoxicillin);
    expect(storage.keys()).toContain(GUEST_CART_KEY);

    store.adoptUser("u1");
    const merged = store.getSnapshot().items;
    expect(merged.map((line) => [line.id, line.qty])).toEqual([["m1", 97], ["m3", 1], ["m2", 1]]);
    expect(merged[0].name).toBe("Paracetamol 500 (account)");
    expect(storage.getItem(GUEST_CART_KEY)).toBeNull();
    expect(JSON.parse(storage.getItem(userCartKey("u1"))!)).toHaveLength(3);
    expect(storage.getItem(CART_OWNER_KEY)).toBe(userCartKey("u1"));
  });

  it("caps a merged line at 99", () => {
    expect(mergeCarts([{ id: "a", name: "A", qty: 98, rx: false }], [{ id: "a", name: "A", qty: 50, rx: false }])).toEqual([{ id: "a", name: "A", qty: 99, rx: false }]);
  });

  it("asking again for the same patient changes nothing (the session answer can arrive twice)", () => {
    const storage = new MemoryStorage();
    const store = newStore(storage);
    store.add({ ...paracetamol, qty: 2 });
    store.adoptUser("u1");
    store.adoptUser("u1");
    expect(store.getSnapshot().items.map((line) => [line.id, line.qty])).toEqual([["m1", 2]]);
  });

  it("when the account's cart cannot be written the guest cart is NOT removed", () => {
    const storage = new MemoryStorage();
    const failing: StorageLike = {
      get length() { return storage.length; },
      key: (i) => storage.key(i),
      getItem: (k) => storage.getItem(k),
      setItem: (k, v) => { if (k.includes(":user:")) throw new Error("quota"); storage.setItem(k, v); },
      removeItem: (k) => storage.removeItem(k),
    };
    const store = newStore(failing);
    store.add(paracetamol);
    store.adoptUser("u1");
    expect(storage.getItem(GUEST_CART_KEY)).not.toBeNull();
    expect(store.getSnapshot().items.map((line) => line.id)).toEqual(["m1"]); // and the patient still sees the cart
  });
});

describe("signing out", () => {
  it("clears the cart in memory and every nabd_cart_v2:* key (guest, every patient, the owner hint) and the legacy key, and nothing else", () => {
    const storage = new MemoryStorage();
    storage.setItem("theme", "dark");
    storage.setItem(LEGACY_CART_KEY, "[]");
    storage.setItem(userCartKey("u2"), JSON.stringify([{ id: "m2", name: "Amoxicillin", qty: 1, rx: true }]));
    const store = newStore(storage);
    store.adoptUser("u1");
    store.add(paracetamol);
    storage.setItem(LEGACY_CART_KEY, "[]"); // adoptUser's load migrated the earlier one

    store.signOut();
    expect(store.getSnapshot().items).toEqual([]);
    expect(storage.keys()).toEqual(["theme"]);
  });

  it("after sign-out the next page load starts with an empty guest cart", () => {
    const storage = new MemoryStorage();
    const store = newStore(storage);
    store.adoptUser("u1");
    store.add(paracetamol);
    store.signOut();
    const reload = newStore(storage);
    reload.load();
    expect(reload.getSnapshot().items).toEqual([]);
    store.add(amoxicillin); // and what is added afterwards belongs to the guest again
    expect(storage.keys()).toEqual([GUEST_CART_KEY]);
  });

  it("notifies the screens (the snapshot changes), so a cart on screen empties", () => {
    const store = newStore(new MemoryStorage());
    store.add(paracetamol);
    const seen: number[] = [];
    const stop = store.subscribe(() => seen.push(store.getSnapshot().items.length));
    store.signOut();
    stop();
    expect(seen).toEqual([0]);
  });
});

describe("whose cart a session answer names", () => {
  it("is a patient's id only: not a guest account, not anonymous, not unknown, not loading", () => {
    expect(cartAccountId({ status: "user", id: "u1", isGuest: false })).toBe("u1");
    expect(cartAccountId({ status: "user", id: "g1", isGuest: true })).toBeNull();
    for (const status of ["anonymous", "unknown", "loading"]) expect(cartAccountId({ status })).toBeNull();
  });
});
