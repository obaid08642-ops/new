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
});
