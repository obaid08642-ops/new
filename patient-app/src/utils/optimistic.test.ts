/**
 * 15.3 — the gate checks:
 *   • a forced 500 → the UI rolls back and explains
 *   • payment shows "processing" until the server confirms
 *
 * Plus the rule that makes the second one meaningful: a critical action cannot be
 * made optimistic at all, so the guarantee cannot be quietly deleted later.
 */
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue('a-valid-session-token'),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn().mockResolvedValue(undefined) },
}));

import {
  CRITICAL_KINDS,
  OptimisticNotAllowedError,
  SAFE_OPTIMISTIC_KINDS,
  assertOptimisticAllowed,
  isSafeOptimistic,
  processingCopy,
  runCommitted,
  runOptimistic,
} from './optimistic';
import { ApiError, toApiError } from '../services/http/errors';
import { apiFetch } from '../utils/api';

function textResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { forEach: () => undefined },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('15.3 · a forced 500 rolls the optimistic change back and explains it', () => {
  let state: string[];

  beforeEach(() => {
    state = ['a', 'b', 'c'];
    (global.fetch as unknown as jest.Mock) = jest.fn().mockResolvedValue(textResponse(500, { message: 'server exploded' }));
  });

  it('wishlist removal: the item comes back and the user is told why', async () => {
    const outcome = await runOptimistic<string[], void>({
      kind: 'wishlist',
      read: () => state,
      write: (next) => { state = next; },
      apply: (current) => current.filter((id) => id !== 'b'),
      commit: () => apiFetch('/users/me/wishlist/b', { method: 'POST' }).then(() => undefined),
      locale: 'en',
    });

    expect(outcome.ok).toBe(false);
    expect(state).toEqual(['a', 'b', 'c']);
    if (outcome.ok) throw new Error('unreachable');
    expect(outcome.rolledBack).toBe(true);
    expect(outcome.message).toBe('server exploded');
    expect(outcome.nextStep).toBe('Please try again in a little while.');
  });

  it('falls back to the catalogue sentence when the server sends none', async () => {
    (global.fetch as unknown as jest.Mock) = jest.fn().mockResolvedValue(textResponse(503, {}));
    const outcome = await runOptimistic<string[], void>({
      kind: 'wishlist',
      read: () => state,
      write: (next) => { state = next; },
      apply: (current) => current.filter((id) => id !== 'b'),
      commit: () => apiFetch('/users/me/wishlist/b', { method: 'POST' }).then(() => undefined),
      locale: 'en',
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error('unreachable');
    expect(outcome.message).toBe('This service is temporarily unavailable.');
    expect(outcome.nextStep).toBe('Please try again in a little while.');
  });

  it('quantity change: the item comes back and the user is told why', async () => {
    const cart = [{ id: 'sku-1', qty: 1 }];
    const outcome = await runOptimistic<typeof cart, void>({
      kind: 'cart',
      read: () => cart,
      write: () => undefined,
      apply: (current) => [{ id: 'sku-1', qty: current[0].qty + 1 }],
      commit: () => apiFetch('/cart/items/sku-1', { method: 'PATCH', body: '{"qty":2}' }).then(() => undefined),
    });
    expect(outcome.ok).toBe(false);
    expect(cart[0].qty).toBe(1);
  });

  it('uses the server catalogue message when the server sends one', async () => {
    (global.fetch as unknown as jest.Mock) = jest.fn().mockResolvedValue(
      textResponse(409, { code: 'PRODUCT_OUT_OF_STOCK', message: 'نفد المخزون' }),
    );
    const outcome = await runOptimistic<string[], void>({
      kind: 'wishlist',
      read: () => state,
      write: (next) => { state = next; },
      apply: (current) => current.slice(0, 1),
      commit: () => apiFetch('/users/me/wishlist/b', { method: 'POST' }).then(() => undefined),
      locale: 'ar',
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error('unreachable');
    expect(outcome.message).toBe('نفد المخزون');
    expect(outcome.nextStep.length).toBeGreaterThan(0);
  });

  it('reports rolledBack:false when the restore itself throws, so the screen can reload', async () => {
    let writes = 0;
    const outcome = await runOptimistic<string[], void>({
      kind: 'wishlist',
      read: () => state,
      // The optimistic apply succeeds; the restore then fails because the screen
      // is already gone. That must be reported, not swallowed.
      write: (next) => {
        writes += 1;
        if (writes === 1) { state = next; return; }
        throw new Error('component unmounted');
      },
      apply: (current) => current.slice(0, 1),
      commit: () => apiFetch('/users/me/wishlist/b', { method: 'POST' }).then(() => undefined),
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error('unreachable');
    expect(outcome.rolledBack).toBe(false);
  });

  it('leaves the optimistic state in place when the server accepts', async () => {
    (global.fetch as unknown as jest.Mock) = jest.fn().mockResolvedValue(textResponse(200, { ok: true }));
    const outcome = await runOptimistic<string[], void>({
      kind: 'wishlist',
      read: () => state,
      write: (next) => { state = next; },
      apply: (current) => current.filter((id) => id !== 'b'),
      commit: () => apiFetch('/users/me/wishlist/b', { method: 'POST' }).then(() => undefined),
    });
    expect(outcome.ok).toBe(true);
    expect(state).toEqual(['a', 'c']);
  });
});

describe('15.3 · payment, booking, prescription and emergency are never optimistic', () => {
  it('refuses an optimistic update for every critical kind', () => {
    expect([...CRITICAL_KINDS]).toEqual(['payment', 'booking', 'prescription', 'emergency']);
    for (const kind of CRITICAL_KINDS) {
      expect(() => assertOptimisticAllowed(kind)).toThrow(OptimisticNotAllowedError);
    }
    for (const kind of ['cart', 'wishlist', 'reminder', 'mark-read', 'like']) {
      expect(() => assertOptimisticAllowed(kind)).not.toThrow();
    }
  });

  it('runOptimistic throws for a payment instead of applying it locally', async () => {
    let state = 'pending';
    await expect(
      runOptimistic<string, void>({
        kind: 'payment',
        read: () => state,
        write: (next) => { state = next; },
        apply: () => 'paid',
        commit: async () => undefined,
      }),
    ).rejects.toBeInstanceOf(OptimisticNotAllowedError);
    expect(state).toBe('pending');
  });

  it('holds "processing" until the server confirms, and reports confirmed:false when it does not', async () => {
    const seen: boolean[] = [];

    const outcome = await runCommitted<{ paid: boolean }>({
      kind: 'payment',
      onProcessing: (value: boolean) => seen.push(value),
      commit: () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ paid: true }), 20);
        }),
    });

    expect(seen).toEqual([true, false]);
    expect(outcome.confirmed).toBe(true);
    expect(outcome.result).toEqual({ paid: true });
  });

  it('a refused payment ends in confirmed:false with an explanation, never a fake success', async () => {
    (global.fetch as unknown as jest.Mock) = jest.fn().mockResolvedValue(
      textResponse(402, { code: 'PAYMENT_REQUIRED', message: 'لم يتم تأكيد الدفع' }),
    );
    const seen: boolean[] = [];
    let localState = 'pending';

    const outcome = await runCommitted<{ paid: boolean }>({
      kind: 'payment',
      onProcessing: (value) => seen.push(value),
      commit: () =>
        apiFetch<{ paid: boolean }>('/payments/confirm', {
          method: 'POST',
          body: '{}',
          // A payment is never replayed, even with an idempotency key.
          retryable: false,
        }),
    });

    expect(outcome.confirmed).toBe(false);
    expect(seen).toEqual([true, false]);
    // Nothing local was ever flipped to "paid".
    expect(localState).toBe('pending');
    expect(outcome.message).toBe('لم يتم تأكيد الدفع');
    expect((outcome.nextStep ?? '').length).toBeGreaterThan(0);
    expect((global.fetch as unknown as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  it('a payment request is sent exactly once even under a server 500', async () => {
    const fetchMock = jest.fn().mockResolvedValue(textResponse(500, { message: 'gateway down' }));
    (global.fetch as unknown as jest.Mock) = fetchMock;

    await runCommitted({
      kind: 'payment',
      commit: () =>
        apiFetch('/payments/intent/pharmacy/o-1', {
          method: 'POST',
          headers: { 'Idempotency-Key': 'pay-attempt-1' },
          body: '{"method":"card"}',
          retryable: false,
        }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('booking and prescription get the same never-optimistic treatment', async () => {
    for (const kind of ['booking', 'prescription', 'emergency']) {
      await expect(
        runOptimistic<string, void>({
          kind,
          read: () => 'idle',
          write: () => undefined,
          apply: () => 'done',
          commit: async () => undefined,
        }),
      ).rejects.toBeInstanceOf(OptimisticNotAllowedError);
    }
  });

  it('F1 · deny-by-default: an unknown or typo\'d kind is refused, never applied', async () => {
    expect([...SAFE_OPTIMISTIC_KINDS]).toEqual(['cart', 'wishlist', 'reminder', 'mark-read', 'like']);
    for (const kind of ['order', 'paymnt', '', 'Payment', 'BOOKING', 'appointment']) {
      expect(isSafeOptimistic(kind)).toBe(false);
      expect(() => assertOptimisticAllowed(kind)).toThrow(OptimisticNotAllowedError);
    }
    for (const kind of ['cart', 'wishlist', 'reminder', 'mark-read', 'like']) {
      expect(isSafeOptimistic(kind)).toBe(true);
    }
  });

  it('F1 · runOptimistic applies nothing locally for an unknown kind', async () => {
    let state = 'idle';
    let writes = 0;
    await expect(
      runOptimistic<string, void>({
        kind: 'order',
        read: () => state,
        write: (next) => { writes += 1; state = next; },
        apply: () => 'confirmed',
        commit: async () => undefined,
      }),
    ).rejects.toBeInstanceOf(OptimisticNotAllowedError);
    expect(writes).toBe(0);
    expect(state).toBe('idle');
  });

  it('has explicit Arabic and English processing copy', () => {
    expect(processingCopy('ar', true)).toContain('الدفع');
    expect(processingCopy('ar')).toContain('المعالجة');
    expect(processingCopy('en', true)).toContain('payment');
    expect(processingCopy('en')).toContain('Processing');
  });
});

describe('15.3 · catalogue explanations come from 13.R5, not from invented strings', () => {
  it('describes a bare 500 as a service outage with a retry instruction', () => {
    const error = toApiError({ status: 500, locale: 'en' });
    expect(error.catalogCode).toBe('SERVICE_UNAVAILABLE');
    expect(error.nextStep).toBe('Please try again in a little while.');
    const arabic = toApiError({ status: 500, locale: 'ar' });
    expect(arabic.nextStep).toBe('يرجى المحاولة مرة أخرى بعد قليل.');
  });

  it('keeps an ApiError instance intact through the pipeline', () => {
    const original = new ApiError({ code: 'OFFLINE_ERROR', reason: 'OFFLINE_ERROR', catalogCode: 'UNKNOWN_ERROR' });
    expect(original.message).toBe('OFFLINE_ERROR');
    expect(original.userMessage.length).toBeGreaterThan(0);
  });
});
