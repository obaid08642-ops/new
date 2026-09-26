import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { HomeCareCompatController } from './home-care-compat.module';

describe('HomeCareCompatController access and state contract', () => {
  function make() {
    const bookings: any = { findOne: jest.fn(), find: jest.fn(), updateOne: jest.fn() };
    const services: any = { findOne: jest.fn() };
    const profiles: any = { updateOne: jest.fn() };
    const carePlans: any = { find: jest.fn(), create: jest.fn() };
    const controller: any = new HomeCareCompatController(bookings, services, profiles, carePlans, undefined);
    return { controller, bookings, profiles };
  }

  it('rejects patient access to nursing provider queue', async () => {
    const { controller, bookings } = make();
    expect(() => controller.nursingQueue({ id: 'patient-1', role: 'patient' }, {})).toThrow(ForbiddenException);
    expect(bookings.find).not.toHaveBeenCalled();
  });

  it('rejects patient provider availability mutation', async () => {
    const { controller, profiles } = make();
    await expect(controller.setAvailability({ id: 'patient-1', role: 'patient' }, { online: true })).rejects.toBeInstanceOf(ForbiddenException);
    expect(profiles.updateOne).not.toHaveBeenCalled();
  });

  it('rejects a provider transition that skips the state machine', async () => {
    const { controller } = make();
    const booking = { id: 'visit-1', provider_id: 'nurse-1', state: 'NEW_REQUEST', state_history: [], save: jest.fn() };
    controller.bookings.findOne.mockResolvedValue(booking);
    await expect(controller.checkIn({ id: 'nurse-1', role: 'nurse', provider_type: 'nursing' }, 'visit-1', {}))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(booking.save).not.toHaveBeenCalled();
  });
});
