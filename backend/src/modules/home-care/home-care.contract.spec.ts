import { NotFoundException } from '@nestjs/common';
import { HomeCareContractController } from './home-care.controller';

function query(value: any) { return { lean: jest.fn().mockResolvedValue(value) }; }

describe('Home-care patient booking contract bridge', () => {
  const booking = {
    id: 'home-booking-1', patient_id: 'patient-1', state: 'IN_TRANSIT',
    service_name_ar: 'تمريض منزلي', scheduled_at: new Date('2030-01-01T10:00:00.000Z'),
    provider_name: 'ممرض معتمد', notes: 'private patient note', address: { address: 'private address' },
    clinical_notes: 'private clinical note', state_history: [
      { to: 'CONFIRMED', at: new Date('2030-01-01T09:00:00.000Z') },
      { to: 'IN_TRANSIT', at: new Date('2030-01-01T09:30:00.000Z') },
    ],
  };

  it('returns the bounded owner DTO and excludes sensitive booking fields', async () => {
    const bookings: any = { findOne: jest.fn().mockReturnValue(query(booking)) };
    const controller = new HomeCareContractController(bookings);

    const result = await controller.getOwnedBooking({ id: 'patient-1' }, booking.id);

    expect(bookings.findOne).toHaveBeenCalledWith({ id: booking.id, patient_id: 'patient-1' });
    expect(result).toEqual({
      id: booking.id, status: 'IN_TRANSIT', service_type: 'تمريض منزلي', scheduled_at: '2030-01-01T10:00:00.000Z',
      nurse: { display_name: 'ممرض معتمد', avatar_url: null },
      timeline: [
        { status: 'CONFIRMED', at: '2030-01-01T09:00:00.000Z' },
        { status: 'IN_TRANSIT', at: '2030-01-01T09:30:00.000Z' },
      ],
    });
    expect(result).not.toHaveProperty('notes');
    expect(result).not.toHaveProperty('address');
    expect(result).not.toHaveProperty('clinical_notes');
  });

  it('returns 404 for a non-owner without probing the booking document', async () => {
    const bookings: any = { findOne: jest.fn().mockReturnValue(query(null)) };
    const controller = new HomeCareContractController(bookings);

    await expect(controller.getOwnedBooking({ id: 'patient-foreign' }, 'home-booking-1')).rejects.toThrow(NotFoundException);
    expect(bookings.findOne).toHaveBeenCalledWith({ id: 'home-booking-1', patient_id: 'patient-foreign' });
  });
});
