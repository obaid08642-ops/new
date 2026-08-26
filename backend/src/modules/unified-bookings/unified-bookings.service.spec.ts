import { NotFoundException } from '@nestjs/common';
import { UnifiedBookingsService } from './unified-bookings.module';

function chain(value: any) {
  return { lean: jest.fn().mockResolvedValue(value) };
}

describe('UnifiedBookingsService access contract', () => {
  function make(radValue: any) {
    const service: any = Object.create(UnifiedBookingsService.prototype);
    service.kindMap = { radiology: 'radiology' };
    service.rads = { findOne: jest.fn().mockReturnValue(chain(radValue)) };
    return service;
  }

  it('returns the owned booking', async () => {
    const service = make({ id: 'rad-1', patient_id: 'patient-1' });
    await expect(service.getOne({ id: 'patient-1' }, 'radiology', 'rad-1')).resolves.toEqual({ id: 'rad-1', patient_id: 'patient-1' });
  });

  it('fails closed with 404 instead of returning 200/null for a foreign or missing booking', async () => {
    const service = make(null);
    await expect(service.getOne({ id: 'patient-2' }, 'radiology', 'rad-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
