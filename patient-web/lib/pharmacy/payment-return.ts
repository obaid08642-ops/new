/**
 * The payment provider sends the patient back to /payments/result with ITS payment id only (the callback address is set
 * by the backend and carries no order or transaction reference). So that the result screen can ask the backend about the
 * right payment, the payment screen remembers, in this tab's sessionStorage, which order and which transaction it just
 * handed to the provider.
 *
 * This is a pointer, not a claim: it holds two ids and a time, never a card detail, a token or a result, and the result
 * screen never reads "paid" from it. The status always comes from the backend (the order's `payment_status`, or the
 * verified transaction); a wrong or missing pointer can only make the screen ask about something it cannot see.
 */
const KEY = "nabd.payment.return";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PaymentPointer = { orderId: string; transactionId: string };

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function rememberPayment(pointer: PaymentPointer, now: number = Date.now(), target: Storage | null = store()): void {
  if (!target || !UUID.test(pointer.orderId) || !UUID.test(pointer.transactionId)) return;
  try {
    target.setItem(KEY, JSON.stringify({ ...pointer, at: now }));
  } catch {
    // storage can be blocked: the result screen then has only what the address carries
  }
}

export function recallPayment(now: number = Date.now(), target: Storage | null = store()): PaymentPointer | null {
  if (!target) return null;
  try {
    const raw = target.getItem(KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const { orderId, transactionId, at } = value as Record<string, unknown>;
    if (typeof orderId !== "string" || typeof transactionId !== "string" || typeof at !== "number") return null;
    if (!UUID.test(orderId) || !UUID.test(transactionId) || now - at > MAX_AGE_MS || now < at) return null;
    return { orderId, transactionId };
  } catch {
    return null;
  }
}

export function forgetPayment(target: Storage | null = store()): void {
  try {
    target?.removeItem(KEY);
  } catch {
    // nothing to clean up
  }
}
