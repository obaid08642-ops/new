import { ForbiddenException } from '@nestjs/common';
import { ProviderOpsService } from '../modules/provider-ops/provider-ops.module';

describe('provider instant availability contract', () => {
  const createService = (existing: any = null) => {
    const collection = { findOne: jest.fn().mockResolvedValue(existing), updateOne: jest.fn().mockResolvedValue({}) };
    const connection = { collection: jest.fn().mockReturnValue(collection) };
    return { service: new ProviderOpsService(connection as any), collection, connection };
  };

  it('starts a previously unconfigured provider as unavailable and toggles to available only through the provider endpoint', async () => {
    const { service, collection, connection } = createService(null);
    const result = await service.toggleInstantAvailability({ id: 'provider-1', provider_type: 'pharmacy', role: 'provider' });

    expect(result).toEqual({ instant_available: true });
    expect(connection.collection).toHaveBeenCalledWith('provideravailability');
    expect(collection.updateOne).toHaveBeenCalledWith(
      { provider_id: 'provider-1' },
      expect.objectContaining({ $set: expect.objectContaining({ instant_available: true, provider_id: 'provider-1' }) }),
      { upsert: true },
    );
  });

  it('toggles an explicitly available provider offline', async () => {
    const { service, collection } = createService({ instant_available: true });
    await expect(service.toggleInstantAvailability({ id: 'provider-2', provider_type: 'doctor' })).resolves.toEqual({ instant_available: false });
    expect(collection.updateOne).toHaveBeenCalledWith(
      { provider_id: 'provider-2' },
      expect.objectContaining({ $set: expect.objectContaining({ instant_available: false }) }),
      { upsert: true },
    );
  });

  it('rejects a patient account from changing provider availability', async () => {
    const { service } = createService();
    await expect(service.toggleInstantAvailability({ id: 'patient-1', role: 'patient' })).rejects.toThrow(ForbiddenException);
  });
});
