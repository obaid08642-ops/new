import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { HomeCareTrackingController } from './home-care-tracking.controller';

function accountModel(doc: any) {
  return { findOne: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }) }) };
}

describe('HomeCareTrackingController security', () => {
  it('rejects attendance verification for a non-assigned provider', async () => {
    const booking: any = { id: 'visit-1', provider_id: 'nurse-other', address: { lat: 24, lng: 46 } };
    const bookingModel: any = { findOne: jest.fn().mockResolvedValue(booking) };
    const supplyModel: any = { create: jest.fn() };
    const connection: any = { model: jest.fn().mockReturnValue(accountModel({ _id: 'nurse-mongo' })) };
    const controller = new HomeCareTrackingController(supplyModel, bookingModel, connection);

    await expect(controller.verifyAttendance('visit-1', { nurseLat: 24, nurseLng: 46 }, { id: 'nurse-1', role: 'nurse' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(booking.save).toBeUndefined();
  });

  it('uses the booking location, not client-supplied patient coordinates, for geofence', async () => {
    const booking: any = {
      id: 'visit-1', provider_id: 'nurse-1', address: { lat: 24, lng: 46 }, gps_tracking: {},
      save: jest.fn().mockResolvedValue(undefined), markModified: jest.fn(),
    };
    const bookingModel: any = { findOne: jest.fn().mockResolvedValue(booking) };
    const controller = new HomeCareTrackingController({ create: jest.fn() } as any, bookingModel, { model: jest.fn() } as any);

    await expect(controller.verifyAttendance('visit-1', { nurseLat: 25, nurseLng: 47 }, { id: 'nurse-1', role: 'nurse' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(booking.save).not.toHaveBeenCalled();
  });

  it('requires real booking and user ids before creating a supplies request', async () => {
    const bookingModel: any = { findOne: jest.fn().mockResolvedValue(null) };
    const supplyModel: any = { create: jest.fn() };
    const controller = new HomeCareTrackingController(supplyModel, bookingModel, { model: jest.fn() } as any);

    await expect(controller.requestSupplies({ items: [{ item_name: 'gauze', quantity: 1 }], priority: 'NORMAL' }, { id: 'nurse-1', role: 'nurse' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(supplyModel.create).not.toHaveBeenCalled();
  });
});
