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

  it('does not fabricate availability for a missing provider account', async () => {
    collection.findOne.mockResolvedValue(null);
    await expect(service.getAvailability(user)).rejects.toBeInstanceOf(NotFoundException);
  });
});
