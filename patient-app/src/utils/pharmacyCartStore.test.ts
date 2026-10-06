import {
  CART_OWNER_KEY,
  DEVICE_CART_KEY,
  createPharmacyCartStore,
  mergeCarts,
  sanitizeStoredCart,
  userCartKey,
  type CartItemInput,
  type CartStorage,
} from './pharmacyCartStore';

class MemoryStorage implements CartStorage {
  data = new Map<string, string>();
  async getItem(key: string) { return this.data.get(key) ?? null; }
  async setItem(key: string, value: string) { this.data.set(key, value); }
  async removeItem(key: string) { this.data.delete(key); }
  async getAllKeys() { return [...this.data.keys()]; }
  async multiRemove(keys: readonly string[]) { keys.forEach((key) => this.data.delete(key)); }
  keys() { return [...this.data.keys()].sort(); }
}

const paracetamol: CartItemInput = { id: 'm1', name: 'Paracetamol 500', rx: false };
const amoxicillin: CartItemInput = { id: 'm2', name: 'Amoxicillin', rx: true };
const ids = (store: ReturnType<typeof createPharmacyCartStore>) => store.getSnapshot().items.map((line) => [line.id, line.qty]);

// The backend is DOWN for every test in this file: any request a cart operation made would reject, and the spy would see it.
const fetchSpy = jest.fn(() => Promise.reject(new TypeError('backend down')));
beforeEach(() => {
  fetchSpy.mockClear();
  (globalThis as { fetch?: unknown }).fetch = fetchSpy;
});

describe('the local-first cart makes no request (backend down)', () => {
  it('load, add, change, remove, clear, sign-in merge and sign-out call fetch zero times and still work', async () => {
    const storage = new MemoryStorage();
    const store = createPharmacyCartStore(storage);
    expect(store.getSnapshot().ready).toBe(false); // the empty state must wait for the device's own storage
    await store.load();
    expect(store.getSnapshot()).toEqual({ items: [], ready: true });
    await store.add({ ...paracetamol, qty: 2 });
    await store.add(amoxicillin);
    await store.update('m1', 1);
    expect(ids(store)).toEqual([['m1', 3], ['m2', 1]]);
    await store.remove('m2');
    expect(ids(store)).toEqual([['m1', 3]]);
    await store.adoptUser('u1');
    await store.clear();
    await store.add(paracetamol);
    await store.signOut();
    expect(ids(store)).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rapid taps (no await between them) all land, in order', async () => {
    const store = createPharmacyCartStore(new MemoryStorage());
    await Promise.all([store.add(paracetamol), store.add(paracetamol), store.update('m1', 1), store.add(amoxicillin)]);
    expect(ids(store)).toEqual([['m1', 3], ['m2', 1]]);
  });
});

describe('a line is a medicine and a quantity, never a price', () => {
  it('drops a price, a subtotal, a payment choice and a stock figure handed to add(), in memory and in storage', async () => {
    const storage = new MemoryStorage();
    const store = createPharmacyCartStore(storage);
    await store.add({ ...paracetamol, price: 12.5, subtotal: 25, stock: 4, in_stock: true, payment_method: 'card' } as unknown as CartItemInput);
    const [line] = store.getSnapshot().items;
    expect(line).toMatchObject({ id: 'm1', name: 'Paracetamol 500', qty: 1 });
    for (const field of ['price', 'subtotal', 'stock', 'in_stock', 'payment_method']) expect(line).not.toHaveProperty(field);
    expect(storage.data.get(DEVICE_CART_KEY)).not.toMatch(/price|subtotal|stock|payment/i);
  });

  it('sanitizing a stored cart strips money fields and keeps only usable lines', () => {
    const kept = sanitizeStoredCart([
      { id: 'a', name: 'A', qty: 2, rx: true, price: 9, stock: 3, subtotal: 18, activeIngredient: 'x' },
      { id: 'b', name: 'B', qty: 0 },
      { id: '', name: 'C', qty: 1 },
      { id: 'd', name: 'D', qty: 500 },
      null,
      'x',
    ]);
    expect(kept.map((line) => [line.id, line.qty])).toEqual([['a', 2], ['d', 99]]);
    for (const line of kept) for (const field of ['price', 'stock', 'subtotal']) expect(line).not.toHaveProperty(field);
    expect(sanitizeStoredCart({ not: 'a list' })).toEqual([]);
  });

  it('an invalid line is ignored and an invalid quantity becomes 1; a line stops at 99', async () => {
    const store = createPharmacyCartStore(new MemoryStorage());
    await store.add({ id: 'x', name: '', rx: false });
    await store.add({ ...paracetamol, qty: -3 });
    await store.add({ ...amoxicillin, qty: 98 });
    await store.add({ ...amoxicillin, qty: 5 });
    await store.update('m2', 10);
    expect(ids(store)).toEqual([['m1', 1], ['m2', 99]]);
  });
});

describe('persistence and owners', () => {
  it('a restart (a new store on the same storage) shows the same cart, from the device key', async () => {
    const storage = new MemoryStorage();
    const first = createPharmacyCartStore(storage);
    await first.add({ ...paracetamol, qty: 2 });
    await first.add(amoxicillin);
    expect(storage.keys()).toEqual([DEVICE_CART_KEY]);

    const second = createPharmacyCartStore(storage);
    await second.load();
    expect(second.getSnapshot().items).toEqual(first.getSnapshot().items);
    expect(second.getSnapshot().ready).toBe(true);
  });

  it("a patient's cart is kept under their own key, apart from the device's and from another patient's", async () => {
    const storage = new MemoryStorage();
    const store = createPharmacyCartStore(storage);
    await store.adoptUser('u1');
    await store.add(paracetamol);
    expect(JSON.parse(storage.data.get(userCartKey('u1'))!).map((line: { id: string }) => line.id)).toEqual(['m1']);
    await store.adoptUser('u2');
    expect(ids(store)).toEqual([]);
    await store.add(amoxicillin);
    expect(JSON.parse(storage.data.get(userCartKey('u1'))!).map((line: { id: string }) => line.id)).toEqual(['m1']);
    expect(JSON.parse(storage.data.get(userCartKey('u2'))!).map((line: { id: string }) => line.id)).toEqual(['m2']);
  });

  it("the next launch shows the last owner's cart before the auth slice has restored the session", async () => {
    const storage = new MemoryStorage();
    const first = createPharmacyCartStore(storage);
    await first.adoptUser('u1');
    await first.add(paracetamol);
    const relaunch = createPharmacyCartStore(storage);
    await relaunch.load();
    expect(ids(relaunch)).toEqual([['m1', 1]]);
    expect(storage.data.get(CART_OWNER_KEY)).toBe(userCartKey('u1'));
  });

  it('a corrupt stored cart is an empty cart, not a crash; storage that throws leaves a working in-memory cart', async () => {
    const corrupt = new MemoryStorage();
    corrupt.data.set(DEVICE_CART_KEY, '{not json');
    const store = createPharmacyCartStore(corrupt);
    await store.load();
    expect(store.getSnapshot()).toEqual({ items: [], ready: true });

    const broken: CartStorage = {
      getItem: () => Promise.reject(new Error('blocked')),
      setItem: () => Promise.reject(new Error('blocked')),
      removeItem: () => Promise.reject(new Error('blocked')),
      getAllKeys: () => Promise.reject(new Error('blocked')),
      multiRemove: () => Promise.reject(new Error('blocked')),
    };
    const memoryOnly = createPharmacyCartStore(broken);
    await memoryOnly.add({ ...paracetamol, qty: 2 });
    await memoryOnly.update('m1', 1);
    expect(ids(memoryOnly)).toEqual([['m1', 3]]);
    await memoryOnly.adoptUser('u1');
    expect(ids(memoryOnly)).toEqual([['m1', 3]]); // the device cart in memory still merges
    await memoryOnly.signOut();
    expect(ids(memoryOnly)).toEqual([]);
  });
});

describe('signing in merges the device cart into the patient’s', () => {
  it('sums quantities by medicine (99 at most), keeps the patient’s line data, adds new medicines, and removes the device key', async () => {
    const storage = new MemoryStorage();
    storage.data.set(userCartKey('u1'), JSON.stringify([
      { id: 'm1', name: 'Paracetamol 500 (account)', qty: 95, rx: false },
      { id: 'm3', name: 'Ibuprofen', qty: 1, rx: false },
    ]));
    const store = createPharmacyCartStore(storage);
    await store.add({ ...paracetamol, qty: 2 });
    await store.add(amoxicillin);
    expect(storage.keys()).toContain(DEVICE_CART_KEY);

    await store.adoptUser('u1');
    expect(ids(store)).toEqual([['m1', 97], ['m3', 1], ['m2', 1]]);
    expect(store.getSnapshot().items[0].name).toBe('Paracetamol 500 (account)');
    expect(storage.data.get(DEVICE_CART_KEY)).toBeUndefined();
    expect(JSON.parse(storage.data.get(userCartKey('u1'))!)).toHaveLength(3);
    expect(storage.data.get(CART_OWNER_KEY)).toBe(userCartKey('u1'));
  });

  it('caps a merged line at 99', () => {
    expect(mergeCarts([{ id: 'a', name: 'A', qty: 98, rx: false }], [{ id: 'a', name: 'A', qty: 50, rx: false }])).toEqual([{ id: 'a', name: 'A', qty: 99, rx: false }]);
  });

  it('asking again for the same patient changes nothing', async () => {
    const store = createPharmacyCartStore(new MemoryStorage());
    await store.add({ ...paracetamol, qty: 2 });
    await store.adoptUser('u1');
    await store.adoptUser('u1');
    expect(ids(store)).toEqual([['m1', 2]]);
  });

  it('when the patient’s cart cannot be written the device cart is NOT removed', async () => {
    const storage = new MemoryStorage();
    const failing: CartStorage = {
      getItem: (k) => storage.getItem(k),
      setItem: (k, v) => (k.includes(':user:') ? Promise.reject(new Error('quota')) : storage.setItem(k, v)),
      removeItem: (k) => storage.removeItem(k),
      getAllKeys: () => storage.getAllKeys(),
      multiRemove: (keys) => storage.multiRemove(keys),
    };
    const store = createPharmacyCartStore(failing);
    await store.add(paracetamol);
    await store.adoptUser('u1');
    expect(storage.data.get(DEVICE_CART_KEY)).toBeDefined();
    expect(ids(store)).toEqual([['m1', 1]]);
  });
});

describe('signing out', () => {
  it('clears the cart in memory and every @nabd_cart_v2:* key (device, every patient, the owner hint), and nothing else', async () => {
    const storage = new MemoryStorage();
    storage.data.set('@nabdah_selected_address', '{}');
    storage.data.set(userCartKey('u2'), JSON.stringify([{ id: 'm2', name: 'Amoxicillin', qty: 1, rx: true }]));
    const store = createPharmacyCartStore(storage);
    await store.adoptUser('u1');
    await store.add(paracetamol);
    await store.signOut();
    expect(ids(store)).toEqual([]);
    expect(storage.keys()).toEqual(['@nabdah_selected_address']);
  });

  it('after sign-out the next launch starts with an empty cart, and what is added afterwards belongs to the device again', async () => {
    const storage = new MemoryStorage();
    const store = createPharmacyCartStore(storage);
    await store.adoptUser('u1');
    await store.add(paracetamol);
    await store.signOut();
    const relaunch = createPharmacyCartStore(storage);
    await relaunch.load();
    expect(ids(relaunch)).toEqual([]);
    await store.add(amoxicillin);
    expect(storage.keys()).toEqual([DEVICE_CART_KEY]);
  });

  it('notifies the screens, so a cart on screen empties', async () => {
    const store = createPharmacyCartStore(new MemoryStorage());
    await store.add(paracetamol);
    const seen: number[] = [];
    const stop = store.subscribe(() => seen.push(store.getSnapshot().items.length));
    await store.signOut();
    stop();
    expect(seen).toEqual([0]);
  });
});
