/**
 * The pharmacy cart's data and rules, with no React and no network in it (lib/context/CartContext wraps it for the UI).
 *
 * LOCAL-FIRST (owner decision 2026-10-06). A pharmacy order is broadcast to the pharmacies and they answer with offers, so
 * a cart line is only what the patient wants (a product and a quantity): never a price, a subtotal or a stock figure.
 * Adding, removing and changing a line only touch this browser's storage and never call the backend, so they work with
 * the backend down. Only "send the order" (checkout) needs the backend.
 *
 * Storage, per owner: `nabd_cart_v2:guest` for a visitor and `nabd_cart_v2:user:<id>` for a signed-in patient;
 * `nabd_cart_v2:owner` remembers which one was current so the next page load shows it at once. The legacy single key
 * `nabd_patient_cart_v1` (its lines carried a price) is moved once into the guest cart.
 */
export interface CartItem {
  id: string;
  name: string;
  qty: number;
  rx: boolean;
  image?: string | null;
  activeIngredient?: string | null;
  form?: string | null;
  strength?: string | null;
  slug?: string | null;
}

export type CartItemInput = Omit<CartItem, "qty"> & { qty?: number };

export const MAX_LINE_QTY = 99;
export const CART_KEY_PREFIX = "nabd_cart_v2:";
export const GUEST_CART_KEY = `${CART_KEY_PREFIX}guest`;
export const CART_OWNER_KEY = `${CART_KEY_PREFIX}owner`;
export const LEGACY_CART_KEY = "nabd_patient_cart_v1";
export const userCartKey = (userId: string) => `${CART_KEY_PREFIX}user:${userId}`;

/** What `localStorage` offers, as far as the cart uses it. */
export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * What this browser stored, kept only when it is a usable line: a corrupt or hand-edited entry must not break the cart
 * screen. Only the known fields are copied, so a price, a stock figure or any other money field is dropped.
 */
export function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): CartItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const line = entry as Record<string, unknown>;
    const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
    const id = text(line.id);
    const name = text(line.name);
    const qty = typeof line.qty === "number" && Number.isInteger(line.qty) && line.qty >= 1 ? Math.min(line.qty, MAX_LINE_QTY) : null;
    if (!id || !name || qty === null) return [];
    return [{
      id, name, qty, rx: line.rx === true,
      image: text(line.image), activeIngredient: text(line.activeIngredient), form: text(line.form), strength: text(line.strength), slug: text(line.slug),
    }];
  });
}

/** `extra` joins `base`: the same product adds up (99 at most) and keeps the line data of `base`; a new product is appended. */
export function mergeCarts(base: CartItem[], extra: CartItem[]): CartItem[] {
  const merged = base.map((line) => ({ ...line }));
  for (const line of extra) {
    const at = merged.findIndex((existing) => existing.id === line.id);
    if (at >= 0) merged[at] = { ...merged[at], qty: Math.min(merged[at].qty + line.qty, MAX_LINE_QTY) };
    else merged.push({ ...line });
  }
  return merged;
}

export type CartSnapshot = { items: CartItem[]; ready: boolean };

export const SERVER_CART_SNAPSHOT: CartSnapshot = { items: [], ready: false };

export function createCartStore(getStorage: () => StorageLike | null) {
  let items: CartItem[] = [];
  let owner = GUEST_CART_KEY;
  let snapshot: CartSnapshot = SERVER_CART_SNAPSHOT;
  let loaded = false;
  const listeners = new Set<() => void>();

  // every storage access is guarded: a private window or blocked storage leaves a working, in-memory cart
  const storage = (): StorageLike | null => {
    try { return getStorage(); } catch { return null; }
  };
  const readRaw = (key: string): string | null => {
    try { return storage()?.getItem(key) ?? null; } catch { return null; }
  };
  const writeRaw = (key: string, value: string): boolean => {
    try {
      const target = storage();
      if (!target) return false;
      target.setItem(key, value);
      return true;
    } catch { return false; }
  };
  const removeRaw = (key: string): void => {
    try { storage()?.removeItem(key); } catch { /* ignore */ }
  };
  const readList = (key: string): CartItem[] => {
    const raw = readRaw(key);
    if (!raw) return [];
    try { return sanitizeCartItems(JSON.parse(raw)); } catch { return []; }
  };
  const writeList = (key: string, list: CartItem[]) => writeRaw(key, JSON.stringify(list));

  function emit() {
    snapshot = { items, ready: loaded };
    for (const listener of listeners) listener();
  }

  function show(key: string, list: CartItem[]) {
    owner = key;
    items = list;
    emit();
  }

  function ownerFromStorage(): string {
    const hint = readRaw(CART_OWNER_KEY);
    return hint && hint.startsWith(`${CART_KEY_PREFIX}user:`) ? hint : GUEST_CART_KEY;
  }

  /** The legacy global cart moves into the guest cart once; it is removed only after the guest cart was written. */
  function migrateLegacy() {
    const raw = readRaw(LEGACY_CART_KEY);
    if (raw === null) return;
    let legacy: CartItem[] = [];
    try { legacy = sanitizeCartItems(JSON.parse(raw)); } catch { /* a corrupt entry migrates nothing */ }
    if (legacy.length === 0 || writeList(GUEST_CART_KEY, mergeCarts(readList(GUEST_CART_KEY), legacy))) removeRaw(LEGACY_CART_KEY);
  }

  /** Read what this browser kept (no request): the last known owner's cart. Once. */
  function load() {
    if (loaded) return;
    loaded = true;
    migrateLegacy();
    const key = ownerFromStorage();
    show(key, readList(key));
  }

  function commit(next: CartItem[]) {
    load();
    items = next;
    writeList(owner, next);
    emit();
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => snapshot,
    load,

    add(input: CartItemInput) {
      const qty = typeof input.qty === "number" && Number.isInteger(input.qty) && input.qty > 0 ? input.qty : 1;
      const [line] = sanitizeCartItems([{ ...input, qty }]);
      if (!line) return;
      load();
      commit(mergeCarts(items, [line]));
    },
    remove(id: string) {
      load();
      commit(items.filter((line) => line.id !== id));
    },
    update(id: string, delta: number) {
      load();
      commit(items
        .map((line) => (line.id === id ? { ...line, qty: Math.min(line.qty + delta, MAX_LINE_QTY) } : line))
        .filter((line) => line.qty > 0));
    },
    clear() {
      load();
      commit([]);
    },

    /**
     * A patient is signed in: show their cart with the guest cart merged in (quantities summed by product, 99 at most).
     * The guest key goes only once the account's cart holds its lines.
     */
    adoptUser(userId: string) {
      load();
      const key = userCartKey(userId);
      const guest = owner === GUEST_CART_KEY ? items : readList(GUEST_CART_KEY);
      const own = owner === key ? items : readList(key);
      const merged = mergeCarts(own, guest);
      if (writeList(key, merged)) removeRaw(GUEST_CART_KEY);
      writeRaw(CART_OWNER_KEY, key);
      show(key, merged);
    },

    /** Signed out: the cart in memory and every cart key of this browser (guest, every user, owner hint, legacy) are gone. */
    signOut() {
      load();
      try {
        const target = storage();
        const keys: string[] = [];
        for (let i = 0; target && i < target.length; i += 1) {
          const key = target.key(i);
          if (key && (key.startsWith(CART_KEY_PREFIX) || key === LEGACY_CART_KEY)) keys.push(key);
        }
        for (const key of keys) target?.removeItem(key);
      } catch { /* ignore */ }
      show(GUEST_CART_KEY, []);
    },

    /** Another tab changed a cart, signed in or signed out (`changedKey` null is storage.clear()): read it again. */
    syncFromStorage(changedKey: string | null) {
      if (!loaded) return;
      if (changedKey !== null && !changedKey.startsWith(CART_KEY_PREFIX)) return;
      const key = ownerFromStorage();
      show(key, readList(key));
    },
  };
}

export type CartStore = ReturnType<typeof createCartStore>;
