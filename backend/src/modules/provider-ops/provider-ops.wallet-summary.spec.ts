import { ProviderOpsController } from './provider-ops.module';

// GET /provider/ops/wallet/ledger: the revenue screen's "pending" and "balance" come from the same balance as the wallet and the payout request.
describe('wallet ledger summary', () => {
  // 3 cleared earnings of 100 (one refunded: 40 clawed back), one pending earning of 70 (escrow), one payout of 50
  const rows = [
    { type: 'provider_earning', state: 'cleared', amount: 100 }, { type: 'provider_earning', state: 'cleared', amount: 100 }, { type: 'provider_earning', state: 'cleared', amount: 100 },
    { type: 'provider_earning', state: 'pending', amount: 70 }, { type: 'provider_debit', state: 'cleared', amount: 40 }, { type: 'payout', state: 'cleared', amount: 50 },
  ];
  const svc: any = {
    walletLedger: jest.fn().mockResolvedValue({ transactions: rows, summary: { earned: 370, paid: 50, pending: 70, balance: 320 } }),
  };
  const balance = { available: 210, pending: 70, locked: 0, lifetime_earned: 370, paid_out: 50, debits: 40, negative: false };

  it('uses the ledger balance: escrow is not available, the clawback and the payout are subtracted', async () => {
    const ledger: any = { providerBalance: jest.fn().mockResolvedValue(balance) };
    const out = await new ProviderOpsController(svc, ledger).wallet({ id: 'prov-1' }, undefined);
    expect(ledger.providerBalance).toHaveBeenCalledWith('prov-1');
    expect(out.summary).toEqual({ earned: 370, paid: 50, pending: 70, balance: 210, debits: 40, locked: 0 });
    expect(out.transactions).toBe(rows);
  });

  it('a provider in debt sees the negative balance, not 0', async () => {
    const ledger: any = { providerBalance: jest.fn().mockResolvedValue({ ...balance, available: -25, negative: true }) };
    const out = await new ProviderOpsController(svc, ledger).wallet({ id: 'prov-1' }, undefined);
    expect(out.summary.balance).toBe(-25);
  });

  it('without the ledger service the answer is the legacy one (unchanged)', async () => {
    const out = await new ProviderOpsController(svc).wallet({ id: 'prov-1' }, undefined);
    expect(out.summary.balance).toBe(320);
  });
});
