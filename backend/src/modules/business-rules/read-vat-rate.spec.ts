import { readVatRate } from './business-rules.module';

const db = (doc: unknown) => ({ collection: () => ({ findOne: async () => doc }) });

describe('readVatRate (one VAT for checkout, settlement and the finance report)', () => {
  it('reads tax.vat_percent as a percent', async () => {
    expect(await readVatRate(db({ tax: { vat_percent: 15 } }))).toBeCloseTo(0.15);
  });
  it('reads the old finance-suite vat_rate as a fraction, not as a percent', async () => {
    expect(await readVatRate(db({ vat_rate: 0.15 }))).toBeCloseTo(0.15);
  });
  it('prefers tax.vat_percent when both exist', async () => {
    expect(await readVatRate(db({ tax: { vat_percent: 15 }, vat_rate: 0.05 }))).toBeCloseTo(0.15);
  });
  it('falls back to the KSA 15% when there is no config', async () => {
    expect(await readVatRate(db(null))).toBeCloseTo(0.15);
  });
});
