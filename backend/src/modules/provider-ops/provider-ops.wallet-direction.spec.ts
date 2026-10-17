import { ProviderCompatController } from './provider-ops.module';

describe('GET /provider/wallet/transactions direction', () => {
  const at = new Date('2026-10-02T10:00:00Z');

  // The ledger stores payouts, clawbacks, penalties and chargebacks with a POSITIVE amount and subtracts them in
  // LedgerService.providerBalance, so the sign of the amount cannot decide the direction.
  async function list(rows: any[]) {
    const svc = { walletLedger: jest.fn().mockResolvedValue({ transactions: rows }) };
    const controller = new ProviderCompatController(svc as never, {} as never);
    return controller.walletTx({ id: 'prov-1' });
  }

  it.each(['provider_debit', 'penalty', 'chargeback', 'payout'])('%s is a DEBIT with the absolute amount', async (type) => {
    const out = await list([{ id: 'le_1', type, amount: 45, description: 'x', createdAt: at }]);
    expect(out).toEqual([{ id: 'le_1', date: '2026-10-02', type: 'DEBIT', amount: 45, title: 'x' }]);
  });

  it.each(['provider_earning', 'bonus', 'referral'])('%s is a CREDIT', async (type) => {
    const out = await list([{ id: 'le_2', type, amount: 90, description: 'y', createdAt: at }]);
    expect(out).toEqual([{ id: 'le_2', date: '2026-10-02', type: 'CREDIT', amount: 90, title: 'y' }]);
  });
});
