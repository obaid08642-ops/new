/**
 * Copay settlement must never depend on a single best-effort event delivery.
 *
 * A paid copay that stays COPAY_PENDING is a money-taken / service-not-delivered
 * state, so the reconciliation sweep has to close it through the same guarded
 * path the event listener uses — and must refuse anything that does not match.
 */
import { InsuranceFlowService } from './insurance-engine.module';

const PATIENT = { id: 'patient-1', role: 'patient' };

/** Minimal in-memory stand-ins for the two models the settlement path touches. */
function setup(opts: { request?: any; payment?: any } = {}) {
  const service: any = Object.create(InsuranceFlowService.prototype);
  service.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
  service.events = { emit: jest.fn() };
  service.confirmServiceBooking = jest.fn().mockResolvedValue(undefined);

  const doc: any = opts.request ?? {
    id: 'req-1',
    patient_id: 'patient-1',
    provider_id: 'lab-1',
    booking_id: 'bk-1',
    booking_kind: 'lab',
    state: 'COPAY_PENDING',
    copay_amount: 20,
    history: [],
    save: jest.fn().mockImplementation(async function (this: any) { return this; }),
  };
  const payment = opts.payment === undefined ? { id: 'tx-1', status: 'paid', amount: 20 } : opts.payment;
  // findOne() is used both as `.lean()` (event path) and `.sort().lean()` (sweep).
  const paymentQuery = () => {
    const q: any = { lean: jest.fn().mockResolvedValue(payment) };
    q.sort = jest.fn().mockReturnValue(q);
    return q;
  };

  service.requests = {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc.state === 'COPAY_PENDING' && payment ? [{ ...doc, save: undefined }] : []) }),
      }),
    }),
    findOne: jest.fn().mockResolvedValue(doc),
  };
  service.transactions = { findOne: jest.fn().mockImplementation(paymentQuery) };
  return { service, doc };
}

describe('InsuranceFlowService.settleOne', () => {
  it('settles a copay whose paid transaction matches the amount', async () => {
    const { service, doc } = setup();

    const state = await service.settleOne(doc, 'tx-1');

    expect(state).toBe('COPAY_PAID');
    expect(doc.state).toBe('COPAY_PAID');
    expect(doc.payment_id).toBe('tx-1');
    expect(doc.history.at(-1)).toMatchObject({ state: 'COPAY_PAID', by: 'system' });
    expect(service.confirmServiceBooking).toHaveBeenCalledWith(doc);
  });

  it('refuses a payment that belongs to another patient', async () => {
    const { service, doc } = setup({ payment: { id: 'tx-1', status: 'paid', amount: 20, patient_id: 'someone-else' } });

    // The query itself scopes to the request's patient, so a foreign payment is
    // simply not found.
    service.transactions.findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    expect(await service.settleOne(doc, 'tx-1')).toBeNull();
    expect(doc.state).toBe('COPAY_PENDING');
    expect(service.confirmServiceBooking).not.toHaveBeenCalled();
  });

  it('refuses a payment whose amount does not equal the copay', async () => {
    const { service, doc } = setup({ payment: { id: 'tx-1', status: 'paid', amount: 999 } });

    expect(await service.settleOne(doc, 'tx-1')).toBeNull();
    expect(doc.state).toBe('COPAY_PENDING');
  });

  it('never re-settles a request that already reached COPAY_PAID', async () => {
    const { service, doc } = setup();
    doc.state = 'COPAY_PAID';

    expect(await service.settleOne(doc, 'tx-1')).toBeNull();
    expect(service.transactions.findOne).not.toHaveBeenCalled();
  });
});

describe('InsuranceFlowService.reconcileCopays', () => {
  it('closes a copay the event listener missed', async () => {
    const { service, doc } = setup();

    await service.reconcileCopays();

    expect(doc.state).toBe('COPAY_PAID');
    expect(service.confirmServiceBooking).toHaveBeenCalled();
    expect(service.logger.warn).toHaveBeenCalledWith(expect.stringContaining('settled 1'));
  });

  it('leaves a request alone when no paid transaction exists', async () => {
    const { service, doc } = setup({ payment: null });

    await service.reconcileCopays();

    expect(doc.state).toBe('COPAY_PENDING');
    expect(service.confirmServiceBooking).not.toHaveBeenCalled();
  });

  it('survives a database failure instead of throwing into the cron', async () => {
    const { service } = setup();
    service.requests.find = jest.fn(() => { throw new Error('mongo down'); });

    await expect(service.reconcileCopays()).resolves.toBeUndefined();
    expect(service.logger.warn).toHaveBeenCalledWith(expect.stringContaining('reconciliation failed'));
  });
});
