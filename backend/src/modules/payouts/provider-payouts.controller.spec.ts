import { BadRequestException } from '@nestjs/common';
import { ProviderPayoutsController } from './provider-payouts.controller';

describe('ProviderPayoutsController reservation integrity', () => {
  let withdrawals: any;
  let ledgerEntries: any;
  let bankAccounts: any;
  let financeConfig: any;
  let session: any;
  let locks: any;
  let controller: ProviderPayoutsController;
  let ledgerMock: any;

  beforeEach(() => {
    withdrawals = { createIndex: jest.fn(), findOne: jest.fn(), insertOne: jest.fn() };
    ledgerEntries = { aggregate: jest.fn(), insertOne: jest.fn() };
    bankAccounts = { findOne: jest.fn() };
    locks = { createIndex: jest.fn(), updateOne: jest.fn().mockResolvedValue({}) };
    financeConfig = { findOne: jest.fn().mockResolvedValue({ payout_schedule: { minimum_payout_sar: 100 } }) };
    session = { withTransaction: jest.fn(async (fn: any) => fn()), endSession: jest.fn() };
    const conn: any = {
      collection: jest.fn((name: string) => ({ providerwithdrawals: withdrawals, platformledgerentries: ledgerEntries, provider_bank_accounts: bankAccounts, finance_config: financeConfig, provider_withdrawal_locks: locks }[name])),
      startSession: jest.fn().mockResolvedValue(session),
    };
    ledgerMock = { providerBalance: jest.fn(), matureEscrow: jest.fn().mockResolvedValue(undefined) };
    controller = new ProviderPayoutsController(conn, ledgerMock as any);
  });

  it('allows pharmacy payout now that delivery settlement posts to the ledger (same guards as all providers)', async () => {
    withdrawals.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    bankAccounts.findOne.mockResolvedValue({ id: 'bank-1', iban: 'SA1234567890123456789012', bank_name: 'Bank', review_status: 'approved' });
    ledgerEntries.aggregate.mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ earned_cleared: 500, paid: 0, debits: 0, locked: 0, earned_pending: 25 }]) });
    const result = await controller.request({ id: 'pharmacy-a', role: 'pharmacy' }, { amount: 200, idempotency_key: 'pharmacy_payout_key_001' });
    expect(result).toEqual(expect.objectContaining({ ok: true, available_balance: 300 }));
    expect(withdrawals.insertOne).toHaveBeenCalledWith(expect.objectContaining({ provider_id: 'pharmacy-a', state: 'PENDING_ADMIN_APPROVAL' }), expect.objectContaining({ session }));
  });

  it('earnings whose hold has passed are matured BEFORE the balance is summed (this route never went through providerBalance)', async () => {
    withdrawals.findOne.mockResolvedValue(null);
    bankAccounts.findOne.mockResolvedValue({ id: 'bank-1', iban: 'SA1234567890123456789012', bank_name: 'Bank', review_status: 'approved' });
    const order: string[] = [];
    ledgerMock.matureEscrow.mockImplementation(async () => { order.push('mature'); });
    ledgerEntries.aggregate.mockImplementation(() => { order.push('sum'); return { toArray: jest.fn().mockResolvedValue([{ earned_cleared: 500, paid: 0, debits: 0, locked: 0, earned_pending: 0 }]) }; });
    await controller.request({ id: 'prov-m', role: 'doctor' }, { amount: 200, idempotency_key: 'mature_before_sum_key_01' });
    expect(ledgerMock.matureEscrow).toHaveBeenCalledWith('prov-m');
    expect(order.slice(0, 2)).toEqual(['mature', 'sum']);
  });

  it('fails closed without an approved bank account before starting a reservation', async () => {
    withdrawals.findOne.mockResolvedValue(null);
    bankAccounts.findOne.mockResolvedValue(null);
    await expect(controller.request({ id: 'provider-a', role: 'provider' }, { amount: 100, idempotency_key: 'payout_request_key_0001' }))
      .rejects.toThrow(BadRequestException);
    expect(session.withTransaction).not.toHaveBeenCalled();
    expect(withdrawals.insertOne).not.toHaveBeenCalled();
  });

  it('returns the existing request for the same idempotency key without a second reservation', async () => {
    withdrawals.findOne.mockResolvedValue({ id: 'wd-existing', reference: 'PAYOUT-EXISTING' });
    await expect(controller.request({ id: 'provider-a', role: 'provider' }, { amount: 100, idempotency_key: 'payout_request_key_0002' }))
      .resolves.toEqual(expect.objectContaining({ ok: true, idempotent: true, reference: 'PAYOUT-EXISTING' }));
    expect(withdrawals.insertOne).not.toHaveBeenCalled();
    expect(ledgerEntries.insertOne).not.toHaveBeenCalled();
  });

  it('creates one pending-admin request and one locked ledger reservation in the same transaction', async () => {
    withdrawals.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    bankAccounts.findOne.mockResolvedValue({ id: 'bank-1', iban: 'SA1234567890123456789012', bank_name: 'Bank', review_status: 'approved' });
    ledgerEntries.aggregate.mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ earned_cleared: 500, paid: 0, debits: 0, locked: 0, earned_pending: 25 }]) });
    const result = await controller.request({ id: 'provider-a', role: 'provider' }, { amount: 200, idempotency_key: 'payout_request_key_0003' });
    expect(result).toEqual(expect.objectContaining({ ok: true, available_balance: 300 }));
    expect(withdrawals.insertOne).toHaveBeenCalledWith(expect.objectContaining({ state: 'PENDING_ADMIN_APPROVAL', bank_review_status: 'approved' }), expect.objectContaining({ session }));
    expect(ledgerEntries.insertOne).toHaveBeenCalledWith(expect.objectContaining({ type: 'payout', state: 'locked', amount: 200, ref_type: 'withdrawal_reservation' }), expect.objectContaining({ session }));
    expect(session.endSession).toHaveBeenCalled();
  });

  it('writes the provider\'s lock document in the transaction before the balance is read, so concurrent requests are serialized', async () => {
    const order: string[] = [];
    locks.updateOne.mockImplementation(async (_f: any, _u: any, opts: any) => { order.push(opts?.session ? 'lock-in-session' : 'lock-ensure'); return {}; });
    withdrawals.findOne.mockResolvedValue(null);
    withdrawals.insertOne.mockImplementation(async () => { order.push('insert'); });
    bankAccounts.findOne.mockResolvedValue({ id: 'bank-1', iban: 'SA1234567890123456789012', bank_name: 'Bank', review_status: 'approved' });
    ledgerEntries.aggregate.mockImplementation(() => { order.push('balance'); return { toArray: jest.fn().mockResolvedValue([{ earned_cleared: 500, paid: 0, debits: 0, locked: 0, earned_pending: 0 }]) }; });
    await controller.request({ id: 'provider-a', role: 'provider' }, { amount: 200, idempotency_key: 'payout_request_key_0010' });
    expect(order).toEqual(['lock-ensure', 'lock-in-session', 'balance', 'insert']);
    expect(locks.createIndex).toHaveBeenCalledWith({ provider_id: 1 }, { unique: true });
    expect(locks.updateOne).toHaveBeenLastCalledWith({ provider_id: 'provider-a' }, expect.objectContaining({ $inc: { n: 1 } }), { session });
  });

  it('a second request that runs after the first sees the open withdrawal and is refused (what the retried transaction does)', async () => {
    // 1: the idempotency lookup before the transaction, 2: the same lookup inside it, 3: the open-withdrawal check
    withdrawals.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'wd-open', state: 'PENDING_ADMIN_APPROVAL' });
    bankAccounts.findOne.mockResolvedValue({ id: 'bank-1', iban: 'SA1234567890123456789012', bank_name: 'Bank', review_status: 'approved' });
    ledgerEntries.aggregate.mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ earned_cleared: 500, paid: 0, debits: 0, locked: 200, earned_pending: 0 }]) });
    await expect(controller.request({ id: 'provider-a', role: 'provider' }, { amount: 150, idempotency_key: 'payout_request_key_0011' }))
      .rejects.toThrow('pending_withdrawal_exists');
    expect(withdrawals.insertOne).not.toHaveBeenCalled();
    expect(ledgerEntries.insertOne).not.toHaveBeenCalled();
  });

  it('losing the race to create the lock document is fine (duplicate key), any other error is not swallowed', async () => {
    withdrawals.findOne.mockResolvedValue(null);
    bankAccounts.findOne.mockResolvedValue({ id: 'bank-1', iban: 'SA1234567890123456789012', bank_name: 'Bank', review_status: 'approved' });
    ledgerEntries.aggregate.mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ earned_cleared: 500, paid: 0, debits: 0, locked: 0, earned_pending: 0 }]) });
    locks.updateOne.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 })).mockResolvedValue({});
    await expect(controller.request({ id: 'provider-a', role: 'provider' }, { amount: 200, idempotency_key: 'payout_request_key_0012' })).resolves.toEqual(expect.objectContaining({ ok: true }));
    locks.updateOne.mockReset().mockRejectedValueOnce(new Error('db down'));
    await expect(controller.request({ id: 'provider-a', role: 'provider' }, { amount: 200, idempotency_key: 'payout_request_key_0013' })).rejects.toThrow('db down');
  });
});
