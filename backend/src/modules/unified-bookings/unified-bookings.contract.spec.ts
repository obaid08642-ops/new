import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { REQUIRE_IDEMPOTENCY } from '../../common/idempotency.interceptor';
import { UnifiedBookingsController, UnifiedBookingsService } from './unified-bookings.module';

const SLOT = '2030-01-02T10:00:00.000Z';
const USER = { id: 'patient-1', role: 'patient' };

function serviceFor(options: {
  slots?: Array<{ start: string; available: boolean }>;
  booking?: any;
  ownedBooking?: any;
} = {}) {
  const service: any = Object.create(UnifiedBookingsService.prototype);
  service.providers = { findOne: jest.fn().mockResolvedValue({ id: 'doctor-1' }) };
  service.slots = {
    slotsForDate: jest.fn().mockResolvedValue({
      slots: options.slots ?? [{ start: SLOT, available: true }],
    }),
  };
  service.apptSvc = {
    create: jest.fn().mockResolvedValue(options.booking ?? { id: 'booking-1', status: 'CONFIRMED' }),
    cancel: jest.fn().mockResolvedValue({ id: 'booking-1', status: 'CANCELLED' }),
    reschedule: jest.fn().mockResolvedValue({ id: 'booking-2', status: 'CONFIRMED' }),
  };
  service.getOne = jest.fn().mockResolvedValue(options.ownedBooking ?? {
    id: 'booking-1', doctor_id: 'doctor-1', service_type: 'clinic', patient_id: USER.id,
  });
  return service;
}

describe('UnifiedBookingsService patient-web contract bridge', () => {
  it('creates a cash consultation only after resolving the requested server slot', async () => {
    const service = serviceFor();

    await expect(service.createConsultationContract(USER, {
      doctor_id: 'doctor-1', slot_id: SLOT, type: 'clinic', notes: 'follow-up', payment_method_id: 'cash',
    })).resolves.toEqual({ booking_id: 'booking-1', status: 'confirmed' });

    expect(service.slots.slotsForDate).toHaveBeenCalledWith(
      { id: 'doctor-1' },
      '2030-01-02',
      'clinic',
    );
    expect(service.apptSvc.create).toHaveBeenCalledWith(USER, {
      doctor_id: 'doctor-1',
      service_type: 'clinic',
      slot_start: SLOT,
      patient_notes: 'follow-up',
      payment_method: 'cash',
    });
  });

  it('rejects non-cash payment identifiers without invoking appointment creation', async () => {
    const service = serviceFor();

    await expect(service.createConsultationContract(USER, {
      doctor_id: 'doctor-1', slot_id: SLOT, type: 'video', payment_method_id: 'card-method-1',
    })).rejects.toThrow(new BadRequestException('payment_method_not_supported'));

    expect(service.apptSvc.create).not.toHaveBeenCalled();
    expect(service.slots.slotsForDate).not.toHaveBeenCalled();
  });

  it('rejects an arbitrary slot identifier not present in the server availability response', async () => {
    const service = serviceFor({ slots: [{ start: '2030-01-02T10:30:00.000Z', available: true }] });

    await expect(service.createConsultationContract(USER, {
      doctor_id: 'doctor-1', slot_id: SLOT, type: 'clinic',
    })).rejects.toThrow(new BadRequestException('slot_not_available'));

    expect(service.apptSvc.create).not.toHaveBeenCalled();
  });

  it('maps a listed unavailable server slot to a conflict and does not create a booking', async () => {
    const service = serviceFor({ slots: [{ start: SLOT, available: false }] });

    await expect(service.createConsultationContract(USER, {
      doctor_id: 'doctor-1', slot_id: SLOT, type: 'clinic',
    })).rejects.toThrow(ConflictException);

    expect(service.apptSvc.create).not.toHaveBeenCalled();
  });

  it('uses the owner-scoped lookup before cancellation, preserving a foreign-id 404', async () => {
    const service = serviceFor();
    service.getOne.mockRejectedValueOnce(new NotFoundException('booking_not_found'));

    await expect(service.cancelConsultationContract(USER, 'foreign-booking', 'no longer needed'))
      .rejects.toThrow(NotFoundException);

    expect(service.apptSvc.cancel).not.toHaveBeenCalled();
  });

  it('marks root create, cancel, and reschedule mutations as idempotency-required', () => {
    expect(Reflect.getMetadata(REQUIRE_IDEMPOTENCY, UnifiedBookingsController.prototype.create)).toBe(true);
    expect(Reflect.getMetadata(REQUIRE_IDEMPOTENCY, UnifiedBookingsController.prototype.cancelRoot)).toBe(true);
    expect(Reflect.getMetadata(REQUIRE_IDEMPOTENCY, UnifiedBookingsController.prototype.rescheduleRoot)).toBe(true);
  });
});
