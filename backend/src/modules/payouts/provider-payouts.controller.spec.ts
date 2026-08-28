import { BadRequestException } from '@nestjs/common';
import { ProviderPayoutsController } from './provider-payouts.controller';

describe('ProviderPayoutsController reservation integrity', () => {
  let withdrawals: any;
  let ledgerEntries: any;
  let bankAccounts: any;
  let financeConfig: any;
  let session: any;
  let controller: ProviderPayoutsController;

  beforeEach(() => {
    withdrawals = { createIndex: jest.fn(), findOne: jest.fn(), insertOne: jest.fn() };
    ledgerEntries = { aggregate: jest.fn(), insertOne: jest.fn() };
    bankAccounts = { findOne: jest.fn() };
    financeConfig = { findOne: jest.fn().mockResolvedValue({ payout_schedule: { minimum_payout_sar: 100 } }) };
    session = { withTransaction: jest.fn(async (fn: any) => fn()), endSession: jest.fn() };
    const conn: any = {
      collection: jest.fn((name: string) => ({ providerwithdrawals: withdrawals, platformledgerentries: ledgerEntries, provider_bank_accounts: bankAccounts, finance_config: financeConfig }[name])),
      startSession: jest.fn().mockResolvedValue(session),
    };
    controller = new ProviderPayoutsController(conn, { providerBalance: jest.fn() } as any);
  });

  it('allows pharmacy payout now that delivery settlement posts to the ledger (same guards as all providers)', async () => {
    withdrawals.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    bankAccounts.findOne.mockResolvedValue({ id: 'bank-1', iban: 'SA1234567890123456789012', bank_name: 'Bank', review_status: 'approved' });
    ledgerEntries.aggregate.mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ earned_cleared: 500, paid: 0, debits: 0, locked: 0, earned_pending: 25 }]) });
    const result = await controller.request({ id: 'pharmacy-a', role: 'pharmacy' }, { amount: 200, idempotency_key: 'pharmacy_payout_key_001' });
    expect(result).toEqual(expect.objectContaining({ ok: true, available_balance: 300 }));
    expect(withdrawals.insertOne).toHaveBeenCalledWith(expect.objectContaining({ provider_id: 'pharmacy-a', state: 'PENDING_ADMIN_APPROVAL' }), expect.objectContaining({ session }));
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
});
