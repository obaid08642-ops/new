import { RadiologyController } from './radiology.controller';

describe('RadiologyController booking contract', () => {
  const bookings = { create: jest.fn() };
  const services = { findOne: jest.fn() };
  const users = { findOne: jest.fn() };
  const controller = new RadiologyController(bookings as any, services as any, users as any);
  const patient = { id: 'patient-1', _id: 'mongo-patient' };
  const future = new Date(Date.now() + 60 * 60_000).toISOString();

  beforeEach(() => {
    jest.clearAllMocks();
    users.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(patient) });
    services.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'rad-1', name_ar: 'أشعة موثقة', name_en: 'Verified scan' }) });
    bookings.create.mockResolvedValue({ id: 'booking-1', status: 'PENDING_ACCEPTANCE' });
  });

  it('rejects raw scan fields and invalid schedules before persisting a booking', async () => {
    await expect(controller.book(patient, { scan_type_code: 'raw', scan_name_ar: 'raw', scan_name_en: 'raw', scheduled_at: future })).rejects.toThrow('service_id_required');
    await expect(controller.book(patient, { service_id: 'rad-1', scheduled_at: 'invalid-date' })).rejects.toThrow('scheduled_at_required');
    expect(bookings.create).not.toHaveBeenCalled();
  });

  it('resolves service names on the server and creates an owned pending booking', async () => {
    const result = await controller.book(patient, { service_id: 'rad-1', scheduled_at: future, delivery_mode: 'IN_CENTER' });
    expect(result).toEqual({ id: 'booking-1', status: 'PENDING_ACCEPTANCE', message: 'تم إرسال طلب الأشعة بنجاح' });
    expect(bookings.create).toHaveBeenCalledWith(expect.objectContaining({ patient_id: 'mongo-patient', scan_type_code: 'rad-1', scan_name_ar: 'أشعة موثقة', scan_name_en: 'Verified scan', delivery_mode: 'IN_CENTER', status: 'PENDING_ACCEPTANCE' }));
  });
});
