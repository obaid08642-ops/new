import { createPharmacyOrderSender } from './pharmacyOrderSend';

/** The one create-and-submit of a pharmacy order (checkout and reorder): safe to press twice and to retry. Boundaries only; TEST values. */
let mockCounter = 0;
jest.mock('./api', () => ({ apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => `n${++mockCounter}`) }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('./api') as { apiFetch: jest.Mock };

const draft = { items: [{ sku: 'a', qty: 1 }], fulfillment: 'delivery' };
const calls = (path: RegExp) => apiFetch.mock.calls.filter(([p]) => path.test(String(p)));
const header = (call: unknown[]) => (call[1] as { headers: Record<string, string> }).headers['Idempotency-Key'];
beforeEach(() => { mockCounter = 0; apiFetch.mockReset(); });

describe('createPharmacyOrderSender', () => {
  it('creates then submits, and resolves with the order id', async () => {
    apiFetch.mockImplementation(async (path: string) => (path === '/patient/pharmacy/orders' ? { id: 'o-1' } : {}));
    expect(await createPharmacyOrderSender('pharmacy-broadcast').send(draft)).toBe('o-1');
    expect(apiFetch.mock.calls.map(([p]) => p)).toEqual(['/patient/pharmacy/orders', '/patient/pharmacy/orders/o-1/submit']);
  });

  it('a retry after no answer sends the SAME keys, and an order that was created is only submitted again', async () => {
    const sender = createPharmacyOrderSender('pharmacy-reorder');
    let submitFails = true;
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/patient/pharmacy/orders') return { id: 'o-2' };
      if (submitFails) { submitFails = false; throw new Error('request_timeout'); }
      return {};
    });
    const error = await sender.send(draft).catch((e) => e);
    sender.failed(error);
    expect(sender.hasDraft).toBe(true);
    await sender.send(draft);
    expect(calls(/orders$/)).toHaveLength(1);
    const [first, second] = calls(/submit$/);
    expect(header(first)).toBe(header(second));
    expect(sender.hasDraft).toBe(false);
  });

  it('a server answer ends the attempt: the next one takes new keys; after a success the next send is a new order', async () => {
    const sender = createPharmacyOrderSender('pharmacy-broadcast');
    apiFetch.mockImplementationOnce(async () => { throw new Error('quote_expired'); });
    const error = await sender.send(draft).catch((e) => e);
    sender.failed(error);
    apiFetch.mockImplementation(async (path: string) => (path === '/patient/pharmacy/orders' ? { id: 'o-3' } : {}));
    await sender.send(draft);
    await sender.send(draft);
    const creates = calls(/orders$/);
    expect(new Set(creates.map(header)).size).toBe(3);
  });

  it('with editable, a changed body edits the created draft (no payment mode) instead of creating a second one', async () => {
    const sender = createPharmacyOrderSender('pharmacy-broadcast');
    let first = true;
    apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path === '/patient/pharmacy/orders') return { id: 'o-4' };
      if (path.endsWith('/submit') && first) { first = false; throw new Error('request_timeout'); }
      return init?.method === 'PATCH' ? {} : {};
    });
    sender.failed(await sender.send({ ...draft, payment_mode: 'cash' }, { editable: true }).catch((e) => e));
    await sender.send({ ...draft, payment_mode: 'cash', fulfillment: 'pickup' }, { editable: true });
    expect(calls(/orders$/)).toHaveLength(1);
    const patch = apiFetch.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patch?.[0]).toBe('/patient/pharmacy/orders/o-4');
    expect(JSON.parse(patch?.[1].body)).toEqual({ ...draft, fulfillment: 'pickup' });
  });

  it('refuses an answer without an order id', async () => {
    apiFetch.mockResolvedValue({});
    await expect(createPharmacyOrderSender('pharmacy-broadcast').send(draft)).rejects.toThrow('governed_pharmacy_order_id_missing');
  });
});
