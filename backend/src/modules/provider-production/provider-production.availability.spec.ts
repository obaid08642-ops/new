import { NotFoundException } from '@nestjs/common';
import { ProviderProductionService } from './provider-production.module';

describe('ProviderProductionService availability', () => {
  const account = { id: 'provider-1', availability: { instant_available: false, weekly_schedule: [{ day: 'sun' }] } };
  const collection = {
    findOne: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
  };
  const connection = { collection: jest.fn().mockReturnValue(collection) };
  const service = new ProviderProductionService(connection as any);
  const user = { id: 'provider-1', role: 'pharmacy' };

  beforeEach(() => jest.clearAllMocks());

  it('merges a partial update into the existing account availability without upserting an account', async () => {
    collection.findOne
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce({ ...account, availability: { ...account.availability, is_accepting_requests: true } });

    const result = await service.patchAvailability(user, { is_accepting_requests: true });

    expect(collection.updateOne).toHaveBeenCalledWith(
      { id: 'provider-1' },
      expect.objectContaining({ $set: expect.objectContaining({
        availability: { instant_available: false, weekly_schedule: [{ day: 'sun' }], is_accepting_requests: true },
      }) }),
    );
    expect(result).toEqual({ ok: true, availability: { instant_available: false, weekly_schedule: [{ day: 'sun' }], is_accepting_requests: true } });
  });

  it('D-30: saving insurance contracts keeps accepted_insurance a list of company ids and stores the class contracts beside it', async () => {
    const contracts = [
      { company_id: 'bupa', classes: ['A', 'VIP'], active: true },
      { company_id: 'tawuniya', classes: ['B'], active: false },
    ];
    // the read-back after the write returns what was written, as the database does
    let written: any = null;
    collection.updateOne.mockImplementationOnce(async (_q: any, u: any) => { written = u.$set?.availability; return { acknowledged: true, modifiedCount: 1 }; });
    collection.findOne.mockResolvedValueOnce(account).mockImplementationOnce(async () => ({ ...account, availability: written }));
    await service.patchAvailability(user, { accepted_insurance: contracts as any });
    expect(collection.updateOne).toHaveBeenCalledWith(
      { $or: [{ user_id: 'provider-1' }, { account_id: 'provider-1' }] },
      { $set: expect.objectContaining({ accepted_insurance: ['bupa'], insurance_class_contracts: [expect.objectContaining({ company_id: 'bupa', classes: ['A', 'VIP'], active: true })] }) },
    );
  });

  it('D-30: a contract without a class is refused', async () => {
    await expect(service.patchAvailability(user, { accepted_insurance: [{ company_id: 'bupa', active: true }] as any })).rejects.toThrow('accepted_insurance_classes_required');
  });

  it('does not fabricate availability for a missing provider account', async () => {
    collection.findOne.mockResolvedValue(null);
    await expect(service.getAvailability(user)).rejects.toBeInstanceOf(NotFoundException);
  });
});
