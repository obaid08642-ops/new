import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LiveKitService } from './livekit.service';

describe('LiveKit follow-up ownership fixes', () => {
  const events = { emit: jest.fn() };
  const conn = { collection: jest.fn(() => ({ findOne: jest.fn() })) } as any;

  beforeEach(() => jest.clearAllMocks());

  it('rejects pingPatient when provider and patient have no active appointment', async () => {
    const findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const appointments = { findOne } as any;
    const service = new LiveKitService(appointments, conn, events as any);

    await expect(service.pingPatient('provider-1', 'patient-1')).rejects.toThrow(ForbiddenException);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('uses an atomic UUID business-id update for no-show and repairs only the legacy video-call service type', async () => {
    const lean = jest.fn().mockResolvedValue({ id: 'appt-uuid-1', provider_id: 'provider-1', status: 'CONFIRMED', service_type: 'consultation' });
    const findOne = jest.fn().mockReturnValue({ lean });
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const service = new LiveKitService({ findOne, updateOne } as any, conn, events as any);

    await expect(service.markNoShow('provider-1', 'appt-uuid-1')).resolves.toEqual({ success: true, message: 'Marked as no-show' });
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ $and: expect.any(Array) }));
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ $and: expect.any(Array) }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'NO_SHOW', service_type: 'video' }),
        $push: expect.objectContaining({ state_history: expect.objectContaining({ state: 'NO_SHOW', by_user_id: 'provider-1' }) }),
      }),
      { runValidators: true },
    );
  });

    it('rejects markNoShow when the UUID is not owned by the provider', async () => {
    const findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const service = new LiveKitService({ findOne } as any, conn, events as any);
    await expect(service.markNoShow('provider-1', 'unknown-appointment')).rejects.toThrow(NotFoundException);
  });

  it('does not transition completed appointments to no-show', async () => {
    const findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'appt-complete', doctor_user_id: 'provider-1', status: 'COMPLETED', service_type: 'video' }) });
    const updateOne = jest.fn();
    const service = new LiveKitService({ findOne, updateOne } as any, conn, events as any);

    await expect(service.markNoShow('provider-1', 'appt-complete')).rejects.toThrow(BadRequestException);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('creates a booking-room token with a ten-minute expiry', async () => {
    const originalKey = process.env.LIVEKIT_API_KEY;
    const originalSecret = process.env.LIVEKIT_API_SECRET;
    process.env.LIVEKIT_API_KEY = 'test-key';
    process.env.LIVEKIT_API_SECRET = 'test-secret';
    try {
      const service = new LiveKitService({ findOne: jest.fn() } as any, conn, events as any);
      const token = await service.createBookingToken('booking-appt-1', 'patient-1');
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      expect(payload.exp - payload.nbf).toBe(600);
      expect(payload.video.room).toBe('booking-appt-1');
    } finally {
      if (originalKey === undefined) delete process.env.LIVEKIT_API_KEY; else process.env.LIVEKIT_API_KEY = originalKey;
      if (originalSecret === undefined) delete process.env.LIVEKIT_API_SECRET; else process.env.LIVEKIT_API_SECRET = originalSecret;
    }
  });

  it('issues a video booking token to the patient only inside the ±15-minute appointment window', async () => {
    const findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        id: 'appt-1', patient_id: 'patient-1', doctor_user_id: 'doctor-1', service_type: 'video',
        status: 'CONFIRMED', slot_start: new Date().toISOString(),
      }),
    });
    const service: any = new LiveKitService({ findOne } as any, conn, events as any);
    service.createBookingToken = jest.fn().mockResolvedValue('token-1');

    await expect(service.issueBookingCallToken('appt-1', { id: 'patient-1', name: 'Patient' }))
      .resolves.toEqual({ provider: 'livekit', token: 'token-1', room: 'booking-appt-1' });
    expect(service.createBookingToken).toHaveBeenCalledWith('booking-appt-1', 'Patient');
  });

  it('issues a video booking token to the assigned doctor inside the appointment window', async () => {
    const findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        id: 'appt-1', patient_id: 'patient-1', doctor_user_id: 'doctor-1', service_type: 'video',
        status: 'CONFIRMED', slot_start: new Date().toISOString(),
      }),
    });
    const service: any = new LiveKitService({ findOne } as any, conn, events as any);
    service.createBookingToken = jest.fn().mockResolvedValue('doctor-token');

    await expect(service.issueBookingCallToken('appt-1', { id: 'doctor-1', full_name: 'Doctor' }))
      .resolves.toEqual({ provider: 'livekit', token: 'doctor-token', room: 'booking-appt-1' });
    expect(service.createBookingToken).toHaveBeenCalledWith('booking-appt-1', 'Doctor');
  });

  it('returns 404 to a foreign identity without issuing a booking token', async () => {
    const findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        id: 'appt-1', patient_id: 'patient-1', doctor_user_id: 'doctor-1', service_type: 'video',
        status: 'CONFIRMED', slot_start: new Date().toISOString(),
      }),
    });
    const service: any = new LiveKitService({ findOne } as any, conn, events as any);
    service.createBookingToken = jest.fn();

    await expect(service.issueBookingCallToken('appt-1', { id: 'stranger-1' })).rejects.toThrow(NotFoundException);
    expect(service.createBookingToken).not.toHaveBeenCalled();
  });

  it('rejects non-video bookings without issuing a token', async () => {
    const findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        id: 'appt-1', patient_id: 'patient-1', doctor_user_id: 'doctor-1', service_type: 'clinic',
        status: 'CONFIRMED', slot_start: new Date().toISOString(),
      }),
    });
    const service: any = new LiveKitService({ findOne } as any, conn, events as any);
    service.createBookingToken = jest.fn();

    await expect(service.issueBookingCallToken('appt-1', { id: 'patient-1' })).rejects.toThrow(BadRequestException);
    expect(service.createBookingToken).not.toHaveBeenCalled();
  });

  it('rejects call-token issuance outside the appointment window', async () => {
    const findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        id: 'appt-1', patient_id: 'patient-1', doctor_user_id: 'doctor-1', service_type: 'video',
        status: 'CONFIRMED', slot_start: new Date(Date.now() + 16 * 60_000).toISOString(),
      }),
    });
    const service: any = new LiveKitService({ findOne } as any, conn, events as any);
    service.createBookingToken = jest.fn();

    await expect(service.issueBookingCallToken('appt-1', { id: 'patient-1' })).rejects.toThrow(BadRequestException);
    expect(service.createBookingToken).not.toHaveBeenCalled();
  });
});
