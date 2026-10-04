// R11 §5 lead 12: POST /calls/initiate issued 2 h LiveKit tokens for PENDING
// or future appointments, and pushed a new incoming call every time.
import { LiveKitService } from './livekit.service';

describe('calls/initiate only around a live appointment (R11 §5)', () => {
  const env = { ...process.env };
  beforeAll(() => { process.env.LIVEKIT_API_KEY = 'k'; process.env.LIVEKIT_API_SECRET = 'secret-for-unit-tests-only-0123456789'; });
  afterAll(() => { process.env = env; });
  const minutes = (m: number) => new Date(Date.now() + m * 60_000);

  function service(appt: Record<string, unknown>, openSession: Record<string, unknown> | null = null) {
    const sessions = { insertOne: jest.fn().mockResolvedValue({}), findOne: jest.fn().mockResolvedValue(openSession) };
    const conn = { collection: jest.fn(() => sessions) };
    const appointments = { findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(appt) })) };
    const events = { emit: jest.fn() };
    return { svc: new LiveKitService(appointments as never, conn as never, events as never), sessions, events };
  }
  const base = { id: 'appt-1', patient_id: 'pat-1', doctor_user_id: 'doc-1', duration_minutes: 30 };

  it('refuses a PENDING appointment', async () => {
    const { svc } = service({ ...base, status: 'PENDING', slot_start: minutes(5) });
    await expect(svc.initiateCall('pat-1', 'P', '', 'video', 'appt-1')).rejects.toThrow('appointment_not_active');
  });

  it('refuses a call days before the slot', async () => {
    const { svc } = service({ ...base, status: 'CONFIRMED', slot_start: minutes(3 * 24 * 60) });
    await expect(svc.initiateCall('pat-1', 'P', '', 'video', 'appt-1')).rejects.toThrow('call_outside_appointment_window');
  });

  it('starts a call 10 minutes before a confirmed slot and pushes once', async () => {
    const { svc, events } = service({ ...base, status: 'CONFIRMED', slot_start: minutes(10) });
    const r = await svc.initiateCall('pat-1', 'P', '', 'video', 'appt-1');
    expect(r.session_id).toMatch(/^call_/);
    expect(events.emit).toHaveBeenCalledTimes(1);
  });

  it('a repeated initiate reuses the open session without another push', async () => {
    const open = { id: 'call_open', room_name: 'room-open', call_type: 'video', status: 'INITIATED', createdAt: minutes(-1) };
    const { svc, events, sessions } = service({ ...base, status: 'CONFIRMED', slot_start: minutes(10) }, open);
    const r = await svc.initiateCall('pat-1', 'P', '', 'video', 'appt-1');
    expect(r.session_id).toBe('call_open');
    expect(sessions.insertOne).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('the booking call-token path refuses PENDING and NO_SHOW appointments too (independent check)', async () => {
    for (const status of ['PENDING', 'NO_SHOW']) {
      const svc: any = Object.create(LiveKitService.prototype);
      svc.appointments = { findOne: () => ({ lean: async () => ({ id: 'a1', patient_id: 'p1', doctor_user_id: 'd1', service_type: 'video', status, slot_start: new Date() }) }) };
      svc.createBookingToken = jest.fn(async () => 'tok');
      await expect(svc.issueBookingCallToken('a1', { id: 'p1' })).rejects.toThrow('call_token_not_available_for_booking_state');
      expect(svc.createBookingToken).not.toHaveBeenCalled();
    }
  });

  // Second review: joinCall refused only listed dead states, any closed
  // session could be re-joined, and there was no time window.
  describe('joinCall', () => {
    function joinSvc(session: Record<string, unknown>, appt: Record<string, unknown>) {
      const sessions = { findOne: jest.fn().mockResolvedValue({ id: 'call_1', room_name: 'room-1', patient_id: 'pat-1', provider_id: 'doc-1', appointment_id: 'appt-1', status: 'INITIATED', ...session }), updateOne: jest.fn().mockResolvedValue({}) };
      const conn = { collection: jest.fn(() => sessions) };
      const appointments = { findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(appt), catch: undefined })) };
      return new LiveKitService(appointments as never, conn as never, { emit: jest.fn() } as never);
    }
    const live = { ...base, status: 'CONFIRMED', slot_start: minutes(-5), slot_end: minutes(25) };

    it('joins a live appointment inside its slot', async () => {
      await expect(joinSvc({}, live).joinCall('call_1', 'pat-1', 'P')).resolves.toEqual(expect.objectContaining({ room_name: 'room-1' }));
    });

    it('refuses a PENDING appointment (not only the listed dead states)', async () => {
      await expect(joinSvc({}, { ...live, status: 'PENDING' }).joinCall('call_1', 'pat-1', 'P')).rejects.toThrow('appointment_not_active');
    });

    it('refuses an ended, failed or rejected session', async () => {
      for (const status of ['ENDED', 'FAILED', 'REJECTED']) {
        await expect(joinSvc({ status }, live).joinCall('call_1', 'pat-1', 'P')).rejects.toThrow('call_session_closed');
      }
    });

    it('an ACTIVE call can be rejoined after the window (app reopened mid-call), a new join cannot', async () => {
      const late = { ...live, slot_start: minutes(-180), slot_end: minutes(-150) };
      await expect(joinSvc({ status: 'ACTIVE' }, late).joinCall('call_1', 'pat-1', 'P')).resolves.toEqual(expect.objectContaining({ room_name: 'room-1' }));
      await expect(joinSvc({ status: 'ACTIVE' }, { ...late, status: 'CANCELLED' }).joinCall('call_1', 'pat-1', 'P')).rejects.toThrow('appointment_not_active');
    });

    it('refuses outside the appointment window', async () => {
      await expect(joinSvc({}, { ...live, slot_start: minutes(-180), slot_end: minutes(-150) }).joinCall('call_1', 'pat-1', 'P')).rejects.toThrow('call_outside_appointment_window');
      await expect(joinSvc({}, { ...live, slot_start: minutes(120), slot_end: minutes(150) }).joinCall('call_1', 'pat-1', 'P')).rejects.toThrow('call_outside_appointment_window');
    });
  });
});
