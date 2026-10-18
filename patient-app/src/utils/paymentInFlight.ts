/**
 * 15.8 — a payment that was started and not yet seen to its end.
 *
 * Paying happens on the gateway's hosted page, outside the app. If the phone is switched off or the app is killed
 * meanwhile, nothing in the app remembers that a payment was under way, and the person reopens it on the home screen with
 * no idea whether they paid. So the result screen writes a small marker (ids only, never an amount or a card detail) before
 * it opens the hosted page, and removes it once the server has settled the payment (paid, failed, cancelled, refunded).
 * On launch and when the app comes back to the foreground, a marker still there takes the person to the result screen,
 * which asks the server for the real state — it never assumes one.
 *
 * The marker belongs to the account that started the payment; another account on the same phone never sees it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PAYMENT_IN_FLIGHT_KEY = 'nabd.payment.inflight.v1';
/** A payment older than this is not chased any more: the gateway session is long dead and the order page tells the truth. */
export const PAYMENT_IN_FLIGHT_MAX_AGE_MS = 72 * 60 * 60 * 1000;

export interface PaymentInFlight {
  userId: string;
  transactionId: string | null;
  gatewayId: string | null;
  bookingKind: string | null;
  bookingId: string | null;
  startedAt: number;
}

/** The signed-in account, set by <PaymentResume/> (which can read the store); screens that start a payment do not need the store. */
let currentAccount: string | null = null;
export function setPaymentAccount(userId: string | null | undefined): void {
  currentAccount = typeof userId === 'string' && userId ? userId : null;
}

const text = (v: unknown, max = 128): string | null => (typeof v === 'string' && /^[A-Za-z0-9._:-]+$/.test(v) && v.length <= max ? v : null);

export async function rememberPayment(input: { userId?: string | null; transactionId?: string | null; gatewayId?: string | null; bookingKind?: string | null; bookingId?: string | null }, now = Date.now()): Promise<void> {
  const userId = text(input.userId ?? currentAccount);
  const transactionId = text(input.transactionId);
  const gatewayId = text(input.gatewayId);
  if (!userId || (!transactionId && !gatewayId)) return;
  const marker: PaymentInFlight = { userId, transactionId, gatewayId, bookingKind: text(input.bookingKind, 32), bookingId: text(input.bookingId), startedAt: now };
  try {
    await AsyncStorage.setItem(PAYMENT_IN_FLIGHT_KEY, JSON.stringify(marker));
  } catch {
    /* a marker that cannot be written only costs the resume, never the payment */
  }
}

/** The marker for this account, or null (none, someone else's, too old, malformed). Malformed or stale markers are removed. */
export async function readPaymentInFlight(userId: string | null | undefined, now = Date.now()): Promise<PaymentInFlight | null> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(PAYMENT_IN_FLIGHT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as Partial<PaymentInFlight>;
    const ok = typeof m.userId === 'string' && typeof m.startedAt === 'number' && (m.transactionId || m.gatewayId);
    if (!ok || now - (m.startedAt as number) > PAYMENT_IN_FLIGHT_MAX_AGE_MS || (m.startedAt as number) > now + 60_000) {
      await clearPayment();
      return null;
    }
    if (!userId || m.userId !== userId) return null;
    return m as PaymentInFlight;
  } catch {
    await clearPayment();
    return null;
  }
}

/** Remove the marker. With an id, only when it is the marker of that payment (a newer payment is not wiped by an older screen). */
export async function clearPayment(transactionId?: string | null): Promise<void> {
  try {
    if (transactionId) {
      const raw = await AsyncStorage.getItem(PAYMENT_IN_FLIGHT_KEY);
      if (raw) {
        const m = JSON.parse(raw) as Partial<PaymentInFlight>;
        if (m.transactionId && m.transactionId !== transactionId && m.gatewayId !== transactionId) return;
      }
    }
    await AsyncStorage.removeItem(PAYMENT_IN_FLIGHT_KEY);
  } catch {
    /* nothing to do */
  }
}

/** The result screen's address for a marker. */
export function resumeHref(m: PaymentInFlight): { pathname: '/payments/result'; params: Record<string, string> } {
  const params: Record<string, string> = {};
  if (m.transactionId) params.transactionId = m.transactionId;
  if (m.gatewayId) params.gatewayId = m.gatewayId;
  if (m.bookingKind) params.bookingKind = m.bookingKind;
  if (m.bookingId) params.bookingId = m.bookingId;
  return { pathname: '/payments/result', params };
}

/** Whether to take the person to the result screen now: a marker exists and they are not already looking at payments. */
export function shouldResume(marker: PaymentInFlight | null, pathname: string | null | undefined): boolean {
  return !!marker && !String(pathname || '').startsWith('/payments');
}
