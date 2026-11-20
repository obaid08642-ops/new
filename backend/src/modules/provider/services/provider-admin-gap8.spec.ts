import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProviderAdminService } from './provider-admin.service';

describe('provider admin: reject a bank account, licence expiry list (gap 8)', () => {
  const ADMIN = { id: 'admin-1', role: 'admin' };
  function make(opts: { modified?: number; profiles?: any[] } = {}) {
    const find = jest.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => opts.profiles || [] }) }) }));
    const db = { collection: jest.fn(() => ({ find })) };
    const accounts: any = { findOne: jest.fn(async () => ({ id: 'acc-1' })), model: { db } };
    const banks: any = { updateMany: jest.fn(async () => ({ modifiedCount: opts.modified ?? 1 })) };
    const audit: any = { create: jest.fn(async () => null) };
    const svc = new ProviderAdminService(accounts, {} as any, {} as any, banks, audit, {} as any, {} as any, {} as any);
    return { svc, banks, audit, find, accounts };
  }

  it('rejects a bank account that waits for review: status, reason for the provider, reviewer, audited', async () => {
    const { svc, banks, audit } = make();
    await expect(svc.rejectBank(ADMIN, 'acc-1', { reason: 'IBAN does not match the holder' })).resolves.toEqual({ ok: true, account_id: 'acc-1', rejected: 1 });
    const [filter, update] = banks.updateMany.mock.calls[0];
    expect(filter).toEqual({ account_id: 'acc-1', review_status: { $in: ['pending', 'under_review'] } });
    expect(update.$set).toMatchObject({ review_status: 'rejected', reviewer_id: 'admin-1', reviewer_note: 'IBAN does not match the holder' });
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.provider_bank_rejected', after: { rejected: 1, reason: 'IBAN does not match the holder' } }));
  });

  it('needs a reason, an admin, and an account whose bank is still waiting (an approved one is not rejected here)', async () => {
    const { svc } = make();
    await expect(svc.rejectBank(ADMIN, 'acc-1', { reason: '  ' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.rejectBank({ id: 'u', role: 'doctor' }, 'acc-1', { reason: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
    const none = make({ modified: 0 });
    await expect(none.svc.rejectBank(ADMIN, 'acc-1', { reason: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('licence expiry list: expired and expiring within the window, soonest first, with days left; default 60 days, type filter', async () => {
    const day = 86400000;
    const { svc, find } = make({ profiles: [
      { id: 'p1', type: 'lab', license_expiry_date: new Date(Date.now() - 2 * day) },
      { id: 'p2', type: 'lab', license_expiry_date: new Date(Date.now() + 10 * day) },
    ] });
    const rows = await svc.licenseExpiryList(ADMIN, { type: 'lab' });
    const [filter] = (find.mock.calls as unknown[][])[0] as [Record<string, any>];
    expect(filter.license_expiry_date.$ne).toBeNull();
    expect(Math.round((filter.license_expiry_date.$lte.getTime() - Date.now()) / day)).toBe(60);
    expect(filter.type).toEqual({ $eq: 'lab' });
    expect(rows.map((r: any) => [r.id, r.expired])).toEqual([['p1', true], ['p2', false]]);
    // A2: the expiry day itself counts (valid through its end in Riyadh time), so a date ~10 days ahead has up to 11 days left.
    expect(rows[1].days_left).toBeGreaterThanOrEqual(10);
    expect(rows[1].days_left).toBeLessThanOrEqual(11);
    await expect(svc.licenseExpiryList({ id: 'u', role: 'lab' }, {})).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('licence expiry list follows A2: a licence whose expiry day is TODAY (Riyadh) is not expired yet (1 day left); yesterday\'s is', async () => {
    const { marketParts } = require('../../../common/market-time');
    const ymd = (offset: number) => new Date(Date.parse(`${marketParts(new Date()).date}T00:00:00Z`) + offset * 86400000);
    const { svc } = make({ profiles: [
      { id: 'yesterday', type: 'lab', license_expiry_date: ymd(-1) },
      { id: 'today', type: 'lab', license_expiry_date: ymd(0) },
    ] });
    const rows = await svc.licenseExpiryList(ADMIN, {});
    expect(rows.map((r: any) => [r.id, r.expired])).toEqual([['yesterday', true], ['today', false]]);
    expect(rows.find((r: any) => r.id === 'today').days_left).toBe(1);
    expect(rows.find((r: any) => r.id === 'yesterday').days_left).toBeLessThanOrEqual(0);
  });
});
