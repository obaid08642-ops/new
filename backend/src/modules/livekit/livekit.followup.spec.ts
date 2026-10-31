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

  it('uses the doctor account id for markNoShow and records history', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const findOne = jest.fn().mockResolvedValue({ id: 'appt-uuid-1', status: 'CHECKED_IN', state_history: [], save });
    const service = new LiveKitService({ findOne } as any, conn, events as any);

    await expect(service.markNoShow('doctor-user-1', 'appt-uuid-1')).resolves.toEqual({ success: true, message: 'Marked as no-show', previous_status: 'CHECKED_IN' });
    expect(findOne).toHaveBeenCalledWith({ id: { $eq: 'appt-uuid-1' }, doctor_user_id: { $eq: 'doctor-user-1' } });
    expect(save).toHaveBeenCalled();
  });

  it('rejects markNoShow for terminal appointments', async () => {
    const findOne = jest.fn().mockResolvedValue({ id: 'appt-uuid-1', status: 'COMPLETED', save: jest.fn() });
    const service = new LiveKitService({ findOne } as any, conn, events as any);
    await expect(service.markNoShow('doctor-user-1', 'appt-uuid-1')).rejects.toThrow(BadRequestException);
  });

    it('rejects markNoShow when the UUID is not owned by the provider', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const service = new LiveKitService({ findOne } as any, conn, events as any);
    await expect(service.markNoShow('doctor-user-1', 'unknown-appointment')).rejects.toThrow(NotFoundException);
  });

  it('rejects initiateCall for dead appointments (unified video contract)', async () => {
    const findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        id: 'appt-1', patient_id: 'patient-1', doctor_user_id: 'doctor-1',
        service_type: 'video', status: 'CANCELLED',
      }),
    });
    const service = new LiveKitService({ findOne } as any, conn, events as any);
    await expect(service.initiateCall('patient-1', 'Patient', 'doctor-1', 'video', 'appt-1'))
      .rejects.toThrow('appointment_not_active');
  });

  it('fails joinCall when the appointment died after session creation', async () => {
    const sessions = {
      findOne: jest.fn().mockResolvedValue({ id: 'call_1', appointment_id: 'appt-1', patient_id: 'patient-1', provider_id: 'doctor-1', room_name: 'room-1', status: 'INITIATED' }),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    const appointments = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'appt-1', status: 'COMPLETED' }),
      }),
    };
    const conn2: any = { collection: jest.fn().mockImplementation((name: string) => name === 'callsessions' ? sessions : { findOne: jest.fn() }) };
    const service = new LiveKitService(appointments as any, conn2, events as any);
    await expect(service.joinCall('call_1', 'patient-1', 'Patient')).rejects.toThrow('appointment_not_active');
    expect(sessions.updateOne).toHaveBeenCalledWith(
      { id: 'call_1' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });

  it('fails the P2P fallback token when the appointment died after session creation', async () => {
    const sessions = {
      findOne: jest.fn().mockResolvedValue({ id: 'call_1', appointment_id: 'appt-1', patient_id: 'patient-1', provider_id: 'doctor-1', room_name: 'room-1', status: 'ACTIVE' }),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    const appointments = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'appt-1', status: 'CANCELLED' }) }) };
    const conn2: any = { collection: jest.fn().mockImplementation((name: string) => name === 'callsessions' ? sessions : { findOne: jest.fn() }) };
    const service = new LiveKitService(appointments as any, conn2, events as any);
    const token = jest.spyOn(service, 'createToken');
    await expect(service.fallbackToLiveKit('call_1', 'patient-1', 'ice_failed')).rejects.toThrow('appointment_not_active');
    expect(token).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('fails the P2P fallback token for the patient side without the current telehealth consent', async () => {
    const sessions = {
      findOne: jest.fn().mockResolvedValue({ id: 'call_1', appointment_id: 'appt-1', patient_id: 'patient-1', provider_id: 'doctor-1', room_name: 'room-1', status: 'ACTIVE' }),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    const appointments = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'appt-1', status: 'CONFIRMED', patient_id: 'patient-1', doctor_user_id: 'doctor-1' }) }) };
    const conn2: any = { collection: jest.fn().mockImplementation((name: string) => name === 'callsessions' ? sessions : name === 'legal_policies' ? { findOne: jest.fn().mockResolvedValue({ version: '1.0', requires_acceptance: true }) } : { findOne: jest.fn().mockResolvedValue(null) }) };
    const service = new LiveKitService(appointments as any, conn2, events as any);
    const token = jest.spyOn(service, 'createToken');
    await expect(service.fallbackToLiveKit('call_1', 'patient-1', 'ice_failed')).rejects.toThrow('telehealth_consent_required');
    expect(token).not.toHaveBeenCalled();
  });

  it('lets the guardian who booked for a family member get the call token', async () => {
    const findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        id: 'appt-1', patient_id: 'child-1', booked_by_user_id: 'guardian-1', doctor_user_id: 'doctor-1', service_type: 'video',
        status: 'CONFIRMED', slot_start: new Date().toISOString(),
      }),
    });
    const service: any = new LiveKitService({ findOne } as any, conn, events as any);
    service.createBookingToken = jest.fn().mockResolvedValue('g-token');
    service.assertPatientConsent = jest.fn().mockResolvedValue(undefined);
    await expect(service.issueBookingCallToken('appt-1', { id: 'guardian-1', name: 'Guardian' })).resolves.toMatchObject({ token: 'g-token' });
    expect(service.createBookingToken).toHaveBeenCalledWith('booking-appt-1', 'guardian-1', 'Guardian');
  });

  it('lets a patient rejoin after the first 15 minutes while the slot is still running, and refuses long after it ended', async () => {
    const mk = (startMinAgo: number, durMin: number) => jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        id: 'appt-1', patient_id: 'patient-1', doctor_user_id: 'doctor-1', service_type: 'video', status: 'CONFIRMED',
        slot_start: new Date(Date.now() - startMinAgo * 60_000).toISOString(), slot_end: new Date(Date.now() + (durMin - startMinAgo) * 60_000).toISOString(),
      }),
    });
    const running: any = new LiveKitService({ findOne: mk(25, 30) } as any, conn, events as any);
    running.createBookingToken = jest.fn().mockResolvedValue('t');
    running.assertPatientConsent = jest.fn().mockResolvedValue(undefined);
    await expect(running.issueBookingCallToken('appt-1', { id: 'patient-1' })).resolves.toMatchObject({ token: 't' });
    const over: any = new LiveKitService({ findOne: mk(60, 30) } as any, conn, events as any);
    over.createBookingToken = jest.fn();
    await expect(over.issueBookingCallToken('appt-1', { id: 'patient-1' })).rejects.toThrow(BadRequestException);
  });

  it('uses the user id as the LiveKit identity and the display name only as the name', async () => {
    process.env.LIVEKIT_API_KEY = 'k'; process.env.LIVEKIT_API_SECRET = 's'.repeat(32);
    const service = new LiveKitService({ findOne: jest.fn() } as any, conn, events as any);
    for (const jwtFor of [await service.createToken('r', 'user-1', 'Ahmed'), await service.createBookingToken('r', 'user-1', 'Ahmed')]) {
      const p = JSON.parse(Buffer.from(jwtFor.split('.')[1], 'base64url').toString('utf8'));
      expect(p.sub).toBe('user-1');
      expect(p.name).toBe('Ahmed');
    }
  });

  it('verifies a webhook with the API key and the raw body', async () => {
    process.env.LIVEKIT_API_KEY = 'devkey'; process.env.LIVEKIT_API_SECRET = 'x'.repeat(32);
    const { AccessToken } = await import('livekit-server-sdk');
    const raw = JSON.stringify({ event: 'room_finished', room: { name: 'room-1' } });
    const sha = require('crypto').createHash('sha256').update(raw).digest('base64');
    const at = new AccessToken('devkey', 'x'.repeat(32));
    (at as any).sha256 = sha;
    const auth = await at.toJwt();
    const updateMany = jest.fn().mockResolvedValue({});
    const conn2: any = { collection: jest.fn().mockReturnValue({ updateMany }) };
    const service = new LiveKitService({ findOne: jest.fn() } as any, conn2, events as any);
    await expect(service.handleWebhook(JSON.parse(raw), auth, raw)).resolves.toMatchObject({ verified: true, event: 'room_finished' });
    expect(updateMany).toHaveBeenCalled();
    await expect(service.handleWebhook(JSON.parse(raw), auth, raw + ' ')).resolves.toMatchObject({ received: false });
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
      .resolves.toEqual({ provider: 'livekit', token: 'token-1', room: 'booking-appt-1', ice_servers: [], audio_only: false, audio_only_reason: null });
    expect(service.createBookingToken).toHaveBeenCalledWith('booking-appt-1', 'patient-1', 'Patient');
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
      .resolves.toEqual({ provider: 'livekit', token: 'doctor-token', room: 'booking-appt-1', ice_servers: [], audio_only: false, audio_only_reason: null });
    expect(service.createBookingToken).toHaveBeenCalledWith('booking-appt-1', 'doctor-1', 'Doctor');
  });

  it('advises sound only in the booking token when the platform is under call pressure (the web room reads it)', async () => {
    const findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        id: 'appt-1', patient_id: 'patient-1', doctor_user_id: 'doctor-1', service_type: 'video',
        status: 'CONFIRMED', slot_start: new Date().toISOString(),
      }),
    });
    const service: any = new LiveKitService({ findOne } as any, conn, events as any);
    service.createBookingToken = jest.fn().mockResolvedValue('token-p');
    service.activeCallCount = jest.fn().mockResolvedValue(10_000);
    await expect(service.issueBookingCallToken('appt-1', { id: 'patient-1', name: 'Patient' }))
      .resolves.toMatchObject({ token: 'token-p', audio_only: true, audio_only_reason: 'server_pressure' });
    service.activeCallCount = jest.fn().mockRejectedValue(new Error('db down'));
    await expect(service.issueBookingCallToken('appt-1', { id: 'patient-1', name: 'Patient' }))
      .resolves.toMatchObject({ token: 'token-p', ice_servers: [], audio_only: false, audio_only_reason: null });
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
