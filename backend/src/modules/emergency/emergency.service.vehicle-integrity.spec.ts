import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EmergencyService } from './emergency.service';

describe('EmergencyService verified ambulance binding', () => {
  const make = (vehicle: any) => {
    const model: any = { updateOne: jest.fn().mockResolvedValue({ id: 'emergency-1' }) };
    const vehicles: any = {
      findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(vehicle) })),
      find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(vehicle ? [vehicle] : []) })),
    };
    const service = new EmergencyService(model, vehicles, { db: { collection: jest.fn() } } as any, { emit: jest.fn() } as any);
    return { service, model, vehicles };
  };

  it('rejects an SOS without usable coordinates before creating a dispatch record', async () => {
    const { service, model } = make(null);

    await expect(service.trigger({ id: 'patient-1' }, { location: null })).rejects.toBeInstanceOf(BadRequestException);

    expect(model.create).toBeUndefined();
  });

  it('fails closed when a provider claims without naming an approved vehicle', async () => {
    const { service, model } = make(null);
    await expect(service.claim('emergency-1', 'provider-1', undefined)).rejects.toBeInstanceOf(BadRequestException);
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('rejects a vehicle that is absent, unapproved or outside the authenticated provider fleet', async () => {
    const { service, model, vehicles } = make(null);
    await expect(service.claim('emergency-1', 'provider-1', 'vehicle-foreign')).rejects.toBeInstanceOf(ForbiddenException);
    expect(vehicles.findOne).toHaveBeenCalledWith({ id: 'vehicle-foreign', provider_account_id: 'provider-1', status: 'approved', is_available: true });
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('binds a claim to the approved vehicle and its provider instead of the caller ID as a vehicle ID', async () => {
    const { service, model } = make({ id: 'vehicle-1', plate_number: 'ABC-123' });
    await expect(service.claim('emergency-1', 'provider-1', 'vehicle-1')).resolves.toEqual(expect.objectContaining({ ok: true, vehicle_id: 'vehicle-1' }));
    expect(model.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'emergency-1' }),
      expect.objectContaining({ $set: expect.objectContaining({ assigned_ambulance_id: 'vehicle-1', assigned_provider_id: 'provider-1', unit_label: 'ABC-123' }) }),
    );
  });
});
