import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { RadiologyOpsService } from './radiology.service';

// POST /radiology/catalog/delta-request answered "submitted for admin approval" after emitting an event only the SEO
// indexer listens to: no row, nothing for the admin, the centre's new scan and schedule lost.
describe('RadiologyOpsService.catalogDeltaRequest reaches an admin', () => {
  const user = { id: 'rad-1', role: 'radiology' };
  let createRequest: jest.Mock;
  let insertOne: jest.Mock;
  let service: RadiologyOpsService;

  beforeEach(() => {
    createRequest = jest.fn(async () => ({ id: 'req-1', status: 'pending' }));
    insertOne = jest.fn(async () => ({ acknowledged: true }));
    const conn = { collection: jest.fn(() => ({ insertOne })) };
    service = new (RadiologyOpsService as any)({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { emit: jest.fn() } as any,
      undefined, undefined, { createRequest } as any, conn as any);
  });

  it('files a new scan as an approval request with the centre\'s price and preparation text', async () => {
    const out = await service.catalogDeltaRequest(user, {
      name_ar: 'رنين الركبة', name_en: 'Knee MRI', modality_category: 'MRI', price: 450, estimated_duration_minutes: 40,
      insurance_availability: true, requires_metal_implant_check: true, preparation_keys: ['no_metal', 'fasting_6h'],
    });
    expect(out).toEqual({ id: 'req-1', status: 'pending' });
    expect(createRequest).toHaveBeenCalledWith('rad-1', 'radiology', {
      entity_type: 'service',
      change_data: expect.objectContaining({
        type: 'radiology', name_en: 'Knee MRI', price: 450, estimated_duration_minutes: 40, requires_metal_implant_check: true,
        preparation_en: 'Remove metal objects, Fasting 6 hours',
      }),
    });
  });

  it('files a schedule update as a settings change waiting for review', async () => {
    const out: any = await service.catalogDeltaRequest(user, {
      type: 'schedule_update', working_days: [true, true, true, true, true, false, false],
      morning_shift: { from: '08:00', to: '14:00' }, evening_shift: { from: '17:00', to: '22:00' }, emergency_available: true,
    });
    expect(out.pending_review).toBe(true);
    expect(insertOne).toHaveBeenCalledWith(expect.objectContaining({
      provider_id: 'rad-1', target: 'settings', status: 'pending',
      requested_changes: { settings_key: 'radiology_schedule', value: expect.objectContaining({ emergency_available: true, morning_shift: { from: '08:00', to: '14:00' } }) },
    }));
    expect(createRequest).not.toHaveBeenCalled();
  });

  it('refuses a scan without a name or a price instead of saying it was sent', async () => {
    await expect(service.catalogDeltaRequest(user, { price: 100 })).rejects.toThrow(BadRequestException);
    await expect(service.catalogDeltaRequest(user, { name_en: 'X' })).rejects.toThrow(BadRequestException);
    expect(createRequest).not.toHaveBeenCalled();
  });

  it('never answers ok when the approval workflow is not there', async () => {
    const bare = new (RadiologyOpsService as any)({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { emit: jest.fn() } as any);
    await expect(bare.catalogDeltaRequest(user, { name_en: 'X', price: 1 })).rejects.toThrow(ServiceUnavailableException);
  });
});
