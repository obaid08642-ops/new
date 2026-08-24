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


describe('HomeCareCompatController patient booking contract', () => {
  const bookings: any = { create: jest.fn() };
  const services: any = { findOne: jest.fn() };
  const profiles: any = { findOne: jest.fn() };
  const controller: any = new HomeCareCompatController(bookings as any, services as any, profiles as any, { find: jest.fn(), create: jest.fn() } as any, undefined);
  const patient = { id: 'patient-1', role: 'patient' };
  const future = new Date(Date.now() + 60 * 60_000).toISOString();

  beforeEach(() => {
    jest.clearAllMocks();
    services.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'service-1', name_ar: 'تمريض منزلي', name_en: 'Home nursing', price: 100, duration: 'hour', active: true, cash_availability: true, insurance_availability: true }) });
    profiles.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'nurse-1', full_name: 'ممرض موثوق', provider_type: 'nursing', active: true, approval_status: 'approved' }) });
    bookings.create.mockResolvedValue({ id: 'booking-1', toObject: () => ({ id: 'booking-1' }) });
  });

  it('persists the selected nursing provider and session count in an assigned booking', async () => {
    const result = await controller.createBooking(patient, { provider_id: 'nurse-1', service_id: 'service-1', scheduled_at: future, address: 'عنوان موثق', sessions_count: 3, payment_method: 'card' });
    expect(result).toEqual({ id: 'booking-1' });
    expect(bookings.create).toHaveBeenCalledWith(expect.objectContaining({ provider_id: 'nurse-1', provider_name: 'ممرض موثوق', sessions_count: 3, total: 300, total_price: 300, state: 'PROVIDER_ASSIGNED', address: { address: 'عنوان موثق' } }));
  });

  it('rejects a missing address or invalid session count before creation', async () => {
    await expect(controller.createBooking(patient, { service_id: 'service-1', scheduled_at: future, sessions_count: 0 })).rejects.toThrow('invalid_sessions_count');
    await expect(controller.createBooking(patient, { service_id: 'service-1', scheduled_at: future })).rejects.toThrow('address_required');
    expect(bookings.create).not.toHaveBeenCalled();
  });
});
