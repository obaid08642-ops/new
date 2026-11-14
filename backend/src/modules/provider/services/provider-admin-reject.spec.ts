import { BadRequestException } from '@nestjs/common';
import { ProviderAdminService } from './provider-admin.service';
import { ProviderAccountStatus } from '../provider.enums';

// G6: a rejection always carries the reason the applicant reads before fixing and resubmitting (REJECTED -> PENDING_ADMIN_APPROVAL is the legal way back).
describe('ProviderAdminService.reject', () => {
  const updateMany = jest.fn().mockResolvedValue(undefined);
  const findOneProfile = jest.fn().mockResolvedValue(null);
  const db = { collection: () => ({ updateMany, findOne: findOneProfile }) };
  const account = () => ({ id: 'prov-1', status: ProviderAccountStatus.UNDER_REVIEW, status_history: [] as any[], save: jest.fn().mockResolvedValue(undefined), toObject() { return { id: this.id, status: this.status }; } });
  const accounts: any = { findOne: jest.fn(), model: { db } };
  const audit: any = { create: jest.fn() };
  const events: any = { emit: jest.fn() };
  const seo: any = { processEntity: jest.fn().mockResolvedValue(undefined) };
  const service = new ProviderAdminService(accounts, {} as any, {} as any, {} as any, audit, {} as any, events, seo);
  const admin = { id: 'adm-1', role: 'admin' };

  beforeEach(() => jest.clearAllMocks());

  it('refuses a rejection with no reason or a very short one, and changes nothing', async () => {
    for (const body of [undefined, {}, { reason: '' }, { reason: '  no ' }, { reason: 42 as any }]) {
      await expect(service.reject(admin, 'prov-1', body)).rejects.toThrow(BadRequestException);
    }
    expect(accounts.findOne).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('stores the trimmed reason in the status history, on the account and on the profile, and tells the provider', async () => {
    const a = account();
    accounts.findOne.mockResolvedValue(a);
    await service.reject(admin, 'prov-1', { reason: '  Licence photo is unreadable  ' });
    expect(a.status).toBe(ProviderAccountStatus.REJECTED);
    expect((a as any).rejection_reason).toBe('Licence photo is unreadable');
    expect(a.status_history[0]).toMatchObject({ from: 'under_review', to: 'rejected', note: 'Licence photo is unreadable' });
    expect(updateMany).toHaveBeenCalledWith(expect.anything(), { $set: expect.objectContaining({ status: 'rejected', rejected_reason: 'Licence photo is unreadable' }) });
    expect(events.emit).toHaveBeenCalledWith('provider.rejected', { provider_id: 'prov-1', reason: 'Licence photo is unreadable' });
  });
});
