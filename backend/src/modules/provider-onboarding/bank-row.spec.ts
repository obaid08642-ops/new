import { bankRowFromProfile, syncBankRow } from './bank-row';

const IBAN = 'SA0380000000608010167519';

function fakeConn(existing?: any) {
  const col = { findOne: jest.fn().mockResolvedValue(existing), insertOne: jest.fn().mockResolvedValue({}), updateOne: jest.fn().mockResolvedValue({}) };
  return { col, conn: { collection: (n: string) => { expect(n).toBe('provider_bank_accounts'); return col; } } };
}

describe('registration IBAN to bank row', () => {
  it('maps a valid IBAN to the bank and holder; nothing for a missing or invalid IBAN', () => {
    expect(bankRowFromProfile({ iban: 'sa03 8000 0000 6080 1016 7519', bank_account_name: ' Dr Ali ' })).toEqual({ bank_code: 'rajhi', bank_name: 'مصرف الراجحي', holder_name: 'Dr Ali', iban: IBAN });
    expect(bankRowFromProfile({ iban: 'SA12', legal_name: 'x' })).toBeNull();
    expect(bankRowFromProfile({})).toBeNull();
  });
  it('an unknown bank id is stored as "other", holder falls back to the legal name, VAT is kept', () => {
    const r = bankRowFromProfile({ iban: 'SA0399000000608010167519', legal_name: 'Lab Co', tax_number: '300123' });
    expect(r).toMatchObject({ bank_code: 'other', holder_name: 'Lab Co', vat_number: '300123' });
  });
  it('creates a pending row when none exists', async () => {
    const { col, conn } = fakeConn(undefined);
    await syncBankRow(conn, 'a1', bankRowFromProfile({ iban: IBAN, bank_account_name: 'X' }), () => 'id1');
    expect(col.insertOne).toHaveBeenCalledWith(expect.objectContaining({ id: 'id1', account_id: 'a1', iban: IBAN, review_status: 'pending' }));
  });
  it('the same IBAN keeps its review state; a new IBAN goes back to pending', async () => {
    const same = fakeConn({ iban: IBAN, review_status: 'approved' });
    await syncBankRow(same.conn, 'a1', bankRowFromProfile({ iban: IBAN, bank_account_name: 'X' }), () => 'id');
    expect(same.col.updateOne).not.toHaveBeenCalled();
    const changed = fakeConn({ iban: 'SA0310000000608010167519', review_status: 'approved' });
    await syncBankRow(changed.conn, 'a1', bankRowFromProfile({ iban: IBAN, bank_account_name: 'X' }), () => 'id');
    expect(changed.col.updateOne).toHaveBeenCalledWith({ account_id: 'a1' }, expect.objectContaining({ $set: expect.objectContaining({ iban: IBAN, review_status: 'pending' }) }));
  });
  it('no valid IBAN touches nothing', async () => {
    const { col, conn } = fakeConn(undefined);
    await syncBankRow(conn, 'a1', null, () => 'id');
    expect(col.findOne).not.toHaveBeenCalled();
  });
});
