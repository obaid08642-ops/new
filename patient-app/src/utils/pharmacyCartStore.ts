/**
 * The pharmacy cart's data and rules, with no React and no network in it (src/context/CartContext wraps it for the screens).
 *
 * LOCAL-FIRST (owner decision 2026-10-06). A pharmacy order is broadcast to the pharmacies and they answer with offers, so a
 * cart line is only what the patient wants (a medicine and a quantity): never a price, a subtotal or a stock figure.
 * Adding, removing and changing a line only touch this device's storage and never call the backend, so they work with the
 * backend down. Only "send the request" (the checkout) needs the backend.
 *
 * Storage (AsyncStorage), per owner: `@nabd_cart_v2:device` for a visitor or a guest account and
 * `@nabd_cart_v2:user:<id>` for a signed-in patient; `@nabd_cart_v2:owner` remembers which one was current, because the auth
 * slice is not persisted and starts empty after a restart. Signing in merges the device cart into the patient's (quantities
 * summed by medicine, 99 at most); signing out clears the cart in memory and every `@nabd_cart_v2:*` key.
 */
export interface CartItem {
  id: string;
  name: string;
  qty: number;
  rx: boolean;
  image?: string;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
  activeIngredient?: string;
  /** The medicine's `online_exclusive`, stored when the line is added (absent on lines saved before it existed, and when the source did not know it). */
  onlineOnly?: boolean;
}

export type CartItemInput = Omit<CartItem, 'qty'> & { qty?: number };

export const MAX_LINE_QTY = 99;
export const CART_KEY_PREFIX = '@nabd_cart_v2:';
export const DEVICE_CART_KEY = `${CART_KEY_PREFIX}device`;
export const CART_OWNER_KEY = `${CART_KEY_PREFIX}owner`;
export const userCartKey = (userId: string) => `${CART_KEY_PREFIX}user:${userId}`;

/** What AsyncStorage offers, as far as the cart uses it. */
export interface CartStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
}

/** The only fields a local cart line keeps: any other field (a price, a payment choice, points) is dropped on the way in. */
export function sanitizePharmacyCartItem(item: CartItemInput): CartItem {
  const { id, name, rx, image, icon, iconColor, iconBg, activeIngredient, onlineOnly, qty } = item;
  return { id, name, rx, image, icon, iconColor, iconBg, activeIngredient, ...(onlineOnly === true ? { onlineOnly: true } : {}), qty: qty || 1 };
}

/** What the device stored, kept only when it is a usable line (a corrupt or hand-edited entry must not break the cart). */
export function sanitizeStoredCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): CartItem[] => {
    if (!entry || typeof entry !== 'object') return [];
    const line = entry as Record<string, unknown>;
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined);
    const id = text(line.id);
    const name = text(line.name);
    const qty = typeof line.qty === 'number' && Number.isInteger(line.qty) && line.qty >= 1 ? Math.min(line.qty, MAX_LINE_QTY) : null;
    if (!id || !name || qty === null) return [];
    return [sanitizePharmacyCartItem({ id, name, qty, rx: line.rx === true, image: text(line.image), icon: text(line.icon), iconColor: text(line.iconColor), iconBg: text(line.iconBg), activeIngredient: text(line.activeIngredient), onlineOnly: line.onlineOnly === true })];
  });
}

/** `extra` joins `base`: the same medicine adds up (99 at most) and keeps the line data of `base` (the online-only flag is set when either line has it); a new one is appended. */
export function mergeCarts(base: CartItem[], extra: CartItem[]): CartItem[] {
  const merged = base.map((line) => ({ ...line }));
  for (const line of extra) {
    const at = merged.findIndex((existing) => existing.id === line.id);
    if (at >= 0) merged[at] = { ...merged[at], ...(line.onlineOnly ? { onlineOnly: true } : {}), qty: Math.min(merged[at].qty + line.qty, MAX_LINE_QTY) };
    else merged.push({ ...line });
  }
  return merged;
}

export type CartSnapshot = { items: CartItem[]; ready: boolean };
export const EMPTY_CART_SNAPSHOT: CartSnapshot = { items: [], ready: false };

export function createPharmacyCartStore(storage: CartStorage) {
  let items: CartItem[] = [];
  let owner = DEVICE_CART_KEY;
  let loaded = false;
  let loading: Promise<void> | null = null;
  let snapshot: CartSnapshot = EMPTY_CART_SNAPSHOT;
  // writes go to storage one after another, in the order the cart changed, so the last change is the one that stays
  let queue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();

  const emit = () => {
    snapshot = { items, ready: loaded };
    listeners.forEach((listener) => listener());
  };
  const show = (key: string, list: CartItem[]) => {
    owner = key;
    items = list;
    emit();
  };
  /** Queue a storage job; a failing storage never breaks the cart (it keeps working in memory), the job reports whether it worked. */
  const enqueue = <T>(job: () => Promise<T>, fallback: T): Promise<T> => {
    const next = queue.then(job, job).catch(() => fallback);
    queue = next;
    return next;
  };
  const readList = (key: string) =>
    enqueue(async () => {
      const raw = await storage.getItem(key);
      if (!raw) return [] as CartItem[];
      try { return sanitizeStoredCart(JSON.parse(raw)); } catch { return [] as CartItem[]; }
    }, [] as CartItem[]);
  const writeList = (key: string, list: CartItem[]) => enqueue(async () => { await storage.setItem(key, JSON.stringify(list)); return true; }, false);
  const removeKey = (key: string) => enqueue(async () => { await storage.removeItem(key); return true; }, false);

  /** Read what this device kept (no request): the last known owner's cart. Once; every operation waits for it. */
  function load(): Promise<void> {
    if (!loading) {
      loading = (async () => {
        const hint = await enqueue(() => storage.getItem(CART_OWNER_KEY), null as string | null);
        const key = hint && hint.startsWith(`${CART_KEY_PREFIX}user:`) ? hint : DEVICE_CART_KEY;
        const list = await readList(key);
        loaded = true;
        show(key, list);
      })();
    }
    return loading;
  }

  async function commit(next: CartItem[]): Promise<void> {
    items = next;
    emit();
    await writeList(owner, next);
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => snapshot,
    load,

    async add(input: CartItemInput): Promise<void> {
      await load();
      const qty = typeof input.qty === 'number' && Number.isInteger(input.qty) && input.qty > 0 ? input.qty : 1;
      const [line] = sanitizeStoredCart([{ ...sanitizePharmacyCartItem(input), qty }]);
      if (!line) return;
      await commit(mergeCarts(items, [line]));
    },
    async remove(id: string): Promise<void> {
      await load();
      await commit(items.filter((line) => line.id !== id));
    },
    async update(id: string, delta: number): Promise<void> {
      await load();
      await commit(items
        .map((line) => (line.id === id ? { ...line, qty: Math.min(line.qty + delta, MAX_LINE_QTY) } : line))
        .filter((line) => line.qty > 0));
    },
    async clear(): Promise<void> {
      await load();
      await commit([]);
    },

    /**
     * A patient (not a guest account) is signed in: show their cart with the device cart merged in. The device key goes only
     * once the patient's cart holds its lines.
     */
    async adoptUser(userId: string): Promise<void> {
      await load();
      const key = userCartKey(userId);
      // read what is on the device first, then merge with the cart as it is NOW (a line added meanwhile is not lost)
      const storedDevice = owner === DEVICE_CART_KEY ? null : await readList(DEVICE_CART_KEY);
      const storedOwn = owner === key ? null : await readList(key);
      const merged = mergeCarts(storedOwn ?? items, storedDevice ?? items);
      show(key, merged);
      if (await writeList(key, merged)) await removeKey(DEVICE_CART_KEY);
      await enqueue(() => storage.setItem(CART_OWNER_KEY, key), undefined);
    },

    /** Signed out: the cart in memory and every cart key of this device are gone. */
    async signOut(): Promise<void> {
      await load();
      show(DEVICE_CART_KEY, []);
      await enqueue(async () => {
        const keys = (await storage.getAllKeys()).filter((key) => key.startsWith(CART_KEY_PREFIX));
        if (keys.length) await storage.multiRemove(keys);
      }, undefined);
    },
  };
}

export type PharmacyCartStore = ReturnType<typeof createPharmacyCartStore>;
