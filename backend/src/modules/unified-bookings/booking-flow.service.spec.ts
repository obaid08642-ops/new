import { NotFoundException } from '@nestjs/common';
import { BookingFlowService } from './booking-flow.module';

function chain(value: any) { return { lean: jest.fn().mockResolvedValue(value) }; }

describe('BookingFlowService provider read ownership', () => {
  function make(value: any) {
    const service: any = Object.create(BookingFlowService.prototype);
    service.kindAliases = { radiology: 'radiology' };
    service.rads = { findOne: jest.fn().mockReturnValue(chain(value)) };
    return service;
  }

  it('allows an assigned radiology provider to read status entity', async () => {
    const service = make({ id: 'rad-1', provider_account_id: 'rad-provider-1', state: 'CONFIRMED' });
    const entity = await service.fetchEntity('radiology', 'rad-1', { id: 'rad-provider-1', role: 'provider', provider_type: 'radiology' });
    expect(entity.id).toBe('rad-1');
    expect(service.rads.findOne).toHaveBeenCalledWith(
      { id: 'rad-1', $or: [{ provider_account_id: 'rad-provider-1' }, { provider_id: 'rad-provider-1' }, { doctor_user_id: 'rad-provider-1' }, { pharmacy_id: 'rad-provider-1' }] },
      { _id: 0, __v: 0 },
    );
  });

  it('fails closed for an unassigned provider', async () => {
    const service = make(null);
    await expect(service.fetchEntity('radiology', 'rad-1', { id: 'rad-provider-2', role: 'provider', provider_type: 'radiology' }))
      .resolves.toBeNull();
  });
});
